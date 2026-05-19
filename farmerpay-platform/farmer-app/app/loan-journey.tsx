/**
 * Loan Journey — sequenced loan origination wizard.
 *
 * The Phase-2 rebuild of the loan-apply flow. Replaces the legacy
 * /loan-apply 6-step wizard (products → calculator → form → docs →
 * confirm → status) with the journey the user actually described:
 *
 *   1. Choose loan         (auto-selected if 1 product)
 *   2. Your land           (AgriStack plot picker)
 *   3. Crop & season       (commodity + season chips)
 *   4. Cost & loan amount  (SoF norm × hectares + NABARD benchmark
 *                          + farmer override + above-SoF banner)
 *   5. Review & sign       (summary + consent + Apply button)
 *   ── Apply cluster (4 sequential phases on one screen) ──
 *      🔐 Aadhaar OTP    → 📤 Documents → 🌐 AgriStack verify → 📝 Submit
 *   6. Status              (LOS timeline + "pushed to bank CBS" card)
 *
 * Backend pieces this screen wires up (all already exist):
 *   GET  /dice/products
 *   POST /agristack/land-lookup
 *   GET  /pulse/commodities
 *   GET  /dice/scale-of-finance?cropId=&season=
 *   POST /auth/aadhaar/send-otp + /verify-otp (existing OTP modal)
 *   POST /dice/apply  (with the new Phase-2 cost-calc fields)
 *   GET  /dice/applications/:id  (LOS timeline polling)
 *
 * Document upload is best-effort: if a /dice/applications/:id/documents
 * route doesn't exist, the cluster phase logs a console warning and
 * marks the docs as locally captured (matching the legacy behaviour
 * — fixing the doc upload route is its own follow-up commit).
 *
 * Auth: Tier-1 to read products/commodities/SoF/land. Tier-2 (Aadhaar
 * step-up) to POST /dice/apply. Aadhaar is collected in the apply
 * cluster, not gating the wizard upfront.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { apiGet, apiDicePost, apiPost, getToken, formatRupees } from "../lib/api";
import { isAadhaarVerified } from "../lib/aadhaarAuth";
import { fetchLandRecords, AgriStackPlot } from "../lib/agristackClient";

// API base for direct fetch calls (multipart uploads bypass the
// JSON-only apiPost helper)
const API_BASE = "http://localhost:3000/api/v1";

// AsyncStorage key for the wizard draft. Persisted before we push the
// farmer to /aadhaar-verify so the cluster can resume after the OTP
// flow returns. Cleared on successful submission OR on the user
// pressing Done on the status screen.
const DRAFT_KEY = "fp_loan_journey_draft";

// ─── Types ───────────────────────────────────────────────────────

type Step = "loan" | "land" | "crop" | "cost" | "review" | "apply" | "status";

interface LoanProduct {
  id: number;
  name: string;
  providerName?: string | null;
  interestRate?: number | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  maxTenureMonths?: number | null;
}

interface Commodity {
  commodityId: string;
  commodityName: string;
  commodityCode: string;
}

// A ROOTS crop cycle the farmer has already created in /roots-crop-card.
// The wizard reads this from /roots/cycles/me so the farmer doesn't have
// to re-pick crop + season + variety in step 3 — they just confirm one
// of their existing cycles.
interface RootsCycle {
  cycleId: number;
  cycleUuid: string;
  cropId: string;        // UUID
  cropCode: string;      // RICE / WHEAT / SOYBEAN / ...
  cropName: string;
  varietyId: string | null;
  varietyName: string | null;
  popId: string | null;
  season: string;        // kharif / rabi / summer
  year: number;
  sowingDate: string | null;
  status: string;        // planning / planted / harvested / ...
  fieldName: string | null;
  fieldSizeHectares: number | null;
}

// A row from /roots/crops — used to look up the integer cropPk that the
// scale_of_finances FK needs (the cycle only carries the UUID cropId).
interface CropMaster {
  cropPk: number;
  cropId: string;
  cropCode: string;
  cropName: string;
}

interface SoFNorm {
  sofId: number;
  sofCode: string;
  district: string;
  state: string;
  season: string;
  financialYear: string;
  costPerHectar: {
    seed: number;
    fertiliser: number;
    pesticide: number;
    labour: number;
    machinery: number;
    other: number;
    total: number;
  };
  nabardBenchmark: number;
  approvedBy?: string;
}

type ClusterPhase = "aadhaar" | "docs" | "verify" | "submit" | "done" | "error";

const SEASONS: Array<{ value: "kharif" | "rabi" | "summer"; label: string; emoji: string }> = [
  { value: "kharif", label: "Kharif (monsoon)", emoji: "🌧️" },
  { value: "rabi",   label: "Rabi (winter)",    emoji: "❄️" },
  { value: "summer", label: "Summer / Zaid",    emoji: "☀️" },
];

const TENURE_OPTIONS = [6, 12, 18, 24];

// ─── Helpers ──────────────────────────────────────────────────────

const num = (v: any): number => {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const normalizeProduct = (raw: any): LoanProduct => ({
  // The /dice/products response uses flat camelCase fields:
  //   productId, productName, provider (string), minInterestRate,
  //   minAmount, maxAmount, tenureMax
  id: raw.productId ?? raw.id,
  name: raw.productName || raw.product_name || raw.name || "Loan",
  providerName:
    typeof raw.provider === "string"
      ? raw.provider
      : raw.provider?.provider_name || raw.providerName || null,
  interestRate: num(raw.minInterestRate ?? raw.interest_rate ?? raw.interestRate),
  minAmount: num(raw.minAmount ?? raw.min_loan_amount),
  maxAmount: num(raw.maxAmount ?? raw.max_loan_amount),
  maxTenureMonths: raw.tenureMax ?? raw.max_tenure_months ?? raw.maxTenureMonths,
});

// ─── Component ────────────────────────────────────────────────────

export default function LoanJourney() {
  const router = useRouter();

  // ── Wizard state ──
  const [step, setStep] = useState<Step>("loan");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — loan product
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [pickedProduct, setPickedProduct] = useState<LoanProduct | null>(null);

  // Step 2 — land
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [plots, setPlots] = useState<AgriStackPlot[]>([]);
  const [pickedPlot, setPickedPlot] = useState<AgriStackPlot | null>(null);

  // Step 3 — cycle + crop + season
  // The wizard now reads the farmer's existing crop cycles from
  // /roots/cycles/me so they don't have to re-pick crop+season+variety
  // (they already filled that out in /roots-crop-card). The picked
  // cycle drives the SoF lookup in step 4 and the apply payload's
  // intendedUse string. Falling back to the old commodity picker is
  // available via the "Pick a different crop" toggle.
  const [cycles, setCycles] = useState<RootsCycle[]>([]);
  const [cropMasters, setCropMasters] = useState<CropMaster[]>([]);
  const [pickedCycle, setPickedCycle] = useState<RootsCycle | null>(null);
  // Fallback path — when the farmer wants to apply for a crop that
  // doesn't have a cycle yet. Same shape as before.
  const [showOtherCropPicker, setShowOtherCropPicker] = useState(false);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [pickedCommodity, setPickedCommodity] = useState<Commodity | null>(null);
  const [pickedSeason, setPickedSeason] = useState<"kharif" | "rabi" | "summer">("rabi");

  // Step 4 — cost & loan amount
  const [sof, setSof] = useState<SoFNorm | null>(null);
  const [sofLoading, setSofLoading] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState<string>("");
  const [tenureMonths, setTenureMonths] = useState<number>(12);

  // Step 5 — review
  const [consent, setConsent] = useState(false);

  // Apply cluster
  const [clusterPhase, setClusterPhase] = useState<ClusterPhase>("aadhaar");
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [applicationUuid, setApplicationUuid] = useState<string | null>(null);
  // applicationStatus is what we poll from /dice/applications/:id
  // and use to drive the LOS timeline on step 6.
  const [applicationStatus, setApplicationStatus] = useState<string>("submitted");

  // Doc upload state — populated by the picker in cluster phase 2.
  // Each entry tracks the local URI + the document type so we can
  // POST it as multipart to /dice/applications/:id/documents.
  const [capturedDocs, setCapturedDocs] = useState<
    Array<{ type: string; uri: string; uploaded: boolean }>
  >([]);

  // Auto-resume flag — when this is true on focus, we re-trigger the
  // apply cluster from the saved draft. Set when we successfully push
  // the wizard to /aadhaar-verify, cleared after the resume runs.
  const resumeRequested = useRef(false);

  // ── Step 1: load products + auto-select if 1 ──
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const r = await apiGet("/dice/products");
          const list = (r?.data || r?.products || []).map(normalizeProduct);
          setProducts(list);
          if (list.length === 1) setPickedProduct(list[0]);
        } catch {
          /* tolerate — empty state shows */
        }
      })();
    }, []),
  );

  // ── Draft hydration ──
  // When the wizard comes into focus, check for a saved draft. If one
  // exists AND we're at the start (step === 'loan' with default state),
  // restore everything and re-trigger the apply cluster — this is the
  // "resume after Aadhaar OTP" path. Without this, the farmer would
  // come back from /aadhaar-verify to a blank wizard.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(DRAFT_KEY);
          if (!raw) return;
          const draft = JSON.parse(raw);
          if (!draft || !draft.pickedProduct || !draft.pickedPlot) {
            await AsyncStorage.removeItem(DRAFT_KEY);
            return;
          }
          // Drafts older than 10 minutes are treated as abandoned —
          // the farmer almost certainly came back hours later, not in
          // the middle of an Aadhaar OTP flow. Without this check,
          // every visit to /loan-journey would auto-resume the most
          // recent abandoned wizard run and skip the farmer straight
          // to the Aadhaar redirect.
          const age = Date.now() - (draft.savedAt || 0);
          if (age > DRAFT_MAX_AGE_MS) {
            await AsyncStorage.removeItem(DRAFT_KEY);
            return;
          }
          // Restore state from the draft
          setPickedProduct(draft.pickedProduct);
          setPickedPlot(draft.pickedPlot);
          // Restore BOTH crop paths — whichever was set during the
          // pre-Aadhaar wizard run will hydrate; the other is null.
          if (draft.pickedCycle) setPickedCycle(draft.pickedCycle);
          if (draft.pickedCommodity) {
            setPickedCommodity(draft.pickedCommodity);
            setShowOtherCropPicker(true);
          }
          setPickedSeason(draft.pickedSeason || "rabi");
          setSof(draft.sof);
          setOverrideAmount(draft.overrideAmount || "");
          setTenureMonths(draft.tenureMonths || 12);
          setConsent(true);
          // Jump straight to the apply cluster and resume from where
          // we left off (the cluster orchestrator below will check if
          // Aadhaar is now verified and continue from docs onward).
          setStep("apply");
          resumeRequested.current = true;
        } catch (e) {
          // If the draft is corrupt, clear it so we don't get stuck
          await AsyncStorage.removeItem(DRAFT_KEY);
        }
      })();
    }, []),
  );

  // ── Auto-resume the cluster when resumeRequested is true ──
  // This runs after the draft hydration sets step='apply'. The cluster
  // orchestrator will detect that Aadhaar is verified now and skip to
  // phase 2 (docs).
  useEffect(() => {
    if (step === "apply" && resumeRequested.current) {
      resumeRequested.current = false;
      // Defer one tick so all the setState calls from the draft load
      // have flushed before we read the wizard state.
      setTimeout(() => {
        startApplyCluster();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Step 2: load AgriStack plots when landing on land step ──
  useEffect(() => {
    if (step !== "land" || plots.length > 0) return;
    setPlotsLoading(true);
    fetchLandRecords()
      .then((res) => {
        setPlots(res.plots);
        if (res.plots.length === 1) setPickedPlot(res.plots[0]);
      })
      .catch(() => setPlots([]))
      .finally(() => setPlotsLoading(false));
  }, [step]);

  // ── Step 3: load the farmer's existing cycles + the crop master
  // table when landing on the crop step ──
  // Cycles drive the primary "your active crops" picker. Crop masters
  // are needed so we can resolve a cycle's UUID cropId to the integer
  // cropPk that scale_of_finances uses as a FK. Both fetches run once
  // and are cached for the rest of the wizard.
  useEffect(() => {
    if (step !== "crop") return;
    if (cycles.length === 0) {
      apiGet("/roots/cycles/me")
        .then((r) => {
          const list: RootsCycle[] = r?.data?.cycles || r?.data || [];
          setCycles(list);
          // Auto-pick the most recent cycle if there's exactly one OR
          // if all of them share the same crop+season (common when a
          // farmer has split one harvest across multiple plots).
          if (list.length > 0 && !pickedCycle) {
            setPickedCycle(list[0]);
          }
        })
        .catch(() => setCycles([]));
    }
    if (cropMasters.length === 0) {
      apiGet("/roots/crops")
        .then((r) => {
          const list: CropMaster[] = r?.data?.crops || r?.data || [];
          setCropMasters(list);
        })
        .catch(() => setCropMasters([]));
    }
    // Fallback commodity picker — only loaded if the farmer toggles
    // "Pick a different crop"
    if (showOtherCropPicker && commodities.length === 0) {
      apiGet("/pulse/commodities")
        .then((r) => {
          const list: Commodity[] = Array.isArray(r?.data)
            ? r.data
            : Array.isArray(r?.data?.commodities)
              ? r.data.commodities
              : [];
          setCommodities(list);
        })
        .catch(() => setCommodities([]));
    }
  }, [step, showOtherCropPicker]);

  // ── Step 4: fetch SoF when landing on cost step ──
  // Resolves the integer cropPk by matching the picked cycle's
  // cropCode against the cached crop_masters list. The picked cycle's
  // own season is used directly, so the SoF lookup matches whatever
  // the farmer chose during /roots-crop-card. Falls back to the
  // commodity picker path if the cycle isn't set (Other crop flow).
  useEffect(() => {
    if (step !== "cost") return;
    setSofLoading(true);
    setSof(null);

    // Resolve the integer cropPk + season from whichever picker the
    // farmer used (cycle-driven or commodity fallback)
    let cropPk: number | null = null;
    let season: string = "rabi";
    if (pickedCycle) {
      const match = cropMasters.find(
        (c) => c.cropCode === pickedCycle.cropCode || c.cropId === pickedCycle.cropId,
      );
      cropPk = match?.cropPk || null;
      season = pickedCycle.season || "rabi";
    } else if (pickedCommodity) {
      // Old commodity-picker fallback path
      const match = cropMasters.find(
        (c) =>
          c.cropName === pickedCommodity.commodityName ||
          c.cropCode === pickedCommodity.commodityCode?.replace("COMM-", ""),
      );
      cropPk = match?.cropPk || null;
      season = pickedSeason;
    }

    const qs = new URLSearchParams();
    if (cropPk) qs.set("cropId", String(cropPk));
    qs.set("season", season);
    apiGet(`/dice/scale-of-finance?${qs.toString()}`)
      .then((r) => {
        const norms: SoFNorm[] = r?.data || [];
        if (norms.length > 0) {
          setSof(norms[0]);
          // Default override to recommended (sof total × hectares)
          const ha = num(pickedPlot?.areaHectares || 1);
          setOverrideAmount(String(Math.round(norms[0].costPerHectar.total * ha)));
        }
      })
      .catch(() => setSof(null))
      .finally(() => setSofLoading(false));
  }, [step, pickedCycle, pickedCommodity, pickedSeason, pickedPlot, cropMasters]);

  // ── Save the wizard draft to AsyncStorage before pushing to Aadhaar ──
  // The wizard component remounts when the farmer returns from
  // /aadhaar-verify (router.push pushes a new screen, expo-router
  // unmounts everything below it). Without persisted state, the farmer
  // would land back on a blank Step 1. The draft hydration effect
  // above reads this back and auto-resumes the cluster.
  // Drafts are only valid for 10 minutes after the farmer is sent to
  // /aadhaar-verify. Anything older is treated as abandoned and the
  // wizard starts fresh. Without this expiry, an old draft from a
  // prior session would auto-resume on EVERY mount of /loan-journey
  // and the farmer would land on Aadhaar instead of Step 1.
  const DRAFT_MAX_AGE_MS = 10 * 60 * 1000;

  const persistDraft = async () => {
    try {
      const draft = {
        savedAt: Date.now(),
        pickedProduct,
        pickedPlot,
        // Persist BOTH paths so the resume hydration can restore
        // whichever one the farmer used (cycle picker or commodity
        // fallback). Nulls are fine — JSON serializes them cleanly.
        pickedCycle,
        pickedCommodity,
        pickedSeason,
        sof,
        overrideAmount,
        tenureMonths,
      };
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* tolerate — worst case the user starts the wizard over */
    }
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
    } catch {
      /* nothing to do */
    }
  };

  // ── Document picker — fires expo-image-picker for one doc type
  // and returns the local URI (or null if the farmer cancelled or
  // the picker timed out). On web the picker uses an HTML file
  // input under the hood; on RN it opens the platform image picker.
  //
  // 30-second timeout ensures the cluster never hangs forever — if
  // the farmer doesn't pick within 30s the doc is recorded as
  // pending and the cluster moves on. They can re-upload later
  // from the status screen (future).
  const captureDoc = async (
    docType: string,
  ): Promise<{ uri: string; mime: string; name: string } | null> => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") return null;
      const pickerPromise = ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
      });
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 30000),
      );
      const result = await Promise.race([pickerPromise, timeoutPromise]);
      if (!result || result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }
      const a = result.assets[0];
      return {
        uri: a.uri,
        mime: a.mimeType || "image/jpeg",
        name: a.fileName || `${docType}.jpg`,
      };
    } catch {
      return null;
    }
  };

  // ── Upload one doc as multipart/form-data to the new endpoint ──
  // We use a raw fetch (not apiPost) because apiPost is JSON-only and
  // multipart needs FormData.
  const uploadDoc = async (
    appId: number,
    docType: string,
    pick: { uri: string; mime: string; name: string },
  ): Promise<boolean> => {
    try {
      const token = await getToken();
      const fd = new FormData();
      fd.append("documentType", docType);
      // On RN, FormData accepts the {uri,name,type} shape. On web it
      // accepts a Blob. We try both — RN ignores the second branch.
      if (typeof window !== "undefined" && pick.uri.startsWith("data:")) {
        // Web data: URI — convert to blob
        const blob = await (await fetch(pick.uri)).blob();
        fd.append("file", blob, pick.name);
      } else if (typeof window !== "undefined" && pick.uri.startsWith("blob:")) {
        const blob = await (await fetch(pick.uri)).blob();
        fd.append("file", blob, pick.name);
      } else {
        // React Native file URI
        fd.append("file", { uri: pick.uri, name: pick.name, type: pick.mime } as any);
      }
      const r = await fetch(`${API_BASE}/dice/applications/${appId}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      return r.ok;
    } catch {
      return false;
    }
  };

  // ── Apply-cluster orchestration ──
  // Sequence:
  //   1. Aadhaar  — if not verified, save draft and push to /aadhaar-verify.
  //                 The draft-hydration focus effect re-fires startApplyCluster
  //                 after the farmer returns with a verified session.
  //   2. AgriStack verify — re-fetch land-lookup as freshness check
  //   3. Submit   — POST /dice/apply, capture the applicationId
  //   4. Documents — sequential expo-image-picker prompts for the
  //                  3 required docs, multipart-uploaded against the
  //                  new applicationId
  //   5. Done     — clear draft, advance to status step, status polling
  //                 effect kicks in
  const startApplyCluster = async () => {
    // The crop can come from EITHER the cycle picker (primary) OR the
    // commodity picker (fallback "Other crop" path) — at least one must
    // be set for the wizard to know what crop the loan is for.
    const haveCrop = !!pickedCycle || !!pickedCommodity;
    if (!pickedProduct || !pickedPlot || !haveCrop || !sof || !consent) {
      Alert.alert("Missing info", "Please complete all steps before applying.");
      return;
    }
    setStep("apply");
    setError(null);
    setClusterPhase("aadhaar");

    // ── Phase 1 — Aadhaar (Tier-2 step-up) ──
    const verified = await isAadhaarVerified();
    if (!verified) {
      // Save the wizard state to AsyncStorage so the draft-hydration
      // focus effect can restore it when the farmer returns. Then push
      // to the OTP screen.
      await persistDraft();
      router.push("/aadhaar-verify?returnTo=/loan-journey" as any);
      return;
    }
    await new Promise((r) => setTimeout(r, 500));

    // ── Phase 2 — AgriStack verification (run BEFORE submit so we
    //               fail fast if the land lookup is broken) ──
    setClusterPhase("verify");
    try {
      const recheck = await fetchLandRecords();
      if (recheck.plots.length === 0) {
        setError("AgriStack verification failed — please contact your SATHI agent");
        setClusterPhase("error");
        return;
      }
    } catch {
      setError("AgriStack verification failed — please contact your SATHI agent");
      setClusterPhase("error");
      return;
    }
    await new Promise((r) => setTimeout(r, 500));

    // ── Phase 3 — Submit to /dice/apply ──
    // We submit BEFORE collecting documents because the doc upload
    // route requires an applicationId. The application is created in
    // status='submitted', then the docs get attached afterward.
    setClusterPhase("submit");
    setSubmitting(true);
    let newAppId: number | null = null;
    let newAppUuid: string | null = null;
    try {
      const ha = num(pickedPlot.areaHectares);
      const sofTotalForArea = Math.round(sof.costPerHectar.total * ha);
      const requestedAmount = num(overrideAmount) || sofTotalForArea;
      // Use the cycle's crop+season+variety if it's set; otherwise
      // fall back to the commodity-picker values for the "Other crop"
      // path. Either way the intendedUse string is human-readable
      // and the payload reflects what the farmer chose.
      const cropName = pickedCycle?.cropName || pickedCommodity?.commodityName || "Crop";
      const cropSeason = pickedCycle?.season || pickedSeason;
      const variety = pickedCycle?.varietyName ? ` ${pickedCycle.varietyName}` : "";
      const payload = {
        productId: pickedProduct.id,
        loanAmount: requestedAmount,
        tenureMonths,
        intendedUse: `${cropName}${variety} (${cropSeason}) on ${pickedPlot.surveyNumber}`,
        sofId: sof.sofId,
        sofCostPerHectare: sof.costPerHectar.total,
        nabardBenchmarkPerHectare: sof.nabardBenchmark,
        calculatedRecommendedAmount: sofTotalForArea,
        amountAboveSof: Math.max(0, requestedAmount - sofTotalForArea),
        sizingMethod: "hybrid",
        landContext: {
          surveyNumber: pickedPlot.surveyNumber,
          areaHectares: pickedPlot.areaHectares,
          village: pickedPlot.village,
          district: pickedPlot.district,
          state: pickedPlot.state,
        },
      };
      const res = await apiDicePost("/dice/apply", payload);
      if (res?.success === false) {
        const detail = Array.isArray(res.errors)
          ? res.errors.map((e: any) => `${e.field}: ${e.message}`).join("\n")
          : "";
        setError(`${res.message || "Submit failed"}\n${detail}`);
        setClusterPhase("error");
        setSubmitting(false);
        return;
      }
      const data = res?.data || res;
      newAppId = data?.applicationId || null;
      newAppUuid = data?.applicationUuid || null;
      setApplicationId(newAppId);
      setApplicationUuid(newAppUuid);
    } catch (e: any) {
      setError(e?.message || "Submit failed");
      setClusterPhase("error");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    await new Promise((r) => setTimeout(r, 500));

    // ── Phase 4 — Documents — sequential picker prompts ──
    // On WEB we skip the picker entirely because expo-image-picker
    // opens an HTML file dialog that blocks the JS thread on the
    // input element (no Promise to race against). The status screen
    // will show all 3 docs as "pending" and the farmer can re-upload
    // from a follow-up screen — same backend route, just deferred
    // collection.
    //
    // On NATIVE (iOS/Android) the picker works properly and opens
    // the platform image picker. The 30-second timeout in captureDoc
    // is the safety net for hung pickers.
    setClusterPhase("docs");
    const required = [
      { type: "kyc_aadhaar",   label: "Aadhaar card" },
      { type: "land_document", label: "Land record / Patta" },
      { type: "bank_statement", label: "Bank passbook (first page)" },
    ];
    if (newAppId && Platform.OS !== "web") {
      for (const doc of required) {
        const pick = await captureDoc(doc.type);
        if (pick) {
          const ok = await uploadDoc(newAppId, doc.type, pick);
          setCapturedDocs((prev) => [
            ...prev,
            { type: doc.type, uri: pick.uri, uploaded: ok },
          ]);
        } else {
          setCapturedDocs((prev) => [
            ...prev,
            { type: doc.type, uri: "", uploaded: false },
          ]);
        }
      }
    } else {
      // Web path — record all 3 as pending, no picker fired.
      setCapturedDocs(
        required.map((d) => ({ type: d.type, uri: "", uploaded: false })),
      );
      await new Promise((r) => setTimeout(r, 800));
    }
    await new Promise((r) => setTimeout(r, 400));

    // ── Done — clear draft, advance to status ──
    setClusterPhase("done");
    await clearDraft();
    setTimeout(() => setStep("status"), 1000);
  };

  // ── Status polling — every 5 s while step==='status' ──
  // The Phase 2 outbound push enqueues the application to the Finacle
  // CBS via FinacleIntegrationEvent. A banker (or eventually a Finacle
  // worker) flips the status through submitted → under_review →
  // approved → disbursed. We poll /dice/applications/:id so the LOS
  // timeline updates without the farmer having to refresh.
  useEffect(() => {
    if (step !== "status" || !applicationId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await apiGet(`/dice/applications/${applicationId}`);
        const data = r?.data || r;
        const status = (data?.application_status || data?.status || "submitted").toLowerCase();
        if (!cancelled) setApplicationStatus(status);
      } catch {
        /* tolerate transient failures */
      }
    };
    // Fire once immediately + then every 5 s
    tick();
    const iv = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [step, applicationId]);

  // ─── Render: stepper ───────────────────────────────────────────

  const stepIndex: Record<Step, number> = {
    loan: 1, land: 2, crop: 3, cost: 4, review: 5, apply: 6, status: 6,
  };
  const currentIdx = stepIndex[step];
  const renderStepper = () => (
    <View style={styles.stepper}>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <View
          key={n}
          style={[styles.stepDot, currentIdx >= n ? styles.stepDotActive : styles.stepDotInactive]}
        >
          <Text
            style={[
              styles.stepDotText,
              currentIdx >= n ? styles.stepDotTextActive : styles.stepDotTextInactive,
            ]}
          >
            {n}
          </Text>
        </View>
      ))}
    </View>
  );

  // ─── Render: each step ─────────────────────────────────────────

  const renderLoanStep = () => (
    <View style={styles.stepCard}>
      <Text style={styles.stepTitle}>1. Choose your loan</Text>
      <Text style={styles.stepSub}>Select the loan product that fits your need.</Text>
      {products.length === 0 ? (
        <Text style={styles.emptyText}>No loan products available right now.</Text>
      ) : (
        products.map((p) => {
          const selected = pickedProduct?.id === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.productCard, selected && styles.productCardSelected]}
              onPress={() => setPickedProduct(p)}
              activeOpacity={0.85}
            >
              <Text style={styles.productTitle}>{p.name}</Text>
              <Text style={styles.productSub}>
                {p.providerName || "—"} · {p.interestRate}% p.a.
              </Text>
              <Text style={styles.productMeta}>
                {formatRupees(p.minAmount || 0)} – {formatRupees(p.maxAmount || 0)} · max{" "}
                {p.maxTenureMonths || 12} months
              </Text>
            </TouchableOpacity>
          );
        })
      )}
      {!pickedProduct && products.length > 0 && (
        <View style={styles.hintBanner}>
          <Text style={styles.hintBannerText}>⚠ Tap a product card above to continue</Text>
        </View>
      )}
      <PrimaryBtn
        label="Next: Your land →"
        disabled={!pickedProduct}
        onPress={() => setStep("land")}
      />
    </View>
  );

  const renderLandStep = () => (
    <View style={styles.stepCard}>
      <Text style={styles.stepTitle}>2. Your land</Text>
      <Text style={styles.stepSub}>
        We pulled your plots from AgriStack (mock data in demo mode). Pick the
        plot you'll cultivate with this loan.
      </Text>
      {plotsLoading ? (
        <ActivityIndicator size="large" color="#2e7d32" style={{ marginVertical: 20 }} />
      ) : plots.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No plots found</Text>
          <Text style={styles.emptySub}>
            We couldn't find any AgriStack plots tied to your Aadhaar. Contact
            your SATHI agent to add your land records.
          </Text>
        </View>
      ) : (
        plots.map((plot) => {
          const selected = pickedPlot?.surveyNumber === plot.surveyNumber;
          return (
            <TouchableOpacity
              key={plot.surveyNumber}
              style={[styles.plotCard, selected && styles.plotCardSelected]}
              onPress={() => setPickedPlot(plot)}
              activeOpacity={0.85}
            >
              <View style={styles.plotHeader}>
                <Text style={styles.plotEmoji}>🌾</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.plotTitle}>Survey {plot.surveyNumber}</Text>
                  <Text style={styles.plotSub}>
                    {plot.village}, {plot.district}, {plot.state}
                  </Text>
                </View>
                <View style={styles.plotAreaBadge}>
                  <Text style={styles.plotAreaText}>{plot.areaHectares} ha</Text>
                </View>
              </View>
              <Text style={styles.plotOwn}>{plot.ownershipType} · {plot.source}</Text>
            </TouchableOpacity>
          );
        })
      )}
      <View style={styles.btnRow}>
        <SecondaryBtn label="← Back" onPress={() => setStep("loan")} />
        <PrimaryBtn label="Next: Crop →" disabled={!pickedPlot} onPress={() => setStep("crop")} />
      </View>
    </View>
  );

  const renderCropStep = () => {
    const canProceed = !!pickedCycle || !!pickedCommodity;
    return (
      <View style={styles.stepCard}>
        <Text style={styles.stepTitle}>3. Your crop</Text>
        <Text style={styles.stepSub}>
          We pulled the crops you've already planned in FarmerPay. Pick the one
          you want this loan for, or add a different crop.
        </Text>

        {/* PRIMARY: pick from existing ROOTS cycles */}
        {!showOtherCropPicker && (
          <>
            <Text style={styles.fieldLabel}>Your active crops</Text>
            {cycles.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No crop cycles yet</Text>
                <Text style={styles.emptySub}>
                  You haven't recorded any crops in FarmerPay yet. Tap below to
                  pick a crop directly, or go to the Crop activity to plan one
                  first.
                </Text>
              </View>
            ) : (
              cycles.map((cy) => {
                const selected = pickedCycle?.cycleId === cy.cycleId;
                return (
                  <TouchableOpacity
                    key={cy.cycleId}
                    style={[styles.plotCard, selected && styles.plotCardSelected]}
                    onPress={() => setPickedCycle(cy)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.plotHeader}>
                      <Text style={styles.plotEmoji}>🌾</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.plotTitle}>
                          {cy.varietyName || cy.cropName}
                        </Text>
                        <Text style={styles.plotSub}>
                          {cy.cropName} · {cy.season}
                          {cy.year ? ` ${cy.year}` : ""}
                          {cy.sowingDate ? ` · sown ${cy.sowingDate}` : ""}
                        </Text>
                      </View>
                      <View style={styles.plotAreaBadge}>
                        <Text style={styles.plotAreaText}>
                          {(cy.status || "planning").toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* "Pick a different crop" toggle — escape hatch for cases
                 where the farmer wants to apply for a crop they
                 haven't seeded yet */}
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => {
                setShowOtherCropPicker(true);
                setPickedCycle(null);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.linkBtnText}>
                + Pick a different crop (not in my list)
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* FALLBACK: old commodity picker — only shown when the
             farmer explicitly toggles it on */}
        {showOtherCropPicker && (
          <>
            <Text style={styles.fieldLabel}>Commodity</Text>
            {commodities.length === 0 ? (
              <ActivityIndicator size="small" color="#2e7d32" style={{ marginVertical: 10 }} />
            ) : (
              <View style={styles.chipWrap}>
                {commodities.map((c) => {
                  const selected = pickedCommodity?.commodityId === c.commodityId;
                  return (
                    <TouchableOpacity
                      key={c.commodityId}
                      style={[styles.optionChip, selected && styles.optionChipSelected]}
                      onPress={() => setPickedCommodity(c)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          selected && styles.optionChipTextSelected,
                        ]}
                      >
                        {c.commodityName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={styles.fieldLabel}>Season</Text>
            <View style={styles.chipWrap}>
              {SEASONS.map((s) => {
                const selected = pickedSeason === s.value;
                return (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.optionChip, selected && styles.optionChipSelected]}
                    onPress={() => setPickedSeason(s.value)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        selected && styles.optionChipTextSelected,
                      ]}
                    >
                      {s.emoji} {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => {
                setShowOtherCropPicker(false);
                setPickedCommodity(null);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.linkBtnText}>← Back to your crops</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.btnRow}>
          <SecondaryBtn label="← Back" onPress={() => setStep("land")} />
          <PrimaryBtn
            label="Next: Cost →"
            disabled={!canProceed}
            onPress={() => setStep("cost")}
          />
        </View>
      </View>
    );
  };

  const renderCostStep = () => {
    const ha = num(pickedPlot?.areaHectares);
    const sofTotalForArea = sof ? Math.round(sof.costPerHectar.total * ha) : 0;
    const nabardForArea = sof ? Math.round(sof.nabardBenchmark * ha) : 0;
    const overrideNum = num(overrideAmount);
    const aboveSof = Math.max(0, overrideNum - sofTotalForArea);

    return (
      <View style={styles.stepCard}>
        <Text style={styles.stepTitle}>4. Cost & loan amount</Text>
        <Text style={styles.stepSub}>
          Based on your {ha} ha{" "}
          {pickedCycle
            ? `${pickedCycle.varietyName || pickedCycle.cropName} (${pickedCycle.season})`
            : pickedCommodity?.commodityName}{" "}
          on {pickedPlot?.surveyNumber}.
        </Text>

        {sofLoading ? (
          <ActivityIndicator size="large" color="#2e7d32" style={{ marginVertical: 20 }} />
        ) : !sof ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No DLTC norms for this combination</Text>
            <Text style={styles.emptySub}>
              We don't have a DLTC Scale of Finance for{" "}
              {pickedCycle?.cropName || pickedCommodity?.commodityName || "this crop"} (
              {pickedCycle?.season || pickedSeason}) seeded yet. You can still apply by
              entering an amount manually below.
            </Text>
          </View>
        ) : (
          <>
            {/* SoF card */}
            <View style={[styles.factCard, { borderLeftColor: "#2e7d32" }]}>
              <Text style={styles.factLabel}>📋 DLTC Scale of Finance</Text>
              <Text style={styles.factValue}>{formatRupees(sofTotalForArea)}</Text>
              <Text style={styles.factSub}>
                {formatRupees(sof.costPerHectar.total)}/ha × {ha} ha · {sof.district},{" "}
                {sof.state} · {sof.financialYear}
              </Text>
            </View>

            {/* NABARD benchmark card */}
            <View style={[styles.factCard, { borderLeftColor: "#1565c0" }]}>
              <Text style={styles.factLabel}>🏛 NABARD benchmark</Text>
              <Text style={styles.factValue}>{formatRupees(nabardForArea)}</Text>
              <Text style={styles.factSub}>
                {formatRupees(sof.nabardBenchmark)}/ha × {ha} ha
              </Text>
            </View>

            {/* Recommended */}
            <View style={[styles.factCard, { borderLeftColor: "#7c5800" }]}>
              <Text style={styles.factLabel}>💡 Recommended loan</Text>
              <Text style={[styles.factValue, { color: "#7c5800" }]}>
                {formatRupees(sofTotalForArea)}
              </Text>
              <Text style={styles.factSub}>Within DLTC norms — no bank review needed</Text>
            </View>
          </>
        )}

        <Text style={styles.fieldLabel}>Loan amount you want (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 30000"
          placeholderTextColor="#aaa"
          keyboardType="numeric"
          value={overrideAmount}
          onChangeText={setOverrideAmount}
        />
        {aboveSof > 0 && (
          <View style={styles.warnBanner}>
            <Text style={styles.warnText}>
              ⚠ {formatRupees(aboveSof)} exceeds DLTC norms. This will be flagged for bank
              review and may slow down approval.
            </Text>
          </View>
        )}

        <Text style={styles.fieldLabel}>Tenure (months)</Text>
        <View style={styles.chipWrap}>
          {TENURE_OPTIONS.map((t) => {
            const selected = t === tenureMonths;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.optionChip, selected && styles.optionChipSelected]}
                onPress={() => setTenureMonths(t)}
                activeOpacity={0.85}
              >
                <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>
                  {t} mo
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* DRISHTI Pre-Loan Scenario */}
        <TouchableOpacity
          style={{ backgroundColor: "#fff8e1", borderWidth: 1.5, borderColor: "#ff6f00", borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 10 }}
          activeOpacity={0.85}
          onPress={() => router.push(`/drishti-pre-loan?cropId=${pickedCycle?.cropId || ""}&season=${pickedCycle?.season || "kharif"}&loanAmount=${overrideNum}&acreage=${landHectares || "1"}` as any)}
        >
          <Text style={{ fontSize: 22 }}>🔮</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#e65100" }}>See how this loan could perform</Text>
            <Text style={{ fontSize: 11, color: "#888", marginTop: 2 }}>3 climate scenarios • EMI burden • breakeven yield</Text>
          </View>
          <Text style={{ fontSize: 18, color: "#ccc" }}>›</Text>
        </TouchableOpacity>

        <View style={styles.btnRow}>
          <SecondaryBtn label="← Back" onPress={() => setStep("crop")} />
          <PrimaryBtn
            label="Next: Review →"
            disabled={overrideNum <= 0}
            onPress={() => setStep("review")}
          />
        </View>
      </View>
    );
  };

  const renderReviewStep = () => (
    <View style={styles.stepCard}>
      <Text style={styles.stepTitle}>5. Review & sign</Text>
      <Text style={styles.stepSub}>
        Check the details one last time before applying. You can go back to any step
        to make changes.
      </Text>

      <View style={styles.summaryCard}>
        <SummaryRow label="Loan product" value={pickedProduct?.name || "—"} />
        <SummaryRow label="Provider" value={pickedProduct?.providerName || "—"} />
        <SummaryRow
          label="Land"
          value={`Survey ${pickedPlot?.surveyNumber} · ${pickedPlot?.areaHectares} ha`}
        />
        <SummaryRow label="Where" value={`${pickedPlot?.village}, ${pickedPlot?.district}`} />
        <SummaryRow
          label="Crop & season"
          value={
            pickedCycle
              ? `${pickedCycle.varietyName || pickedCycle.cropName}${pickedCycle.varietyName ? ` (${pickedCycle.cropName})` : ""} · ${pickedCycle.season}`
              : `${pickedCommodity?.commodityName} · ${pickedSeason}`
          }
        />
        <SummaryRow label="Amount" value={formatRupees(num(overrideAmount))} bold />
        <SummaryRow label="Tenure" value={`${tenureMonths} months`} />
        <SummaryRow
          label="Interest rate"
          value={`${pickedProduct?.interestRate || "—"}% p.a.`}
        />
      </View>

      <TouchableOpacity
        style={styles.consentRow}
        onPress={() => setConsent(!consent)}
        activeOpacity={0.85}
      >
        <View style={[styles.checkbox, consent && styles.checkboxOn]}>
          {consent && <Text style={styles.checkboxTick}>✓</Text>}
        </View>
        <Text style={styles.consentText}>
          I agree to the terms and conditions and confirm that the information above is
          accurate. मैं नियमों और शर्तों से सहमत हूँ।
        </Text>
      </TouchableOpacity>

      <View style={styles.btnRow}>
        <SecondaryBtn label="← Back" onPress={() => setStep("cost")} />
        <PrimaryBtn label="🔐 Apply" disabled={!consent} onPress={startApplyCluster} />
      </View>
    </View>
  );

  const renderApplyCluster = () => {
    // Render order MUST match the execution order in startApplyCluster:
    //   aadhaar → verify → submit → docs → done
    // (We submit BEFORE collecting docs so we have an applicationId
    // to attach the multipart uploads against.)
    const phases: Array<{ key: ClusterPhase; label: string; emoji: string }> = [
      { key: "aadhaar", label: "Verifying Aadhaar",        emoji: "🔐" },
      { key: "verify",  label: "Verifying with AgriStack", emoji: "🌐" },
      { key: "submit",  label: "Submitting to bank",       emoji: "📝" },
      { key: "docs",    label: "Capturing documents",      emoji: "📤" },
    ];
    const phaseOrder: ClusterPhase[] = ["aadhaar", "verify", "submit", "docs", "done"];
    const currentIdx = phaseOrder.indexOf(clusterPhase);

    return (
      <View style={styles.stepCard}>
        <Text style={styles.stepTitle}>Submitting your loan…</Text>
        <Text style={styles.stepSub}>
          Sit tight. We're running 4 quick checks then sending your application to the
          bank's core banking system.
        </Text>

        {phases.map((p, idx) => {
          const isDone = idx < currentIdx || clusterPhase === "done";
          const isActive = idx === currentIdx && clusterPhase !== "error";
          const isError = clusterPhase === "error" && idx === currentIdx;
          return (
            <View
              key={p.key}
              style={[
                styles.clusterRow,
                isDone && styles.clusterRowDone,
                isActive && styles.clusterRowActive,
                isError && styles.clusterRowError,
              ]}
            >
              <Text style={styles.clusterEmoji}>{p.emoji}</Text>
              <Text style={styles.clusterLabel}>{p.label}</Text>
              {isDone && <Text style={styles.clusterCheck}>✓</Text>}
              {isActive && <ActivityIndicator size="small" color="#2e7d32" />}
              {isError && <Text style={styles.clusterX}>✗</Text>}
            </View>
          );
        })}

        {clusterPhase === "done" && (
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>✅</Text>
            <Text style={styles.successTitle}>Application submitted!</Text>
            <Text style={styles.successSub}>Loading your status…</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Submission failed</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <SecondaryBtn label="← Back to review" onPress={() => setStep("review")} />
          </View>
        )}
      </View>
    );
  };

  const renderStatusStep = () => {
    // Map the polled status string to a stage index — every stage at
    // or below the current one is "done", the next one is "active",
    // and everything beyond is "pending".
    const STAGE_ORDER = [
      "submitted",
      "under_review",
      "approved",
      "pushed_to_cbs",
      "disbursed",
    ];
    // The backend doesn't have a 'pushed_to_cbs' status, so we infer
    // it: if there's a FinacleIntegrationEvent for this app, treat
    // 'approved' as already-pushed. For now, just show submitted +
    // map any approved/disbursed status correctly.
    const normalized = applicationStatus.toLowerCase();
    let currentIdx = 0;
    if (normalized.includes("disburse")) currentIdx = 4;
    else if (normalized.includes("approv")) currentIdx = 3; // approved AND pushed
    else if (normalized.includes("review")) currentIdx = 1;
    else currentIdx = 0; // submitted

    const stages = [
      { key: "submitted",     label: "Submitted to bank",  emoji: "📨" },
      { key: "under_review",  label: "Under review",       emoji: "🔍" },
      { key: "approved",      label: "Approved by bank",   emoji: "📋" },
      { key: "pushed_to_cbs", label: "Pushed to bank CBS", emoji: "🏦" },
      { key: "disbursed",     label: "Money disbursed",    emoji: "💰" },
    ];

    return (
      <View style={styles.stepCard}>
        <Text style={styles.stepTitle}>6. Your application</Text>
        {applicationUuid && (
          <Text style={styles.refText}>
            Reference: {applicationUuid.slice(0, 8).toUpperCase()}
          </Text>
        )}

        <View style={styles.summaryCard}>
          <SummaryRow label="Status" value={normalized.toUpperCase()} bold />
          <SummaryRow label="Amount" value={formatRupees(num(overrideAmount))} />
          <SummaryRow label="Loan" value={pickedProduct?.name || "—"} />
          <SummaryRow
            label="Crop & land"
            value={
              pickedCycle
                ? `${pickedCycle.varietyName || pickedCycle.cropName} on ${pickedPlot?.surveyNumber}`
                : `${pickedCommodity?.commodityName} on ${pickedPlot?.surveyNumber}`
            }
          />
        </View>

        {/* Timeline driven by polled status */}
        <Text style={styles.fieldLabel}>What happens next (auto-refreshes every 5 s)</Text>
        <View style={styles.timelineCard}>
          {stages.map((stage, idx) => (
            <TimelineRow
              key={stage.key}
              label={stage.label}
              emoji={idx <= currentIdx ? "✓" : stage.emoji}
              done={idx <= currentIdx}
              pending={idx > currentIdx}
            />
          ))}
        </View>

        {/* Documents captured during the cluster */}
        {capturedDocs.length > 0 && (
          <>
            <Text style={styles.fieldLabel}>Documents</Text>
            <View style={styles.timelineCard}>
              {capturedDocs.map((d) => (
                <View key={d.type} style={styles.timelineRow}>
                  <Text
                    style={[
                      styles.timelineEmoji,
                      d.uploaded
                        ? { color: "#2e7d32" }
                        : { color: "#c62828", opacity: 0.7 },
                    ]}
                  >
                    {d.uploaded ? "✓" : "⚠"}
                  </Text>
                  <Text style={styles.timelineLabel}>
                    {d.type === "kyc_aadhaar"
                      ? "Aadhaar card"
                      : d.type === "land_document"
                        ? "Land record"
                        : d.type === "bank_statement"
                          ? "Bank passbook"
                          : d.type}{" "}
                    {d.uploaded ? "uploaded" : "pending"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <PrimaryBtn label="Done" onPress={() => router.replace("/(tabs)" as any)} />
      </View>
    );
  };

  // ── Main render ──
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {renderStepper()}
      {step === "loan"   && renderLoanStep()}
      {step === "land"   && renderLandStep()}
      {step === "crop"   && renderCropStep()}
      {step === "cost"   && renderCostStep()}
      {step === "review" && renderReviewStep()}
      {step === "apply"  && renderApplyCluster()}
      {step === "status" && renderStatusStep()}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Small subcomponents ─────────────────────────────────────────

const PrimaryBtn = ({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) => (
  <TouchableOpacity
    style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.85}
  >
    <Text style={styles.primaryBtnText}>{label}</Text>
  </TouchableOpacity>
);

const SecondaryBtn = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.secondaryBtn} onPress={onPress} activeOpacity={0.85}>
    <Text style={styles.secondaryBtnText}>{label}</Text>
  </TouchableOpacity>
);

const SummaryRow = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, bold && { fontWeight: "900", fontSize: 15 }]}>{value}</Text>
  </View>
);

const TimelineRow = ({ label, emoji, done, pending }: { label: string; emoji: string; done?: boolean; pending?: boolean }) => (
  <View style={styles.timelineRow}>
    <Text style={[styles.timelineEmoji, done && { color: "#2e7d32" }, pending && { opacity: 0.4 }]}>
      {emoji}
    </Text>
    <Text style={[styles.timelineLabel, pending && { color: "#999" }]}>{label}</Text>
  </View>
);

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },

  stepper: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: "center", alignItems: "center",
  },
  stepDotActive: { backgroundColor: "#2e7d32" },
  stepDotInactive: { backgroundColor: "#e0e0e0" },
  stepDotText: { fontSize: 14, fontWeight: "900" },
  stepDotTextActive: { color: "#fff" },
  stepDotTextInactive: { color: "#888" },

  stepCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  stepTitle: { fontSize: 19, fontWeight: "900", color: "#1b5e20" },
  stepSub: { fontSize: 12, color: "#666", marginTop: 6, lineHeight: 17 },
  fieldLabel: {
    fontSize: 11, fontWeight: "800", color: "#555",
    marginTop: 18, marginBottom: 8,
    textTransform: "uppercase", letterSpacing: 0.3,
  },

  // Product cards
  productCard: {
    borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12,
    padding: 14, marginTop: 14, backgroundColor: "#fff",
  },
  productCardSelected: {
    borderWidth: 3, borderColor: "#1b5e20", backgroundColor: "#e8f5e9",
  },
  productTitle: { fontSize: 15, fontWeight: "800", color: "#1b5e20" },
  productSub: { fontSize: 12, color: "#666", marginTop: 4, fontWeight: "600" },
  productMeta: { fontSize: 11, color: "#888", marginTop: 4 },

  // Plot cards
  plotCard: {
    borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12,
    padding: 14, marginTop: 14, backgroundColor: "#fff",
  },
  plotCardSelected: {
    borderWidth: 3, borderColor: "#1b5e20", backgroundColor: "#e8f5e9",
  },
  plotHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  plotEmoji: { fontSize: 28 },
  plotTitle: { fontSize: 15, fontWeight: "800", color: "#1b5e20" },
  plotSub: { fontSize: 11, color: "#666", marginTop: 2 },
  plotAreaBadge: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  plotAreaText: { fontSize: 12, fontWeight: "900", color: "#1b5e20" },
  plotOwn: { fontSize: 10, color: "#888", marginTop: 8, fontWeight: "600" },

  // Generic option chips
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#e0e0e0", backgroundColor: "#fff",
  },
  optionChipSelected: { borderColor: "#1b5e20", backgroundColor: "#e8f5e9" },
  optionChipText: { fontSize: 13, fontWeight: "700", color: "#666" },
  optionChipTextSelected: { color: "#1b5e20" },

  // Cost step fact cards
  factCard: {
    backgroundColor: "#fafafa",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 4,
  },
  factLabel: {
    fontSize: 10, fontWeight: "800", color: "#666",
    textTransform: "uppercase", letterSpacing: 0.3,
  },
  factValue: { fontSize: 18, fontWeight: "900", color: "#1b5e20", marginTop: 4 },
  factSub: { fontSize: 11, color: "#888", marginTop: 3 },

  warnBanner: {
    backgroundColor: "#fff8e1",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#7c5800",
  },
  warnText: { fontSize: 12, color: "#7c5800", fontWeight: "700", lineHeight: 17 },

  input: {
    borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12,
    padding: 14, fontSize: 16, color: "#222", backgroundColor: "#fff",
  },

  // Review summary
  summaryCard: {
    backgroundColor: "#fafafa",
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
  },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 6,
    gap: 12,
  },
  summaryLabel: { fontSize: 12, color: "#666", fontWeight: "600" },
  summaryValue: { fontSize: 13, color: "#222", fontWeight: "700", flex: 1, textAlign: "right" },

  // Consent
  consentRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 14,
    padding: 12, borderRadius: 10, backgroundColor: "#f5f5f5",
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 5,
    borderWidth: 2, borderColor: "#2e7d32",
    justifyContent: "center", alignItems: "center",
  },
  checkboxOn: { backgroundColor: "#2e7d32" },
  checkboxTick: { color: "#fff", fontWeight: "900", fontSize: 14 },
  consentText: { flex: 1, fontSize: 12, color: "#444", lineHeight: 17 },

  // Apply cluster
  clusterRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 10, marginTop: 10,
    backgroundColor: "#fafafa",
    borderLeftWidth: 4, borderLeftColor: "#e0e0e0",
  },
  clusterRowActive: {
    backgroundColor: "#fff8e1", borderLeftColor: "#7c5800",
  },
  clusterRowDone: {
    backgroundColor: "#e8f5e9", borderLeftColor: "#2e7d32",
  },
  clusterRowError: {
    backgroundColor: "#fbe9e7", borderLeftColor: "#c62828",
  },
  clusterEmoji: { fontSize: 22 },
  clusterLabel: { fontSize: 13, fontWeight: "700", color: "#333", flex: 1 },
  clusterCheck: { fontSize: 18, fontWeight: "900", color: "#2e7d32" },
  clusterX: { fontSize: 18, fontWeight: "900", color: "#c62828" },

  successCard: {
    backgroundColor: "#1b5e20",
    borderRadius: 12,
    padding: 18,
    marginTop: 18,
    alignItems: "center",
  },
  successEmoji: { fontSize: 42 },
  successTitle: { fontSize: 18, fontWeight: "900", color: "#fff", marginTop: 6 },
  successSub: { fontSize: 12, color: "#a5d6a7", marginTop: 4 },

  errorCard: {
    backgroundColor: "#fbe9e7",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#c62828",
  },
  errorTitle: { fontSize: 14, fontWeight: "900", color: "#c62828" },
  errorBody: { fontSize: 12, color: "#6d4c41", marginTop: 4, marginBottom: 12 },

  // Status step
  refText: {
    fontSize: 11, color: "#888", fontWeight: "700", letterSpacing: 0.5,
    marginTop: 4, marginBottom: 6,
  },
  timelineCard: {
    backgroundColor: "#fafafa",
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  timelineRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 6,
  },
  timelineEmoji: { fontSize: 18 },
  timelineLabel: { fontSize: 13, color: "#333", fontWeight: "700" },

  // Buttons
  primaryBtn: {
    backgroundColor: "#2e7d32", borderRadius: 12,
    padding: 16, alignItems: "center", marginTop: 18,
    flex: 1,
  },
  primaryBtnDisabled: {
    backgroundColor: "#aabaa5",
    opacity: 0.6,
    cursor: "not-allowed" as any,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  secondaryBtn: {
    backgroundColor: "#fff", borderRadius: 12,
    padding: 16, alignItems: "center", marginTop: 18,
    borderWidth: 1.5, borderColor: "#e0e0e0",
    paddingHorizontal: 20,
  },
  secondaryBtnText: { color: "#666", fontSize: 14, fontWeight: "700" },

  // Inline link-style button used for the "Pick a different crop" /
  // "Back to your crops" toggle on Step 3.
  linkBtn: { paddingVertical: 12, alignItems: "center", marginTop: 14 },
  linkBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1565c0",
    textDecorationLine: "underline",
  },

  btnRow: { flexDirection: "row", gap: 10 },

  emptyText: { fontSize: 12, color: "#999", marginTop: 14, fontStyle: "italic" },
  emptyCard: {
    backgroundColor: "#fafafa",
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
  },
  emptyTitle: { fontSize: 14, fontWeight: "800", color: "#666" },
  emptySub: { fontSize: 12, color: "#888", marginTop: 6, lineHeight: 17 },

  hintBanner: {
    backgroundColor: "#fff8e1", borderRadius: 10,
    padding: 12, marginTop: 14,
    borderLeftWidth: 4, borderLeftColor: "#7c5800",
  },
  hintBannerText: {
    fontSize: 12, color: "#7c5800", fontWeight: "700", lineHeight: 17,
  },
});
