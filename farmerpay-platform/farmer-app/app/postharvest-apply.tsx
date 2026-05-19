/**
 * Post-Harvest Top-Up Loan — apply wizard.
 *
 * Lets a farmer with stored produce apply for a short-tenure loan
 * hypothecated against the produce. The 2-3 day version of the
 * feature that activates FOUR previously dark DICE tables:
 *   - dice_postharvest_topup_loans
 *   - dice_warehouse_registries (read via warehouse-list.tsx picker)
 *   - dice_produce_hypothecation_logs (written on apply)
 *   - dice_price_realisation_snapshots (recommendedSellWindow)
 *
 * Flow:
 *   Step 1 — Pick commodity + grade + quantity (quintals)
 *   Step 2 — Pick warehouse (routes to warehouse-list?mode=picker)
 *            + enter warehouse receipt number
 *   Step 3 — Loan sizing: amount + tenure days (30/60/90/120/180)
 *   Step 4 — Submit → POST /dice/postharvest-topup/apply (Tier-2)
 *   Step 5 — Result screen with approved amount, LTV, effective
 *            rate, maturity date, AND the PULSE recommended sell
 *            window pulled straight from the apply response
 *
 * Parent-loan rule: the backend requires parentLoanApplicationId.
 * v1 auto-picks the farmer's most recent DISBURSED loan from
 * /dice/applications. If none exists, we show a blocker card.
 *
 * Tier-2 auth gated via isAadhaarVerified() on focus — same pattern
 * as (tabs)/loans.tsx.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { apiGet, apiDicePost, formatRupees, StepUpRequiredError } from "../lib/api";
import { isAadhaarVerified } from "../lib/aadhaarAuth";
import { consumeWarehousePick } from "../lib/pickerStore";

// ─── Types ───────────────────────────────────────────────────────

interface Commodity {
  commodityId: string;
  commodityName: string;
  commodityCode: string;
  type: string;
  unit: string;
}

interface LoanApplication {
  applicationId: number;
  status?: string;
  appliedAt?: string;
  productName?: string;
}

interface ApplyResult {
  topupId: number;
  topupUuid: string;
  status: string;
  maxEligible: number;
  approvedAmount: number;
  ltvApplied: number;
  effectiveRate: number;
  maturityDate: string;
  recommendedSellWindow: string;
}

const TENURE_OPTIONS = [30, 60, 90, 120, 180];
const GRADE_OPTIONS: Array<"A" | "B" | "C"> = ["A", "B", "C"];

// ─── Helpers ──────────────────────────────────────────────────────

const num = (s: string): number => {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const formatDate = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── Component ────────────────────────────────────────────────────

export default function PostharvestApplyScreen() {
  const router = useRouter();
  // useLocalSearchParams kept in the imports for any future deep-link
  // behaviour, but the warehouse pick is now handed back via
  // lib/pickerStore rather than URL params (router.back preserves
  // wizard state, router.replace with params would remount + reset).
  useLocalSearchParams();

  // Auth gate
  const [authChecked, setAuthChecked] = useState(false);

  // Prerequisites loading state
  const [prereqLoading, setPrereqLoading] = useState(true);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [parentLoan, setParentLoan] = useState<LoanApplication | null>(null);

  // Wizard step (1–5)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1 — commodity + quantity + grade
  const [commodityId, setCommodityId] = useState<string>("");
  const [quantityQtl, setQuantityQtl] = useState<string>("");
  const [grade, setGrade] = useState<"A" | "B" | "C">("B");

  // Step 2 — warehouse
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [warehouseName, setWarehouseName] = useState<string>("");
  const [receiptNumber, setReceiptNumber] = useState<string>("");

  // Step 3 — loan sizing
  const [loanAmount, setLoanAmount] = useState<string>("");
  const [tenureDays, setTenureDays] = useState<number>(90);

  // Step 4 — submission
  const [submitting, setSubmitting] = useState(false);

  // Step 5 — result
  const [result, setResult] = useState<ApplyResult | null>(null);

  // ── Tier-2 auth gate ──
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const verified = await isAadhaarVerified();
        if (!verified) {
          router.replace("/aadhaar-verify?returnTo=/postharvest-apply" as any);
          return;
        }
        setAuthChecked(true);
      })();
    }, [])
  );

  // ── Receive picked warehouse from warehouse-list?mode=picker ──
  // Runs on every focus (including when returning from the picker
  // via router.back), drains the module-level store, and hydrates
  // Step 2 state. useFocusEffect is the right hook here — useEffect
  // wouldn't fire again when the wizard is resumed from the stack.
  useFocusEffect(
    useCallback(() => {
      const picked = consumeWarehousePick();
      if (picked) {
        setWarehouseId(picked.warehouseId);
        setWarehouseName(picked.warehouseName);
      }
    }, [])
  );

  // ── Load commodities + parent loan ──
  useEffect(() => {
    if (!authChecked) return;
    (async () => {
      try {
        const [commRes, appsRes] = await Promise.all([
          apiGet("/pulse/commodities").catch(() => null),
          apiGet("/dice/applications").catch(() => null),
        ]);
        const commList: Commodity[] = Array.isArray(commRes?.data)
          ? commRes.data
          : Array.isArray(commRes?.data?.commodities)
            ? commRes.data.commodities
            : [];
        setCommodities(commList);

        // Find the farmer's most recent DISBURSED or ACTIVE application.
        // The post-harvest top-up attaches to an existing crop loan.
        const apps: LoanApplication[] = Array.isArray(appsRes?.data)
          ? appsRes.data
          : [];
        const eligible = apps
          .filter((a) => ["disbursed", "active", "approved"].includes((a.status || "").toLowerCase()))
          .sort((a, b) => {
            const tA = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
            const tB = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
            return tB - tA;
          });
        setParentLoan(eligible[0] || null);
      } catch {
        /* tolerate partial failures — validation kicks in at submit */
      } finally {
        setPrereqLoading(false);
      }
    })();
  }, [authChecked]);

  // ── Submit handler ──
  const handleSubmit = async () => {
    if (!parentLoan) {
      Alert.alert("No active crop loan", "You need an active crop loan before you can borrow against stored produce.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiDicePost("/dice/postharvest-topup/apply", {
        parentLoanApplicationId: parentLoan.applicationId,
        commodityId,
        produceQuantityQuintals: num(quantityQtl),
        produceGrade: grade,
        warehouseId,
        warehouseReceiptNumber: receiptNumber,
        requestedLoanAmount: num(loanAmount),
        requestedTenureDays: tenureDays,
      });
      const data: ApplyResult = res?.data || res;
      setResult(data);
      setStep(5);
    } catch (e: any) {
      if (e instanceof StepUpRequiredError) {
        router.replace("/aadhaar-verify?returnTo=/postharvest-apply" as any);
        return;
      }
      Alert.alert("Application failed", e?.message || "Please try again");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step validators ──
  const canProceedStep1 = !!commodityId && num(quantityQtl) > 0;
  const canProceedStep2 = warehouseId !== null && receiptNumber.trim().length > 0;
  const canProceedStep3 = num(loanAmount) > 0 && tenureDays >= 30 && tenureDays <= 180;

  // ── Auth / prereq loading ──
  if (!authChecked || prereqLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c5800" />
      </View>
    );
  }

  // ── Blocker: no active parent loan ──
  if (!parentLoan) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.blockerCard}>
          <Text style={styles.blockerEmoji}>🔒</Text>
          <Text style={styles.blockerTitle}>No active crop loan</Text>
          <Text style={styles.blockerSub}>
            Post-harvest top-up loans stack on top of an existing crop loan.
            Apply for your primary crop loan first, then return here after
            it's disbursed to borrow against your stored produce.
          </Text>
          <TouchableOpacity
            style={styles.blockerCta}
            onPress={() => router.replace("/loan-apply" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.blockerCtaText}>Apply for crop loan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── Result screen (step 5) ──
  if (step === 5 && result) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultEmoji}>✅</Text>
          <Text style={styles.resultTitle}>Application submitted</Text>
          <Text style={styles.resultSub}>Reference: {result.topupUuid.slice(0, 8).toUpperCase()}</Text>
        </View>

        {/* Approved amount card */}
        <View style={styles.approvedCard}>
          <Text style={styles.approvedLabel}>Approved loan amount</Text>
          <Text style={styles.approvedValue}>{formatRupees(result.approvedAmount)}</Text>
          <View style={styles.approvedDetails}>
            <View style={styles.approvedRow}>
              <Text style={styles.approvedRowLabel}>Max eligible</Text>
              <Text style={styles.approvedRowValue}>{formatRupees(result.maxEligible)}</Text>
            </View>
            <View style={styles.approvedRow}>
              <Text style={styles.approvedRowLabel}>LTV applied</Text>
              <Text style={styles.approvedRowValue}>{(result.ltvApplied * 100).toFixed(0)}%</Text>
            </View>
            <View style={styles.approvedRow}>
              <Text style={styles.approvedRowLabel}>Effective rate</Text>
              <Text style={styles.approvedRowValue}>{result.effectiveRate.toFixed(2)}% p.a.</Text>
            </View>
            <View style={styles.approvedRow}>
              <Text style={styles.approvedRowLabel}>Maturity</Text>
              <Text style={styles.approvedRowValue}>{formatDate(result.maturityDate)}</Text>
            </View>
          </View>
        </View>

        {/* PULSE recommendation card — the price realisation payoff */}
        <View style={styles.pulseCard}>
          <Text style={styles.pulseLabel}>📊 PULSE price recommendation</Text>
          <Text style={styles.pulseValue}>{result.recommendedSellWindow}</Text>
          <Text style={styles.pulseSub}>
            Based on the latest mandi forecast for your commodity. Sell at
            the recommended window to maximise realisation and auto-repay
            this top-up loan.
          </Text>
        </View>

        {/* Done CTA */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.replace("/(tabs)" as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>
    );
  }

  // ── Wizard body (steps 1–4) ──
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Step indicator */}
      <View style={styles.stepperRow}>
        {[1, 2, 3].map((n) => (
          <View
            key={n}
            style={[
              styles.stepperDot,
              step >= n ? styles.stepperDotActive : styles.stepperDotInactive,
            ]}
          >
            <Text
              style={[
                styles.stepperDotText,
                step >= n ? styles.stepperDotTextActive : styles.stepperDotTextInactive,
              ]}
            >
              {n}
            </Text>
          </View>
        ))}
      </View>

      {/* Parent loan anchor — visible on every step for context */}
      <View style={styles.parentLoanCard}>
        <Text style={styles.parentLoanLabel}>🔗 Linked to your crop loan</Text>
        <Text style={styles.parentLoanName}>
          {parentLoan.productName || `Application #${parentLoan.applicationId}`}
        </Text>
      </View>

      {/* ── Step 1: Commodity + grade + quantity ── */}
      {step === 1 && (
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>1. What did you store?</Text>
          <Text style={styles.stepSub}>
            Pick the commodity you've deposited in a warehouse, its quality
            grade, and the quantity in quintals.
          </Text>

          <Text style={styles.fieldLabel}>Commodity</Text>
          {commodities.length === 0 ? (
            <Text style={styles.errorText}>No commodities available. Try again later.</Text>
          ) : (
            <View style={styles.chipWrap}>
              {commodities.map((c) => {
                const selected = c.commodityId === commodityId;
                return (
                  <TouchableOpacity
                    key={c.commodityId}
                    style={[styles.optionChip, selected && styles.optionChipSelected]}
                    onPress={() => setCommodityId(c.commodityId)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>
                      {c.commodityName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={styles.fieldLabel}>Grade</Text>
          <View style={styles.chipWrap}>
            {GRADE_OPTIONS.map((g) => {
              const selected = g === grade;
              return (
                <TouchableOpacity
                  key={g}
                  style={[styles.optionChip, selected && styles.optionChipSelected]}
                  onPress={() => setGrade(g)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>
                    Grade {g}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Quantity (quintals)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 20"
            placeholderTextColor="#aaa"
            keyboardType="numeric"
            value={quantityQtl}
            onChangeText={setQuantityQtl}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, !canProceedStep1 && styles.primaryBtnDisabled]}
            onPress={() => setStep(2)}
            disabled={!canProceedStep1}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Step 2: Warehouse + receipt ── */}
      {step === 2 && (
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>2. Which warehouse?</Text>
          <Text style={styles.stepSub}>
            Pick an eNWR-enabled warehouse and enter the receipt number you
            received when you deposited the produce.
          </Text>

          <Text style={styles.fieldLabel}>Warehouse</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => router.push("/warehouse-list?mode=picker" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.pickerBtnText}>
              {warehouseName || "Tap to pick a warehouse →"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Warehouse receipt number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. WR-2026-00042"
            placeholderTextColor="#aaa"
            autoCapitalize="characters"
            value={receiptNumber}
            onChangeText={setReceiptNumber}
          />

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setStep(1)}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, !canProceedStep2 && styles.primaryBtnDisabled, { flex: 1 }]}
              onPress={() => setStep(3)}
              disabled={!canProceedStep2}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Step 3: Loan sizing ── */}
      {step === 3 && (
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>3. How much do you need?</Text>
          <Text style={styles.stepSub}>
            Your approved amount will depend on the current mandi price and
            the 70% LTV cap. You can request any amount — the system will
            cap it at the eligible maximum.
          </Text>

          <Text style={styles.fieldLabel}>Loan amount (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 40000"
            placeholderTextColor="#aaa"
            keyboardType="numeric"
            value={loanAmount}
            onChangeText={setLoanAmount}
          />

          <Text style={styles.fieldLabel}>Tenure (days)</Text>
          <View style={styles.chipWrap}>
            {TENURE_OPTIONS.map((t) => {
              const selected = t === tenureDays;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.optionChip, selected && styles.optionChipSelected]}
                  onPress={() => setTenureDays(t)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>
                    {t} days
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setStep(2)}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!canProceedStep3 || submitting) && styles.primaryBtnDisabled,
                { flex: 1 },
              ]}
              onPress={handleSubmit}
              disabled={!canProceedStep3 || submitting}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {submitting ? "Submitting…" : "Submit application"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },

  // Stepper
  stepperRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 14,
  },
  stepperDot: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: "center", alignItems: "center",
  },
  stepperDotActive: { backgroundColor: "#7c5800" },
  stepperDotInactive: { backgroundColor: "#e0e0e0" },
  stepperDotText: { fontSize: 14, fontWeight: "900" },
  stepperDotTextActive: { color: "#fff" },
  stepperDotTextInactive: { color: "#888" },

  // Parent loan card
  parentLoanCard: {
    backgroundColor: "#fff8e1",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#7c5800",
  },
  parentLoanLabel: {
    fontSize: 10, fontWeight: "800", color: "#7c5800",
    textTransform: "uppercase", letterSpacing: 0.3,
  },
  parentLoanName: { fontSize: 13, color: "#5d4037", marginTop: 3, fontWeight: "700" },

  // Step card
  stepCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  stepTitle: { fontSize: 18, fontWeight: "900", color: "#1b5e20" },
  stepSub: { fontSize: 12, color: "#666", marginTop: 6, lineHeight: 17 },
  fieldLabel: {
    fontSize: 11, fontWeight: "800", color: "#555",
    marginTop: 16, marginBottom: 8,
    textTransform: "uppercase", letterSpacing: 0.3,
  },

  // Option chips (grade, tenure, commodity)
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5, borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  optionChipSelected: {
    borderColor: "#7c5800",
    backgroundColor: "#fff8e1",
  },
  optionChipText: { fontSize: 13, fontWeight: "700", color: "#666" },
  optionChipTextSelected: { color: "#7c5800" },

  // Input
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#222",
    backgroundColor: "#fff",
  },

  // Warehouse picker button
  pickerBtn: {
    borderWidth: 1.5,
    borderColor: "#7c5800",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fff8e1",
  },
  pickerBtnText: { fontSize: 14, fontWeight: "700", color: "#7c5800" },

  // Buttons
  btnRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  primaryBtn: {
    backgroundColor: "#7c5800",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnDisabled: { backgroundColor: "#c9b99a" },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  secondaryBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    marginTop: 20,
    paddingHorizontal: 22,
  },
  secondaryBtnText: { color: "#666", fontSize: 14, fontWeight: "700" },

  errorText: { fontSize: 12, color: "#c62828", fontWeight: "700" },

  // Blocker (no active crop loan)
  blockerCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    marginTop: 40,
  },
  blockerEmoji: { fontSize: 48, marginBottom: 12 },
  blockerTitle: { fontSize: 18, fontWeight: "900", color: "#333" },
  blockerSub: {
    fontSize: 13, color: "#666",
    textAlign: "center", marginTop: 10, lineHeight: 19,
    marginBottom: 18,
  },
  blockerCta: {
    backgroundColor: "#2e7d32",
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  blockerCtaText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // Result screen
  resultHeader: { alignItems: "center", marginTop: 12, marginBottom: 20 },
  resultEmoji: { fontSize: 52 },
  resultTitle: { fontSize: 22, fontWeight: "900", color: "#1b5e20", marginTop: 8 },
  resultSub: { fontSize: 11, color: "#888", marginTop: 4, fontWeight: "700", letterSpacing: 0.5 },

  approvedCard: {
    backgroundColor: "#1b5e20",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
  },
  approvedLabel: {
    fontSize: 11, fontWeight: "800", color: "#a5d6a7",
    textTransform: "uppercase", letterSpacing: 0.3,
  },
  approvedValue: { fontSize: 32, fontWeight: "900", color: "#fff", marginTop: 4 },
  approvedDetails: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#2e7d32", paddingTop: 10 },
  approvedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  approvedRowLabel: { fontSize: 12, color: "#a5d6a7", fontWeight: "600" },
  approvedRowValue: { fontSize: 13, color: "#fff", fontWeight: "800" },

  pulseCard: {
    backgroundColor: "#e3f2fd",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: "#1565c0",
  },
  pulseLabel: { fontSize: 11, fontWeight: "800", color: "#1565c0", textTransform: "uppercase", letterSpacing: 0.3 },
  pulseValue: { fontSize: 18, fontWeight: "900", color: "#0d47a1", marginTop: 6 },
  pulseSub: { fontSize: 12, color: "#1565c0", marginTop: 8, lineHeight: 17 },

  doneBtn: {
    backgroundColor: "#2e7d32",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  doneBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
