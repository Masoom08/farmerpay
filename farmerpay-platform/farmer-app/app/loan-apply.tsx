import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiGet, apiPost, apiDiceGet, apiDicePost, StepUpRequiredError, formatRupees } from "../lib/api";
import { isAadhaarVerified } from "../lib/aadhaarAuth";

// ─── Types ─────────────────────────────────────────────────────────

interface LoanProduct {
  id: string;
  name: string;
  nameHi?: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  interestRate?: number;
  maxTenureMonths?: number;
}

interface Eligibility {
  eligible: boolean;
  reasons: string[];
}

interface InputItem {
  id: string;
  name: string;
  nameHi?: string;
  unit: string;
  pricePerUnit: number;
  category?: string;
}

interface SelectedInput {
  inputId: string;
  quantity: number;
}

interface SofNorm {
  sofId: number;
  sofCode: string;
  sofName: string;
  cropId: number;
  season: string;
  financialYear: string;
  costPerHectar: {
    seed?: number; fertiliser?: number; pesticide?: number;
    labour?: number; machinery?: number; other?: number; total?: number;
  };
  nabardBenchmark?: number;
  approvedBy?: string;
  source?: string;
}

const SOF_SEASONS = ["kharif", "rabi", "summer", "perennial"] as const;

interface Application {
  applicationId: number;
  applicationUuid?: string;
  status: string;
  productName?: string;
  providerName?: string;
  loanAmount?: string | number;
  approvalAmount?: string | number | null;
  tenureMonths?: number;
  appliedAt?: string;
  intendedUse?: string;
}

interface LosTimelineItem {
  fromStatus: string | null;
  toStatus: string;
  changedBy: number | null;
  remarks: string | null;
  changedAt: string;
}

type WizardStep = "products" | "calculator" | "form" | "documents" | "confirm" | "status";

interface LoanDocument {
  type: "land_record" | "aadhaar" | "bank_passbook" | "pan" | "other";
  label: string;
  fileName: string | null; // local placeholder — would be a real upload URI in prod
  uploadedAt: string | null;
}

const REQUIRED_DOCS: { type: LoanDocument["type"]; label: string; required: boolean }[] = [
  { type: "land_record", label: "Land Record / Patta / 7-12", required: true },
  { type: "aadhaar", label: "Aadhaar Card", required: true },
  { type: "bank_passbook", label: "Bank Passbook (first page)", required: true },
  { type: "pan", label: "PAN Card", required: false },
  { type: "other", label: "Other (optional)", required: false },
];

const TENURE_OPTIONS = [6, 12, 18, 24];

const STATUS_TIMELINE = [
  { key: "applied", label: "Applied / आवेदन किया", labelHi: "आवेदन किया" },
  { key: "under_review", label: "Under Review / समीक्षा में", labelHi: "समीक्षा में" },
  { key: "approved", label: "Approved / स्वीकृत", labelHi: "स्वीकृत" },
  { key: "disbursed", label: "Disbursed / वितरित", labelHi: "वितरित" },
];

// ─── Main Component ────────────────────────────────────────────────

export default function LoanApplyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialApplicationId?: string }>();

  // Wizard state
  const [step, setStep] = useState<WizardStep>("products");
  const [loading, setLoading] = useState(false);
  const [losTimeline, setLosTimeline] = useState<LosTimelineItem[]>([]);

  // Step 1: Product Selection
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [eligibilityMap, setEligibilityMap] = useState<Record<string, Eligibility>>({});
  const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(null);

  // Step 2: Input Cost Calculator
  const [inputItems, setInputItems] = useState<InputItem[]>([]);
  const [selectedInputs, setSelectedInputs] = useState<SelectedInput[]>([]);
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0);

  // Scale of Finance reference (district-level loan ceiling per hectare)
  const [sofSeason, setSofSeason] = useState<typeof SOF_SEASONS[number]>("rabi");
  const [sofNorms, setSofNorms] = useState<SofNorm[]>([]);
  const [sofLoading, setSofLoading] = useState(false);

  // Step 3: Application Form
  const [applyAmount, setApplyAmount] = useState("");
  const [tenure, setTenure] = useState(12);
  const [intendedUse, setIntendedUse] = useState("");
  const [consent, setConsent] = useState(false);

  // Step 4: Document Upload (placeholder - stores file names locally)
  const [documents, setDocuments] = useState<LoanDocument[]>(
    REQUIRED_DOCS.map((d) => ({ type: d.type, label: d.label, fileName: null, uploadedAt: null })),
  );

  // Step 5: Status Tracker
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // ─── Load Products ───────────────────────────────────────────────

  useEffect(() => {
    loadProducts();
  }, []);

  // If we were opened from the loans tab with an initialApplicationId,
  // jump straight to the status step and load that application's detail
  // + LOS timeline. We only want this on first mount.
  useEffect(() => {
    const id = params?.initialApplicationId;
    if (!id) return;
    (async () => {
      setStep("status");
      await loadApplications();
      await openApplicationDetail(Number(id));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch one application's full detail + LOS timeline.
  const openApplicationDetail = async (appId: number) => {
    setLoading(true);
    try {
      // 1. Application metadata (also tries with step-up since some bank
      //    fields are PII; falls back to plain GET if not gated).
      let detail: any = null;
      try {
        const r = await apiDiceGet(`/dice/applications/${appId}`);
        detail = r?.data || r;
      } catch {
        try {
          const r = await apiGet(`/dice/applications/${appId}`);
          detail = r?.data || r;
        } catch {}
      }

      // 2. LOS status timeline (the real audit log).
      let timeline: LosTimelineItem[] = [];
      try {
        const r = await apiDiceGet(`/dice/los/${appId}/status`);
        const data = r?.data || r;
        if (Array.isArray(data?.timeline)) timeline = data.timeline;
        // Also merge the canonical status from LOS if detail was empty.
        if (!detail && data?.application) detail = data.application;
      } catch {}

      if (detail) {
        // /dice/applications/:id returns raw snake_case rows with a nested
        // product → provider; /dice/los/:id/status returns a flatter
        // camelCase shape. Handle both.
        setSelectedApp({
          applicationId: detail.applicationId ?? detail.id ?? appId,
          applicationUuid: detail.applicationUuid ?? detail.application_uuid,
          status:
            detail.status ||
            detail.currentStatus ||
            detail.application_status ||
            "submitted",
          productName:
            detail.productName ||
            detail.product?.product_name ||
            detail.product?.productName,
          providerName:
            detail.providerName ||
            detail.product?.provider?.provider_name ||
            detail.product?.provider?.providerName,
          loanAmount:
            detail.loanAmount ??
            detail.loanAmountRequested ??
            detail.apply_for_amount,
          approvalAmount:
            detail.approvalAmount ??
            detail.loanAmountApproved ??
            detail.approval_amount,
          tenureMonths:
            detail.tenureMonths ??
            detail.apply_for_tenure_months ??
            detail.approval_tenure_months,
          appliedAt:
            detail.appliedAt || detail.applicationDate || detail.applied_at,
          intendedUse: detail.intendedUse || detail.intended_use,
        });
      }
      setLosTimeline(timeline);
    } finally {
      setLoading(false);
    }
  };

  // Normalize the backend `dice_loan_products` row → the screen's flat shape.
  // Backend returns productId/productName/minInterestRate etc; we keep this
  // mapper in one place so the rest of the screen reads {id, name, ...}.
  const normalizeProduct = (raw: any): LoanProduct => ({
    id: String(raw.productId ?? raw.id ?? raw.productUuid ?? ""),
    name: raw.productName || raw.name || raw.productCode || "Loan product",
    description: raw.description || raw.provider || raw.category || undefined,
    minAmount: raw.minAmount != null ? Number(raw.minAmount) : undefined,
    maxAmount: raw.maxAmount != null ? Number(raw.maxAmount) : undefined,
    interestRate: raw.minInterestRate != null
      ? Number(raw.minInterestRate)
      : raw.interestRate != null ? Number(raw.interestRate) : undefined,
    maxTenureMonths: raw.tenureMax ?? raw.maxTenureMonths ?? undefined,
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await apiGet("/dice/products");
      const list = res.data || res.products || res || [];
      const normalized = (Array.isArray(list) ? list : []).map(normalizeProduct);
      setProducts(normalized);

      // Auto-select if there's only one eligible product. The pilot SBI
      // demo only has KCC Crop Loan — there's no reason to make the
      // farmer manually tap the only option to enable the Next button.
      // The user reported the loan journey was "stuck" because Next was
      // disabled and they couldn't tell why. Auto-select removes the
      // ambiguity entirely when there's only one choice.
      if (normalized.length === 1) {
        setSelectedProduct(normalized[0]);
      }

      // Check eligibility for each product. Backend returns
      //   { isEligible, meetsAllCriteria, failingCriteria, passingCriteria }
      // — normalize to { eligible, reasons } so the renderer doesn't change.
      const eMap: Record<string, Eligibility> = {};
      for (const p of normalized) {
        try {
          const eRes = await apiGet(`/dice/products/${p.id}/eligibility`);
          const d = eRes.data || eRes;
          eMap[p.id] = {
            eligible: d?.isEligible ?? d?.eligible ?? false,
            reasons: Array.isArray(d?.failingCriteria) && d.failingCriteria.length
              ? d.failingCriteria.map((c: any) => c?.reason || c?.label || String(c))
              : (d?.reasons || []),
          };
        } catch {
          eMap[p.id] = { eligible: false, reasons: ["Unable to check eligibility"] };
        }
      }
      setEligibilityMap(eMap);
    } catch (err: any) {
      Alert.alert("Error / त्रुटि", "Failed to load loan products. Please try again.\nऋण उत्पाद लोड करने में विफल।");
    } finally {
      setLoading(false);
    }
  };

  // ─── Load Input Items ────────────────────────────────────────────

  const loadInputItems = async () => {
    setLoading(true);
    try {
      // Load SoF norms in parallel — non-blocking
      loadSofNorms(sofSeason);
      const res = await apiGet("/dice/input-calculator/inputs");
      const items = res.data || res.inputs || res || [];
      setInputItems(Array.isArray(items) ? items : []);
      setSelectedInputs([]);
      setCalculatedAmount(0);
    } catch (err: any) {
      Alert.alert("Error / त्रुटि", "Failed to load input items.\nइनपुट आइटम लोड करने में विफल।");
    } finally {
      setLoading(false);
    }
  };

  // ─── Scale of Finance loader ─────────────────────────────────────

  const loadSofNorms = async (season: typeof SOF_SEASONS[number]) => {
    setSofLoading(true);
    try {
      const res = await apiGet(`/dice/scale-of-finance?season=${season}`);
      const list: SofNorm[] = Array.isArray(res?.data) ? res.data : [];
      setSofNorms(list);
    } catch (e) {
      setSofNorms([]);
    } finally {
      setSofLoading(false);
    }
  };

  // ─── Calculate Amount ────────────────────────────────────────────

  const calculateAmount = async () => {
    const items = selectedInputs.filter((si) => si.quantity > 0);
    if (items.length === 0) {
      Alert.alert("No Inputs / कोई इनपुट नहीं", "Please add at least one input with quantity.\nकृपया कम से कम एक इनपुट जोड़ें।");
      return;
    }
    setLoading(true);
    try {
      const res = await apiPost("/dice/input-calculator/calculate", { items });
      const amount = res.data?.totalAmount || res.totalAmount || 0;
      setCalculatedAmount(amount);
      setApplyAmount(String(Math.round(amount)));
    } catch (err: any) {
      Alert.alert("Error / त्रुटि", "Calculation failed.\nगणना विफल हुई।");
    } finally {
      setLoading(false);
    }
  };

  // ─── Submit Application ──────────────────────────────────────────

  const submitApplication = async () => {
    if (!selectedProduct) return;
    const amount = parseFloat(applyAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Invalid Amount / अमान्य राशि", "Please enter a valid loan amount.\nकृपया एक वैध ऋण राशि दर्ज करें।");
      return;
    }
    // Tier-2 gate: require Aadhaar step-up before submitting
    if (!(await isAadhaarVerified())) {
      router.push("/aadhaar-verify?returnTo=/loan-apply" as any);
      return;
    }
    setLoading(true);
    try {
      // Field names MUST match the backend Joi schema in
      // src/modules/dice/validators/diceValidator.js (applyLoanSchema):
      //   { productId, loanAmount, tenureMonths, intendedUse }
      // The previous payload used loanProductId / applyForAmount /
      // applyForTenureMonths which match the DB column names but NOT
      // the API contract — Joi rejected every submission with a 400
      // and the silent Alert.alert (which doesn't render in RN Web)
      // made the failure invisible. The user clicked "My Applications"
      // expecting to see their just-submitted loan, found it blank,
      // and reported the loan cycle as broken.
      const res = await apiDicePost("/dice/apply", {
        productId: selectedProduct.id,
        loanAmount: amount,
        tenureMonths: tenure,
        intendedUse: intendedUse || undefined,
      });
      if (res.success === false) {
        // Surface the validation errors so the next silent-failure mode
        // is loud. Includes the per-field error list when present.
        const detail = Array.isArray(res.errors) && res.errors.length > 0
          ? res.errors.map((e: any) => `${e.field}: ${e.message}`).join("\n")
          : "";
        Alert.alert(
          "Failed / विफल",
          (res.message || "Application submission failed.") + (detail ? "\n\n" + detail : "")
        );
        return;
      }
      const app = res.data || res.application || res;
      // Normalize the response into our Application shape so renderStatus
      // can show it without crashing on missing fields.
      const appId = app?.applicationId ?? app?.id;
      Alert.alert(
        "Success / सफल",
        "Your loan application has been submitted!\nआपका ऋण आवेदन जमा हो गया है!",
        [{
          text: "OK",
          onPress: async () => {
            setStep("status");
            if (appId) await openApplicationDetail(Number(appId));
          },
        }]
      );
    } catch (err: any) {
      if (err instanceof StepUpRequiredError) {
        router.push("/aadhaar-verify?returnTo=/loan-apply" as any);
        return;
      }
      Alert.alert("Error / त्रुटि", "Failed to submit application.\nआवेदन जमा करने में विफल।");
    } finally {
      setLoading(false);
    }
  };

  // ─── Load Applications ───────────────────────────────────────────

  const loadApplications = async () => {
    setLoading(true);
    try {
      const res = await apiGet("/dice/applications");
      const apps = res.data || res.applications || res || [];
      setApplications(Array.isArray(apps) ? apps : []);
    } catch (err: any) {
      Alert.alert("Error / त्रुटि", "Failed to load applications.\nआवेदन लोड करने में विफल।");
    } finally {
      setLoading(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────

  const updateInputQty = (inputId: string, qty: string) => {
    const num = parseFloat(qty) || 0;
    setSelectedInputs((prev) => {
      const existing = prev.find((si) => si.inputId === inputId);
      if (existing) {
        return prev.map((si) => (si.inputId === inputId ? { ...si, quantity: num } : si));
      }
      return [...prev, { inputId, quantity: num }];
    });
  };

  const getInputQty = (inputId: string): string => {
    const si = selectedInputs.find((s) => s.inputId === inputId);
    return si && si.quantity > 0 ? String(si.quantity) : "";
  };

  const getStatusIndex = (status: string): number => {
    const normalized = status?.toLowerCase().replace(/[\s-]/g, "_") || "";
    if (normalized.includes("disburse")) return 3;
    if (normalized.includes("approv")) return 2;
    if (normalized.includes("review") || normalized.includes("process")) return 1;
    return 0;
  };

  // ─── Navigation between steps ────────────────────────────────────

  const goToCalculator = () => {
    loadInputItems();
    setStep("calculator");
  };

  const goToForm = () => {
    setStep("form");
  };

  const goToDocuments = () => {
    if (!consent) {
      Alert.alert("Consent Required / सहमति आवश्यक", "Please accept the terms to proceed.\nकृपया आगे बढ़ने के लिए शर्तें स्वीकार करें।");
      return;
    }
    const amount = parseFloat(applyAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Invalid Amount / अमान्य राशि", "Please enter a valid amount.\nकृपया एक वैध राशि दर्ज करें।");
      return;
    }
    setStep("documents");
  };

  const goToConfirm = () => {
    // Check that all required documents are uploaded
    const requiredTypes = REQUIRED_DOCS.filter((d) => d.required).map((d) => d.type);
    const missing = requiredTypes.filter(
      (t) => !documents.find((d) => d.type === t)?.fileName,
    );
    if (missing.length > 0) {
      Alert.alert(
        "Documents Required / दस्तावेज़ आवश्यक",
        `Please upload all required documents:\n${missing
          .map((t) => "• " + (REQUIRED_DOCS.find((d) => d.type === t)?.label || t))
          .join("\n")}`,
      );
      return;
    }
    setStep("confirm");
  };

  // Placeholder "upload" — in production this would launch expo-image-picker
  // and POST the resized image to a /dice/applications/:id/documents endpoint.
  // For now we mark the doc as uploaded with a synthetic file name so the
  // flow is complete end-to-end.
  const markDocumentUploaded = (type: LoanDocument["type"]) => {
    const stamp = new Date();
    const fileName = `${type}_${stamp.getTime()}.jpg`;
    setDocuments((prev) =>
      prev.map((d) =>
        d.type === type
          ? { ...d, fileName, uploadedAt: stamp.toISOString() }
          : d,
      ),
    );
  };

  const removeDocument = (type: LoanDocument["type"]) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.type === type ? { ...d, fileName: null, uploadedAt: null } : d,
      ),
    );
  };

  const goToStatusTracker = () => {
    loadApplications();
    setStep("status");
  };

  // ─── Render: Step Indicator ──────────────────────────────────────

  const renderStepIndicator = () => {
    const steps: { key: WizardStep; label: string }[] = [
      { key: "products", label: "1" },
      { key: "calculator", label: "2" },
      { key: "form", label: "3" },
      { key: "documents", label: "4" },
      { key: "confirm", label: "5" },
      { key: "status", label: "6" },
    ];
    const currentIdx = steps.findIndex((s) => s.key === step);

    return (
      <View style={styles.stepRow}>
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <View style={[styles.stepCircle, i <= currentIdx && styles.stepCircleActive]}>
              <Text style={[styles.stepCircleText, i <= currentIdx && styles.stepCircleTextActive]}>
                {s.label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[styles.stepLine, i < currentIdx && styles.stepLineActive]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  // ─── Render: Step 1 — Product Selection ──────────────────────────

  const renderProductSelection = () => (
    <View>
      <Text style={styles.sectionTitle}>Select Loan Product / ऋण उत्पाद चुनें</Text>

      {products.length === 0 && !loading && (
        <Text style={styles.emptyText}>No loan products available.\nकोई ऋण उत्पाद उपलब्ध नहीं।</Text>
      )}

      {products.map((p) => {
        const elig = eligibilityMap[p.id];
        const isEligible = elig?.eligible !== false;
        return (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.card,
              selectedProduct?.id === p.id && styles.cardSelected,
              !isEligible && styles.cardDisabled,
            ]}
            onPress={() => {
              if (!isEligible) {
                Alert.alert(
                  "Not Eligible / पात्र नहीं",
                  (elig?.reasons || []).join("\n") || "You are not eligible for this product."
                );
                return;
              }
              setSelectedProduct(p);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{p.name}</Text>
              <View style={[styles.badge, isEligible ? styles.badgeEligible : styles.badgeIneligible]}>
                <Text style={styles.badgeText}>{isEligible ? "Eligible / पात्र" : "Not Eligible"}</Text>
              </View>
            </View>
            {p.nameHi ? <Text style={styles.cardSubtitle}>{p.nameHi}</Text> : null}
            {p.description ? <Text style={styles.cardDesc}>{p.description}</Text> : null}
            <View style={styles.cardMeta}>
              {p.interestRate != null && (
                <Text style={styles.metaText}>Interest: {p.interestRate}%</Text>
              )}
              {p.minAmount != null && p.maxAmount != null && (
                <Text style={styles.metaText}>
                  {formatRupees(p.minAmount)} - {formatRupees(p.maxAmount)}
                </Text>
              )}
              {p.maxTenureMonths != null && (
                <Text style={styles.metaText}>Max Tenure: {p.maxTenureMonths} months</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Hint banner — only when no product is selected. Prevents the
          "I tapped Next and nothing happened" confusion the user
          reported by spelling out exactly what's blocking the button. */}
      {!selectedProduct && products.length > 0 && (
        <View style={styles.hintBanner}>
          <Text style={styles.hintBannerText}>
            ⚠ Tap a product card above to continue
            {"\n"}जारी रखने के लिए ऊपर एक उत्पाद कार्ड पर टैप करें
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={goToStatusTracker}>
          <Text style={styles.secondaryBtnText}>My Applications / मेरे आवेदन</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, !selectedProduct && styles.btnDisabled]}
          onPress={selectedProduct ? goToForm : undefined}
          // Block touch entirely when disabled so the user sees the
          // not-allowed cursor on web AND doesn't trigger an empty
          // press handler that looks like the screen is broken.
          disabled={!selectedProduct}
          accessibilityState={{ disabled: !selectedProduct }}
        >
          <Text style={styles.primaryBtnText}>Next / आगे</Text>
        </TouchableOpacity>
      </View>

      {/* Optional: advanced cost-of-cultivation calculator. Most farmers
          will just type the amount they need on the next step, so we keep
          this as a small secondary link rather than the main path. */}
      {selectedProduct && (
        <TouchableOpacity onPress={goToCalculator} style={{ marginTop: 14, alignItems: "center" }}>
          <Text style={{ color: "#2e7d32", fontSize: 13, fontWeight: "600", textDecorationLine: "underline" }}>
            Use cost-of-cultivation calculator (advanced)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── Render: Step 2 — Input Cost Calculator ─────────────────────

  const renderCalculator = () => (
    <View>
      <Text style={styles.sectionTitle}>Input Cost Calculator / इनपुट लागत कैलकुलेटर</Text>
      <Text style={styles.helperText}>
        Add quantities for the inputs you need. We will calculate the required loan amount.
        {"\n"}आवश्यक इनपुट की मात्रा जोड़ें।
      </Text>

      {/* Advanced-mode notice — the backend calc requires a registered PoP */}
      <View style={{
        backgroundColor: "#fff8e1", borderRadius: 10, padding: 12, marginBottom: 12,
        borderWidth: 1, borderColor: "#ffe082",
      }}>
        <Text style={{ fontSize: 12, color: "#e65100", fontWeight: "800" }}>Advanced mode</Text>
        <Text style={{ fontSize: 11, color: "#5d4037", marginTop: 4, lineHeight: 16 }}>
          This calculator pulls real input prices and DLTC scale-of-finance norms.
          It needs a registered crop + field + Package of Practice. If you don't have
          one set up yet, just skip and enter your amount manually on the next step.
        </Text>
        <TouchableOpacity
          onPress={goToForm}
          style={{ marginTop: 8, alignSelf: "flex-start", backgroundColor: "#f57c00", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
        >
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>Skip → enter amount manually</Text>
        </TouchableOpacity>
      </View>

      {/* Scale of Finance reference — DLTC-approved per-hectare ceilings */}
      <View style={styles.sofCard}>
        <View style={styles.sofHeader}>
          <Text style={styles.sofIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sofTitle}>Scale of Finance / स्केल ऑफ़ फाइनेंस</Text>
            <Text style={styles.sofSub}>DLTC-approved per-hectare loan ceiling</Text>
          </View>
        </View>

        <View style={styles.sofSeasonRow}>
          {SOF_SEASONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sofSeasonChip, sofSeason === s && styles.sofSeasonChipActive]}
              onPress={() => {
                setSofSeason(s);
                loadSofNorms(s);
              }}
            >
              <Text
                style={[
                  styles.sofSeasonText,
                  sofSeason === s && styles.sofSeasonTextActive,
                ]}
              >
                {s.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {sofLoading ? (
          <ActivityIndicator size="small" color="#1b5e20" style={{ marginTop: 10 }} />
        ) : sofNorms.length === 0 ? (
          <Text style={styles.sofEmpty}>No SoF norms published for this season yet.</Text>
        ) : (
          sofNorms.map((sof) => (
            <View key={sof.sofId} style={styles.sofRow}>
              <Text style={styles.sofName}>{sof.sofName}</Text>
              <Text style={styles.sofTotal}>
                {formatRupees(sof.costPerHectar?.total || 0)}
                <Text style={styles.sofUnit}> / ha</Text>
              </Text>
              {sof.nabardBenchmark != null && (
                <Text style={styles.sofBenchmark}>
                  NABARD benchmark: {formatRupees(sof.nabardBenchmark)} · FY {sof.financialYear}
                </Text>
              )}
              {sof.approvedBy && (
                <Text style={styles.sofApprover}>Approved by: {sof.approvedBy}</Text>
              )}
            </View>
          ))
        )}
      </View>

      {inputItems.length === 0 && !loading && (
        <Text style={styles.emptyText}>No input items found.</Text>
      )}

      {inputItems.map((item) => (
        <View key={item.id} style={styles.inputRow}>
          <View style={styles.inputInfo}>
            <Text style={styles.inputName}>
              {item.name}
              {item.nameHi ? ` / ${item.nameHi}` : ""}
            </Text>
            <Text style={styles.inputMeta}>
              {formatRupees(item.pricePerUnit)} / {item.unit}
              {item.category ? `  |  ${item.category}` : ""}
            </Text>
          </View>
          <TextInput
            style={styles.qtyInput}
            keyboardType="numeric"
            placeholder="Qty"
            value={getInputQty(item.id)}
            onChangeText={(val) => updateInputQty(item.id, val)}
          />
        </View>
      ))}

      {calculatedAmount > 0 && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Estimated Loan Amount / अनुमानित ऋण राशि</Text>
          <Text style={styles.resultAmount}>{formatRupees(calculatedAmount)}</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep("products")}>
          <Text style={styles.secondaryBtnText}>Back / पीछे</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={calculateAmount}>
          <Text style={styles.primaryBtnText}>Calculate / गणना करें</Text>
        </TouchableOpacity>
      </View>

      {calculatedAmount > 0 && (
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12 }]} onPress={goToForm}>
          <Text style={styles.primaryBtnText}>Continue to Application / आवेदन जारी रखें</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── Render: Step 3 — Application Form ──────────────────────────

  const renderForm = () => (
    <View>
      <Text style={styles.sectionTitle}>Loan Application / ऋण आवेदन</Text>

      <Text style={styles.label}>Loan Amount / ऋण राशि (₹)</Text>
      <TextInput
        style={styles.textInput}
        keyboardType="numeric"
        placeholder="Enter amount"
        value={applyAmount}
        onChangeText={setApplyAmount}
      />

      <Text style={styles.label}>Tenure / अवधि (months)</Text>
      <View style={styles.tenureRow}>
        {TENURE_OPTIONS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tenureChip, tenure === t && styles.tenureChipActive]}
            onPress={() => setTenure(t)}
          >
            <Text style={[styles.tenureChipText, tenure === t && styles.tenureChipTextActive]}>
              {t} mo
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Intended Use / उपयोग का उद्देश्य</Text>
      <TextInput
        style={[styles.textInput, { height: 80, textAlignVertical: "top" }]}
        multiline
        placeholder="e.g., Purchase seeds and fertilizers / बीज और उर्वरक खरीदना"
        value={intendedUse}
        onChangeText={setIntendedUse}
      />

      <TouchableOpacity style={styles.consentRow} onPress={() => setConsent(!consent)}>
        <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
          {consent && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.consentText}>
          I agree to the terms and conditions and confirm that the information provided is accurate.
          {"\n"}मैं नियमों और शर्तों से सहमत हूँ।
        </Text>
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep("calculator")}>
          <Text style={styles.secondaryBtnText}>Back / पीछे</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={goToDocuments}>
          <Text style={styles.primaryBtnText}>Next: Documents / दस्तावेज़</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Render: Step 4 — Document Upload ───────────────────────────

  const renderDocuments = () => {
    const uploadedCount = documents.filter((d) => d.fileName).length;
    return (
      <View>
        <Text style={styles.sectionTitle}>Upload Documents / दस्तावेज़ अपलोड</Text>
        <Text style={styles.docsHelper}>
          Tap each card to capture/select. {uploadedCount} of {REQUIRED_DOCS.filter((d) => d.required).length} required uploaded.
        </Text>
        <Text style={styles.docsNote}>
          📷 Demo mode: tap "Upload" to mark a placeholder. In production this opens your camera/gallery.
        </Text>

        {documents.map((doc) => {
          const meta = REQUIRED_DOCS.find((d) => d.type === doc.type);
          const isUploaded = !!doc.fileName;
          return (
            <View
              key={doc.type}
              style={[styles.docCard, isUploaded && styles.docCardUploaded]}
            >
              <View style={styles.docHeader}>
                <Text style={styles.docIcon}>{isUploaded ? "✅" : "📄"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docLabel}>
                    {doc.label}
                    {meta?.required && <Text style={{ color: "#c62828" }}> *</Text>}
                  </Text>
                  {isUploaded ? (
                    <Text style={styles.docFileName}>{doc.fileName}</Text>
                  ) : (
                    <Text style={styles.docFileNameMuted}>Not uploaded yet</Text>
                  )}
                </View>
                {isUploaded ? (
                  <TouchableOpacity
                    style={styles.docRemoveBtn}
                    onPress={() => removeDocument(doc.type)}
                  >
                    <Text style={styles.docRemoveText}>Remove</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.docUploadBtn}
                    onPress={() => markDocumentUploaded(doc.type)}
                  >
                    <Text style={styles.docUploadText}>📷 Upload</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep("form")}>
            <Text style={styles.secondaryBtnText}>Back / पीछे</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={goToConfirm}>
            <Text style={styles.primaryBtnText}>Review / समीक्षा करें</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Render: Step 5 — Confirmation ──────────────────────────────

  const renderConfirm = () => (
    <View>
      <Text style={styles.sectionTitle}>Review Application / आवेदन की समीक्षा</Text>

      <View style={styles.card}>
        <Text style={styles.reviewLabel}>Product / उत्पाद</Text>
        <Text style={styles.reviewValue}>{selectedProduct?.name || "-"}</Text>

        <Text style={styles.reviewLabel}>Amount / राशि</Text>
        <Text style={styles.reviewValue}>{formatRupees(parseFloat(applyAmount))}</Text>

        <Text style={styles.reviewLabel}>Tenure / अवधि</Text>
        <Text style={styles.reviewValue}>{tenure} months</Text>

        {intendedUse ? (
          <>
            <Text style={styles.reviewLabel}>Intended Use / उद्देश्य</Text>
            <Text style={styles.reviewValue}>{intendedUse}</Text>
          </>
        ) : null}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep("documents")}>
          <Text style={styles.secondaryBtnText}>Edit / संपादित करें</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={submitApplication}>
          <Text style={styles.primaryBtnText}>Submit / जमा करें</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Render: Step 5 — Status Tracker ─────────────────────────────

  const renderStatus = () => {
    if (selectedApp) {
      const statusIdx = getStatusIndex(selectedApp.status);
      const amount = Number(
        selectedApp.approvalAmount ?? selectedApp.loanAmount ?? 0
      );
      const fmtTs = (ts: string) => {
        const d = new Date((ts || "").replace(" ", "T"));
        if (isNaN(d.getTime())) return ts || "—";
        return d.toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
      };
      return (
        <View>
          <Text style={styles.sectionTitle}>Application Status / आवेदन की स्थिति</Text>

          <View style={styles.card}>
            <Text style={styles.reviewLabel}>Application ID</Text>
            <Text style={styles.reviewValue}>
              #{selectedApp.applicationId}
              {selectedApp.applicationUuid ? `  ·  ${selectedApp.applicationUuid}` : ""}
            </Text>

            {selectedApp.productName ? (
              <>
                <Text style={styles.reviewLabel}>Product / उत्पाद</Text>
                <Text style={styles.reviewValue}>
                  {selectedApp.productName}
                  {selectedApp.providerName ? `  ·  ${selectedApp.providerName}` : ""}
                </Text>
              </>
            ) : null}

            <Text style={styles.reviewLabel}>Amount / राशि</Text>
            <Text style={styles.reviewValue}>{formatRupees(amount)}</Text>

            <Text style={styles.reviewLabel}>Tenure / अवधि</Text>
            <Text style={styles.reviewValue}>{selectedApp.tenureMonths ?? 12} months</Text>

            <Text style={styles.reviewLabel}>Current Status</Text>
            <Text style={styles.reviewValue}>
              {(selectedApp.status || "").replace(/_/g, " ").toUpperCase()}
            </Text>
          </View>

          {/* High-level 4-stage tracker */}
          <View style={styles.timeline}>
            {STATUS_TIMELINE.map((st, i) => (
              <View key={st.key} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      i <= statusIdx && styles.timelineDotActive,
                      i === statusIdx && styles.timelineDotCurrent,
                    ]}
                  />
                  {i < STATUS_TIMELINE.length - 1 && (
                    <View
                      style={[styles.timelineConnector, i < statusIdx && styles.timelineConnectorActive]}
                    />
                  )}
                </View>
                <Text
                  style={[styles.timelineLabel, i <= statusIdx && styles.timelineLabelActive]}
                >
                  {st.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Detailed LOS audit log from /dice/los/:id/status */}
          {losTimeline.length > 0 && (
            <View style={[styles.card, { marginTop: 12 }]}>
              <Text style={[styles.reviewLabel, { marginBottom: 8 }]}>
                LOS Audit Log / लेखा-परीक्षा
              </Text>
              {losTimeline.map((t, i) => (
                <View key={i} style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#1b5e20" }}>
                    {(t.fromStatus ? `${t.fromStatus} → ` : "")}{t.toStatus}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    {fmtTs(t.changedAt)}
                  </Text>
                  {t.remarks ? (
                    <Text style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                      {t.remarks}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.secondaryBtn, { marginTop: 16 }]}
            onPress={() => {
              setSelectedApp(null);
              setLosTimeline([]);
              loadApplications();
            }}
          >
            <Text style={styles.secondaryBtnText}>All Applications / सभी आवेदन</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>My Applications / मेरे आवेदन</Text>

        {applications.length === 0 && !loading && (
          <Text style={styles.emptyText}>No applications yet.{"\n"}अभी तक कोई आवेदन नहीं।</Text>
        )}

        {applications.map((app) => (
          <TouchableOpacity
            key={app.applicationUuid || app.applicationId}
            style={styles.card}
            onPress={() => openApplicationDetail(app.applicationId)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{app.productName || `Loan #${app.applicationId}`}</Text>
              <View style={[styles.badge, styles.badgeEligible]}>
                <Text style={styles.badgeText}>
                  {(app.status || "").replace(/_/g, " ").toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.metaText}>
              {formatRupees(Number(app.approvalAmount ?? app.loanAmount ?? 0))} | {app.tenureMonths || 12} months
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.secondaryBtn, { marginTop: 16 }]}
          onPress={() => setStep("products")}
        >
          <Text style={styles.secondaryBtnText}>New Application / नया आवेदन</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────

  const renderCurrentStep = () => {
    switch (step) {
      case "products":
        return renderProductSelection();
      case "calculator":
        return renderCalculator();
      case "form":
        return renderForm();
      case "documents":
        return renderDocuments();
      case "confirm":
        return renderConfirm();
      case "status":
        return renderStatus();
    }
  };

  return (
    <View style={styles.container}>
      {/* Nav chrome is provided by the root Stack layout in _layout.tsx */}
      {renderStepIndicator()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#1b5e20" />
            <Text style={styles.loadingText}>Loading... / लोड हो रहा है...</Text>
          </View>
        )}

        {renderCurrentStep()}
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  // NOTE: the in-body header / backBtn / headerTitle styles were deleted
  // when the root Stack layout took over the nav chrome. Do NOT re-add
  // them — any header a screen draws itself now stacks on top of the
  // Stack header and creates a visible duplicate bar.
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Step indicator
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: "#1b5e20",
  },
  stepCircleText: {
    color: "#999",
    fontWeight: "700",
    fontSize: 13,
  },
  stepCircleTextActive: {
    color: "#fff",
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: "#1b5e20",
  },

  // Section
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1b5e20",
    marginBottom: 12,
  },
  helperText: {
    fontSize: 13,
    color: "#555",
    marginBottom: 14,
    lineHeight: 19,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginVertical: 20,
  },

  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardSelected: {
    // Strong visual cue: thick green border + light green background
    // so the farmer can see at a glance which card is selected. The
    // old style was just a 2px border, which got lost on web at
    // moderate viewport sizes.
    borderWidth: 3,
    borderColor: "#1b5e20",
    backgroundColor: "#e8f5e9",
  },
  cardDisabled: {
    opacity: 0.55,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#212121",
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: "#555",
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaText: {
    fontSize: 12,
    color: "#777",
  },

  // Badges
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeEligible: {
    backgroundColor: "#e8f5e9",
  },
  badgeIneligible: {
    backgroundColor: "#ffebee",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1b5e20",
  },

  // Input calculator rows
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  inputInfo: {
    flex: 1,
    marginRight: 12,
  },
  inputName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  inputMeta: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  qtyInput: {
    width: 70,
    height: 40,
    borderWidth: 1,
    borderColor: "#c8e6c9",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 15,
    backgroundColor: "#f9fbe7",
  },

  // Result card
  resultCard: {
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginVertical: 14,
    borderWidth: 1,
    borderColor: "#a5d6a7",
  },
  resultLabel: {
    fontSize: 13,
    color: "#2e7d32",
    marginBottom: 4,
  },
  resultAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1b5e20",
  },

  // Form
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 14,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c8e6c9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#212121",
  },
  tenureRow: {
    flexDirection: "row",
    gap: 10,
  },
  tenureChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c8e6c9",
    alignItems: "center",
  },
  tenureChipActive: {
    backgroundColor: "#1b5e20",
    borderColor: "#1b5e20",
  },
  tenureChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  tenureChipTextActive: {
    color: "#fff",
  },

  // Consent
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 18,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: "#1b5e20",
    borderRadius: 4,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: "#1b5e20",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: "#444",
    lineHeight: 19,
  },

  // Review
  reviewLabel: {
    fontSize: 12,
    color: "#888",
    marginTop: 10,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
    marginTop: 2,
  },

  // Buttons
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#1b5e20",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1b5e20",
  },
  secondaryBtnText: {
    color: "#1b5e20",
    fontSize: 15,
    fontWeight: "700",
  },
  btnDisabled: {
    // Stronger disabled cue: more aggressive opacity (0.45 → 0.35)
    // and the not-allowed cursor on web so the farmer immediately
    // understands the button isn't clickable. Combined with the new
    // hint banner above the row, this kills the "I tapped Next and
    // nothing happened" failure mode entirely.
    opacity: 0.35,
    cursor: "not-allowed" as any,
  },

  // Hint banner shown above the Next button when no product is selected.
  // Amber palette so it reads as "this is what you need to do next"
  // rather than an error.
  hintBanner: {
    backgroundColor: "#fff8e1",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#7c5800",
  },
  hintBannerText: {
    fontSize: 13,
    color: "#7c5800",
    fontWeight: "700",
    lineHeight: 18,
  },

  // Timeline
  timeline: {
    marginTop: 20,
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 56,
  },
  timelineLeft: {
    alignItems: "center",
    width: 28,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ccc",
  },
  timelineDotActive: {
    backgroundColor: "#43a047",
  },
  timelineDotCurrent: {
    borderWidth: 3,
    borderColor: "#1b5e20",
    backgroundColor: "#a5d6a7",
  },
  timelineConnector: {
    width: 3,
    flex: 1,
    backgroundColor: "#ddd",
    minHeight: 30,
  },
  timelineConnectorActive: {
    backgroundColor: "#43a047",
  },
  timelineLabel: {
    fontSize: 14,
    color: "#999",
    marginLeft: 12,
    marginTop: -2,
  },
  timelineLabelActive: {
    color: "#1b5e20",
    fontWeight: "600",
  },

  // Loader
  loaderOverlay: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: "#777",
  },

  // Document upload step
  docsHelper: { fontSize: 13, color: "#666", marginBottom: 6 },
  docsNote: {
    fontSize: 11, color: "#e65100", backgroundColor: "#fff3e0",
    padding: 10, borderRadius: 8, marginBottom: 12, fontWeight: "600",
  },
  docCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#e0e0e0",
  },
  docCardUploaded: {
    backgroundColor: "#e8f5e9", borderColor: "#a5d6a7",
  },
  docHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  docIcon: { fontSize: 24 },
  docLabel: { fontSize: 13, fontWeight: "700", color: "#333" },
  docFileName: { fontSize: 11, color: "#1b5e20", marginTop: 2, fontWeight: "600" },
  docFileNameMuted: { fontSize: 11, color: "#999", marginTop: 2 },
  docUploadBtn: {
    backgroundColor: "#1b5e20", paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8,
  },
  docUploadText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  docRemoveBtn: {
    backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: "#c62828",
  },
  docRemoveText: { color: "#c62828", fontSize: 11, fontWeight: "800" },

  // Scale of Finance reference panel
  sofCard: {
    backgroundColor: "#e8f5e9", borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1.5, borderColor: "#a5d6a7",
  },
  sofHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  sofIcon: { fontSize: 22 },
  sofTitle: { fontSize: 13, fontWeight: "800", color: "#1b5e20" },
  sofSub: { fontSize: 10, color: "#4caf50", marginTop: 2, fontWeight: "600" },
  sofSeasonRow: { flexDirection: "row", gap: 6, marginTop: 4, marginBottom: 8, flexWrap: "wrap" },
  sofSeasonChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
    borderWidth: 1, borderColor: "#a5d6a7", backgroundColor: "#fff",
  },
  sofSeasonChipActive: { backgroundColor: "#1b5e20", borderColor: "#1b5e20" },
  sofSeasonText: { fontSize: 10, fontWeight: "800", color: "#1b5e20", letterSpacing: 0.5 },
  sofSeasonTextActive: { color: "#fff" },
  sofEmpty: { fontSize: 11, color: "#888", fontStyle: "italic", textAlign: "center", marginVertical: 8 },
  sofRow: {
    backgroundColor: "#fff", borderRadius: 8, padding: 10, marginTop: 6,
    borderWidth: 1, borderColor: "#c8e6c9",
  },
  sofName: { fontSize: 12, fontWeight: "700", color: "#333" },
  sofTotal: { fontSize: 16, fontWeight: "900", color: "#1b5e20", marginTop: 4 },
  sofUnit: { fontSize: 10, color: "#888", fontWeight: "600" },
  sofBenchmark: { fontSize: 10, color: "#666", marginTop: 4 },
  sofApprover: { fontSize: 9, color: "#999", marginTop: 2, fontStyle: "italic" },
});
