/**
 * Repayments Screen
 *
 * Lists every disbursed loan for the farmer, lets them open one to see the
 * full EMI schedule, and record a payment against a specific instalment via
 * /dice/repayment (Tier-2, requires Aadhaar step-up).
 *
 * Data flow:
 *   1. /dice/applications → list of all loans (filter status === 'disbursed')
 *   2. Tap a loan → /dice/applications/:id → reads `repaymentSchedule` array
 *   3. Tap an EMI → modal → POST /dice/repayment with applicationId/scheduleId
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import {
  apiGet,
  apiDicePost,
  StepUpRequiredError,
  formatRupees,
} from "../lib/api";
import { isAadhaarVerified } from "../lib/aadhaarAuth";

// ─── Types ─────────────────────────────────────────────────────────

interface LoanSummary {
  applicationId: number;
  applicationUuid?: string;
  productName?: string;
  providerName?: string;
  loanAmount?: string | number;
  approvalAmount?: string | number | null;
  tenureMonths?: number;
  status?: string;
  // Pilot: unified loan feed (May 2026) may return bank-imported loans.
  // These come from `/dice/loans/me` with the richer shape.
  source?: "farmerpay" | "bank";
  bankName?: string | null;
  schemeName?: string | null;
  principalAmount?: string | number | null;
  outstandingAmount?: string | number | null;
  district?: string | null;
  daysPastDue?: number;
  nextEmi?: { scheduleNumber: number; dueDate: string; dueAmount: number; status: string } | null;
}

// Schedule rows come back from /dice/applications/:id in raw snake_case.
interface ScheduleRow {
  id: number;
  schedule_number: number;
  due_date: string;
  due_amount: string | number;
  principal_amount: string | number | null;
  interest_amount: string | number | null;
  is_paid: boolean | number;
  paid_date: string | null;
  paid_amount: string | number | null;
  days_overdue: number;
  status: "pending" | "paid" | "overdue" | "forgiven";
}

interface LoanDetail {
  id: number;
  application_uuid: string;
  application_status: string;
  approval_amount: string | number | null;
  approval_interest_rate: string | number | null;
  approval_tenure_months: number | null;
  apply_for_amount: string | number;
  product?: { product_name?: string; provider?: { provider_name?: string } };
  repaymentSchedule: ScheduleRow[];
}

// ─── Helpers ───────────────────────────────────────────────────────

const num = (v: string | number | null | undefined): number => {
  if (v == null) return 0;
  return typeof v === "number" ? v : parseFloat(v) || 0;
};

const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#fff3e0", fg: "#e65100" },
  paid: { bg: "#e8f5e9", fg: "#2e7d32" },
  overdue: { bg: "#fbe9e7", fg: "#c62828" },
  forgiven: { bg: "#eee", fg: "#666" },
};

// ─── Component ─────────────────────────────────────────────────────

export default function RepaymentsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<LoanDetail | null>(null);

  // Pay modal
  const [paySchedule, setPaySchedule] = useState<ScheduleRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"digital_wallet" | "bank_transfer" | "cash">("digital_wallet");
  const [payUtr, setPayUtr] = useState("");
  const [paying, setPaying] = useState(false);

  // ─── Loaders ─────────────────────────────────────────────────────

  const loadLoans = useCallback(async () => {
    try {
      // Pilot (WS6.3): unified loan feed returns BOTH FarmerPay-originated
      // loan applications and bank-imported loan accounts in a single
      // response, each row discriminated by `source: 'farmerpay' | 'bank'`.
      // For FarmerPay rows, keep the existing "disbursed/active" filter.
      // Bank rows are always shown — they represent real live liabilities
      // the farmer needs to see regardless of FarmerPay-side status.
      const res = await apiGet("/dice/loans/me");
      const list: LoanSummary[] = Array.isArray(res?.data?.loans) ? res.data.loans : [];
      setLoans(
        list.filter((l) => {
          if (l.source === "bank") return true;
          return ["disbursed", "active"].includes((l.status || "").toLowerCase());
        }),
      );
    } catch (e) {
      // Tier-1 only — no step-up needed for browsing
    }
  }, []);

  const openLoan = async (appId: number) => {
    setLoading(true);
    try {
      const res = await apiGet(`/dice/applications/${appId}`);
      const detail = res?.data || res;
      // Sort schedule ASC by instalment number — backend returns DESC.
      const sched: ScheduleRow[] = Array.isArray(detail?.repaymentSchedule)
        ? [...detail.repaymentSchedule].sort(
            (a, b) => (a.schedule_number || 0) - (b.schedule_number || 0),
          )
        : [];
      setSelectedLoan({ ...detail, repaymentSchedule: sched });
    } catch (e: any) {
      Alert.alert("Error", "Failed to load loan details.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await loadLoans();
        setLoading(false);
      })();
    }, [loadLoans]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedLoan) {
      await openLoan(selectedLoan.id);
    } else {
      await loadLoans();
    }
    setRefreshing(false);
  };

  // ─── Pay Modal Logic ─────────────────────────────────────────────

  const openPayModal = (s: ScheduleRow) => {
    setPaySchedule(s);
    setPayAmount(String(num(s.due_amount).toFixed(2)));
    setPayUtr("");
    setPayMethod("digital_wallet");
  };

  const closePayModal = () => {
    setPaySchedule(null);
    setPayAmount("");
    setPayUtr("");
  };

  const submitPayment = async () => {
    if (!paySchedule || !selectedLoan) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) {
      Alert.alert("Invalid", "Enter a valid payment amount.");
      return;
    }
    if (payMethod !== "cash" && !payUtr.trim()) {
      Alert.alert("UTR required", "Please enter the bank/UPI reference number.");
      return;
    }

    if (!(await isAadhaarVerified())) {
      router.push("/aadhaar-verify?returnTo=/repayments" as any);
      return;
    }

    setPaying(true);
    try {
      const res = await apiDicePost("/dice/repayment", {
        applicationId: selectedLoan.id,
        scheduleId: paySchedule.id,
        amount: amt,
        paymentMethod: payMethod,
        utrReference: payUtr.trim() || undefined,
      });
      if (res?.success === false) {
        Alert.alert("Failed", res.message || "Payment recording failed.");
        return;
      }
      Alert.alert(
        "Recorded",
        `Payment of ${formatRupees(amt)} recorded for instalment #${paySchedule.schedule_number}.`,
        [
          {
            text: "OK",
            onPress: async () => {
              closePayModal();
              await openLoan(selectedLoan.id);
            },
          },
        ],
      );
    } catch (e: any) {
      if (e instanceof StepUpRequiredError) {
        router.push("/aadhaar-verify?returnTo=/repayments" as any);
        return;
      }
      Alert.alert("Error", e?.message || "Failed to record payment.");
    } finally {
      setPaying(false);
    }
  };

  // ─── Renders ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1b5e20" />
      </View>
    );
  }

  // Detail view (single loan + schedule)
  if (selectedLoan) {
    const sched = selectedLoan.repaymentSchedule || [];
    const paidCount = sched.filter((s) => s.is_paid || s.status === "paid").length;
    const totalDue = sched.reduce((sum, s) => sum + num(s.due_amount), 0);
    const totalPaid = sched.reduce((sum, s) => sum + num(s.paid_amount), 0);
    const outstanding = totalDue - totalPaid;
    const productName =
      selectedLoan.product?.product_name || `Loan #${selectedLoan.id}`;
    const providerName = selectedLoan.product?.provider?.provider_name || "—";

    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Loan summary card */}
          <View style={styles.loanCard}>
            <Text style={styles.loanTitle}>{productName}</Text>
            <Text style={styles.loanProvider}>{providerName}</Text>
            <View style={styles.loanMetaRow}>
              <View>
                <Text style={styles.metaLabel}>Principal</Text>
                <Text style={styles.metaValue}>
                  {formatRupees(num(selectedLoan.approval_amount ?? selectedLoan.apply_for_amount))}
                </Text>
              </View>
              <View>
                <Text style={styles.metaLabel}>Rate</Text>
                <Text style={styles.metaValue}>
                  {num(selectedLoan.approval_interest_rate)}%
                </Text>
              </View>
              <View>
                <Text style={styles.metaLabel}>Tenure</Text>
                <Text style={styles.metaValue}>
                  {sched.length || selectedLoan.approval_tenure_months || "—"} mo
                </Text>
              </View>
            </View>
          </View>

          {/* Outstanding summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Paid</Text>
                <Text style={[styles.summaryValue, { color: "#2e7d32" }]}>
                  {paidCount}/{sched.length}
                </Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Outstanding</Text>
                <Text style={[styles.summaryValue, { color: "#e65100" }]}>
                  {formatRupees(outstanding)}
                </Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Total Paid</Text>
                <Text style={styles.summaryValue}>{formatRupees(totalPaid)}</Text>
              </View>
            </View>
          </View>

          {/* Schedule */}
          {sched.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No repayment schedule yet.{"\n"}अभी कोई किस्त सूची उपलब्ध नहीं।
              </Text>
            </View>
          ) : (
            sched.map((s) => {
              const sty = STATUS_COLORS[s.status] || STATUS_COLORS.pending;
              const isPaid = !!s.is_paid || s.status === "paid";
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.emiCard, isPaid && styles.emiCardPaid]}
                  onPress={() => !isPaid && openPayModal(s)}
                  activeOpacity={isPaid ? 1 : 0.7}
                  disabled={isPaid}
                >
                  <View style={styles.emiRow}>
                    <Text style={styles.emiNum}>#{s.schedule_number}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.emiAmount}>
                        {formatRupees(num(s.due_amount))}
                      </Text>
                      <Text style={styles.emiDate}>
                        Due {fmtDate(s.due_date)}
                      </Text>
                    </View>
                    <View
                      style={[styles.statusBadge, { backgroundColor: sty.bg }]}
                    >
                      <Text style={[styles.statusText, { color: sty.fg }]}>
                        {(s.status || "pending").toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.emiBreakdown}>
                    <Text style={styles.emiBreakLabel}>
                      Principal {formatRupees(num(s.principal_amount))}
                    </Text>
                    <Text style={styles.emiBreakLabel}>
                      Interest {formatRupees(num(s.interest_amount))}
                    </Text>
                    {isPaid && s.paid_date && (
                      <Text style={[styles.emiBreakLabel, { color: "#2e7d32" }]}>
                        Paid {fmtDate(s.paid_date)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Pay Modal */}
        <Modal
          visible={!!paySchedule}
          transparent
          animationType="slide"
          onRequestClose={closePayModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                Record Payment / भुगतान दर्ज करें
              </Text>
              <Text style={styles.modalSubtitle}>
                Instalment #{paySchedule?.schedule_number} · Due{" "}
                {fmtDate(paySchedule?.due_date)}
              </Text>

              <Text style={styles.label}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={payAmount}
                onChangeText={setPayAmount}
              />

              <Text style={styles.label}>Method</Text>
              <View style={styles.methodRow}>
                {(
                  [
                    { v: "digital_wallet", label: "UPI" },
                    { v: "bank_transfer", label: "NEFT" },
                    { v: "cash", label: "CASH" },
                  ] as const
                ).map((m) => (
                  <TouchableOpacity
                    key={m.v}
                    style={[
                      styles.methodChip,
                      payMethod === m.v && styles.methodChipActive,
                    ]}
                    onPress={() => setPayMethod(m.v)}
                  >
                    <Text
                      style={[
                        styles.methodChipText,
                        payMethod === m.v && styles.methodChipTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {payMethod !== "cash" && (
                <>
                  <Text style={styles.label}>UTR / Reference</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., UPI123456789"
                    value={payUtr}
                    onChangeText={setPayUtr}
                  />
                </>
              )}

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={closePayModal}
                  disabled={paying}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalPayBtn}
                  onPress={submitPayment}
                  disabled={paying}
                >
                  {paying ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalPayText}>Pay / भुगतान</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // List view (all disbursed loans)
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No active loans</Text>
            <Text style={styles.emptyText}>
              You don't have any disbursed loans to repay yet.{"\n"}अभी कोई वितरित ऋण नहीं है।
            </Text>
          </View>
        ) : (
          loans.map((l) => {
            const isBank = l.source === "bank";
            // Bank loans show scheme name and bank provider; FarmerPay loans
            // show product + provider. Bank loans prefer outstandingAmount;
            // FarmerPay loans prefer approvalAmount.
            const title = isBank
              ? (l.schemeName || l.productName || `Bank loan #${l.applicationId}`)
              : (l.productName || `Loan #${l.applicationId}`);
            const provider = isBank
              ? (l.bankName ? `${l.bankName}${l.district ? ` · ${l.district}` : ""}` : "Bank")
              : (l.providerName || "—");
            const headlineAmount = isBank
              ? num(l.outstandingAmount)
              : num(l.approvalAmount ?? l.loanAmount);
            const amountLabel = isBank ? "Outstanding" : "Amount";
            return (
              <TouchableOpacity
                key={`${l.source || "fp"}-${l.applicationUuid || l.applicationId}`}
                style={[styles.loanCard, isBank && { borderLeftWidth: 4, borderLeftColor: "#1565c0" }]}
                onPress={() => {
                  if (isBank) {
                    // Bank loans don't have a detail endpoint yet — show
                    // the info we already have inline. v1 pilot scope.
                    Alert.alert(
                      title,
                      `Bank: ${l.bankName || "—"}\n${l.district ? `District: ${l.district}\n` : ""}Outstanding: ${formatRupees(num(l.outstandingAmount))}${l.nextEmi ? `\nNext EMI: ${formatRupees(l.nextEmi.dueAmount)} due ${l.nextEmi.dueDate}` : ""}${l.daysPastDue ? `\nDays past due: ${l.daysPastDue}` : ""}`,
                    );
                  } else {
                    openLoan(l.applicationId);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.loanTitle}>{title}</Text>
                  {isBank && (
                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#1565c0", backgroundColor: "#e3f2fd", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      🏦 bank-linked
                    </Text>
                  )}
                </View>
                <Text style={styles.loanProvider}>{provider}</Text>
                <View style={styles.loanMetaRow}>
                  <View>
                    <Text style={styles.metaLabel}>{amountLabel}</Text>
                    <Text style={styles.metaValue}>{formatRupees(headlineAmount)}</Text>
                  </View>
                  {l.nextEmi ? (
                    <View>
                      <Text style={styles.metaLabel}>Next EMI</Text>
                      <Text style={[styles.metaValue, { color: "#7c5800" }]}>
                        {formatRupees(l.nextEmi.dueAmount)}
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.metaLabel}>Tenure</Text>
                      <Text style={styles.metaValue}>{l.tenureMonths || "—"} mo</Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.metaLabel}>Status</Text>
                    <Text
                      style={[
                        styles.metaValue,
                        { color: "#2e7d32", textTransform: "uppercase" },
                      ]}
                    >
                      {l.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.tapHint}>
                  {isBank ? "Tap to see bank loan info" : "Tap to view EMI schedule →"}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Uniform page background (matches every other farmer-app screen).
  // Was previously #f1f8e9 (pale green), replaced with #f5f5f5 for
  // consistency with the persona home + Money tab + setup screens.
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  // NOTE: the in-body header / backBtn / headerTitle styles were deleted
  // when the root Stack layout took over the nav chrome. Do NOT re-add
  // them — any header a screen draws itself now stacks on top of the
  // Stack header and creates a visible duplicate bar.

  loanCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  loanTitle: { fontSize: 16, fontWeight: "800", color: "#1b5e20" },
  loanProvider: { fontSize: 12, color: "#888", marginTop: 2, fontWeight: "600" },
  loanMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  metaLabel: {
    fontSize: 10,
    color: "#888",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metaValue: { fontSize: 14, fontWeight: "800", color: "#333", marginTop: 2 },
  tapHint: { fontSize: 11, color: "#1565c0", marginTop: 10, fontWeight: "600" },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCell: {
    flex: 1,
    backgroundColor: "#f1f8e9",
    borderRadius: 8,
    padding: 10,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#888",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1b5e20",
    marginTop: 4,
  },

  emiCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#e65100",
  },
  emiCardPaid: {
    borderLeftColor: "#2e7d32",
    opacity: 0.85,
  },
  emiRow: { flexDirection: "row", alignItems: "center" },
  emiNum: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1b5e20",
    width: 36,
  },
  emiAmount: { fontSize: 16, fontWeight: "800", color: "#333" },
  emiDate: { fontSize: 11, color: "#888", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.3 },
  emiBreakdown: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
    paddingLeft: 48,
  },
  emiBreakLabel: { fontSize: 11, color: "#666" },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    marginTop: 6,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#333" },
  emptyText: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

  // Pay Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1b5e20" },
  modalSubtitle: { fontSize: 13, color: "#666", marginTop: 4, marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    marginTop: 12,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  methodRow: { flexDirection: "row", gap: 8 },
  methodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  methodChipActive: { backgroundColor: "#1b5e20", borderColor: "#1b5e20" },
  methodChipText: { fontSize: 12, fontWeight: "800", color: "#666" },
  methodChipTextActive: { color: "#fff" },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 22 },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#eee",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  modalCancelText: { color: "#666", fontWeight: "700" },
  modalPayBtn: {
    flex: 2,
    backgroundColor: "#1b5e20",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  modalPayText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
