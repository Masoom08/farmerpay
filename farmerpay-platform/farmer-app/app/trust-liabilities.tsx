/**
 * TRUST Liabilities Screen
 *
 * Shows every existing loan a farmer has — formal (KCC, NBFC) and informal
 * (moneylender, SHG, relatives) — with running outstanding, EMI burden, and
 * repayment discipline. Drives the leverage calculator (L5).
 *
 *   GET    /trust/liabilities                          (list + summary)
 *   POST   /trust/liabilities                          (add new)
 *   DELETE /trust/liabilities/:uuid                    (remove)
 *   GET    /trust/liabilities/:uuid/repayments         (list)
 *   POST   /trust/liabilities/:uuid/repayments         (log payment)
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { apiGet, apiPost, formatRupees } from "../lib/api";

const GREEN_DARK = "#1b5e20";
const GREEN_MID = "#2e7d32";
const GREEN_PALE = "#e8f5e9";
const RED = "#c62828";
const ORANGE = "#e65100";

const LENDER_TYPES = [
  { key: "BANK", label: "Bank" },
  { key: "NBFC", label: "NBFC" },
  { key: "MFI", label: "Microfinance" },
  { key: "COOP", label: "Cooperative" },
  { key: "SHG", label: "SHG" },
  { key: "MONEYLENDER", label: "Moneylender" },
  { key: "RELATIVE", label: "Relative/Friend" },
  { key: "FPO", label: "FPO" },
  { key: "GOVT_SCHEME", label: "Govt Scheme" },
  { key: "OTHER", label: "Other" },
];

const LOAN_PURPOSES = [
  { key: "KCC", label: "KCC" },
  { key: "CROP", label: "Crop" },
  { key: "DAIRY", label: "Dairy" },
  { key: "FISHERY", label: "Fishery" },
  { key: "GOLD", label: "Gold" },
  { key: "PERSONAL", label: "Personal" },
  { key: "HOUSING", label: "Housing" },
  { key: "BUSINESS", label: "Business" },
  { key: "CONSUMER", label: "Consumer" },
  { key: "OTHER", label: "Other" },
];

interface Liability {
  loanUuid: string;
  lenderType: string;
  lenderName: string | null;
  loanPurpose: string;
  principalInr: number;
  outstandingInr: number;
  interestRatePct: number | null;
  emiInr: number | null;
  emiFrequency: string;
  status: string;
  isSecured: boolean;
}

interface Summary {
  activeCount: number;
  totalCount: number;
  totalOutstandingInr: number;
  totalEmiInr: number;
  byLenderType: Record<string, number>;
  repaymentDiscipline: {
    onTime: number;
    late: number;
    missed: number;
    onTimeRate: number | null;
  };
}

interface Repayment {
  repaymentUuid: string;
  installmentNumber: number | null;
  dueDate: string;
  dueAmountInr: number;
  paidDate: string | null;
  paidAmountInr: number | null;
  status: string;
  daysLate: number | null;
}

export default function TrustLiabilitiesScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  // Add-loan modal
  const [addOpen, setAddOpen] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [form, setForm] = useState({
    lenderType: "BANK",
    lenderName: "",
    loanPurpose: "KCC",
    principalInr: "",
    outstandingInr: "",
    interestRatePct: "",
    emiInr: "",
  });

  // Repayment-log modal
  const [repayOpen, setRepayOpen] = useState(false);
  const [repayLoan, setRepayLoan] = useState<Liability | null>(null);
  const [savingRepay, setSavingRepay] = useState(false);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [repayForm, setRepayForm] = useState({
    dueDate: "",
    dueAmountInr: "",
    paidDate: "",
    paidAmountInr: "",
  });

  // ─── Loaders ─────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const r = await apiGet("/trust/liabilities");
      if (r?.success && r?.data) {
        setLiabilities(r.data.liabilities || []);
        setSummary(r.data.summary || null);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load loans");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // ─── Add loan ────────────────────────────────────────────────────

  const submitAdd = async () => {
    if (!form.principalInr) {
      Alert.alert("Missing", "Please enter principal amount.");
      return;
    }
    setSavingAdd(true);
    try {
      const body: any = {
        lenderType: form.lenderType,
        loanPurpose: form.loanPurpose,
        principalInr: parseFloat(form.principalInr),
      };
      if (form.lenderName.trim()) body.lenderName = form.lenderName.trim();
      if (form.outstandingInr) body.outstandingInr = parseFloat(form.outstandingInr);
      if (form.interestRatePct) body.interestRatePct = parseFloat(form.interestRatePct);
      if (form.emiInr) body.emiInr = parseFloat(form.emiInr);

      const r = await apiPost("/trust/liabilities", body);
      if (r?.success) {
        setAddOpen(false);
        setForm({
          lenderType: "BANK",
          lenderName: "",
          loanPurpose: "KCC",
          principalInr: "",
          outstandingInr: "",
          interestRatePct: "",
          emiInr: "",
        });
        await load();
      } else {
        Alert.alert("Error", r?.message || "Failed to add loan");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to add loan");
    } finally {
      setSavingAdd(false);
    }
  };

  // ─── Open repayment view ─────────────────────────────────────────

  const openRepayments = async (loan: Liability) => {
    setRepayLoan(loan);
    setRepayOpen(true);
    setRepayments([]);
    setRepayForm({
      dueDate: new Date().toISOString().slice(0, 10),
      dueAmountInr: loan.emiInr ? String(loan.emiInr) : "",
      paidDate: new Date().toISOString().slice(0, 10),
      paidAmountInr: loan.emiInr ? String(loan.emiInr) : "",
    });
    try {
      const r = await apiGet(`/trust/liabilities/${loan.loanUuid}/repayments`);
      if (r?.success) setRepayments(r.data || []);
    } catch (e: any) {
      // non-fatal
    }
  };

  const submitRepayment = async () => {
    if (!repayLoan) return;
    if (!repayForm.dueDate || !repayForm.dueAmountInr) {
      Alert.alert("Missing", "Due date and due amount are required.");
      return;
    }
    setSavingRepay(true);
    try {
      const body: any = {
        dueDate: repayForm.dueDate,
        dueAmountInr: parseFloat(repayForm.dueAmountInr),
      };
      if (repayForm.paidDate) body.paidDate = repayForm.paidDate;
      if (repayForm.paidAmountInr) body.paidAmountInr = parseFloat(repayForm.paidAmountInr);

      const r = await apiPost(
        `/trust/liabilities/${repayLoan.loanUuid}/repayments`,
        body,
      );
      if (r?.success) {
        // refresh both lists
        const [l, rl] = await Promise.all([
          apiGet("/trust/liabilities"),
          apiGet(`/trust/liabilities/${repayLoan.loanUuid}/repayments`),
        ]);
        if (l?.success) {
          setLiabilities(l.data.liabilities || []);
          setSummary(l.data.summary || null);
        }
        if (rl?.success) setRepayments(rl.data || []);
      } else {
        Alert.alert("Error", r?.message || "Failed to log repayment");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to log repayment");
    } finally {
      setSavingRepay(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN_MID} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={styles.h1}>Your Loans</Text>
      <Text style={styles.sub}>
        Tell us every loan you have — KCC, microfinance, gold, moneylender. Honest
        numbers help us match you with cheaper options.
      </Text>

      {/* Summary card */}
      {summary && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Active loans</Text>
              <Text style={styles.summaryValue}>{summary.activeCount}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Outstanding</Text>
              <Text style={styles.summaryValue}>
                {formatRupees(summary.totalOutstandingInr)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Monthly EMI</Text>
              <Text style={styles.summaryValue}>
                {formatRupees(summary.totalEmiInr)}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>On-time rate</Text>
              <Text
                style={[
                  styles.summaryValue,
                  summary.repaymentDiscipline.onTimeRate != null && {
                    color:
                      summary.repaymentDiscipline.onTimeRate >= 90
                        ? GREEN_MID
                        : summary.repaymentDiscipline.onTimeRate >= 60
                          ? ORANGE
                          : RED,
                  },
                ]}
              >
                {summary.repaymentDiscipline.onTimeRate != null
                  ? `${summary.repaymentDiscipline.onTimeRate}%`
                  : "—"}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Add loan button */}
      <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
        <Text style={styles.addBtnText}>＋ Add a loan</Text>
      </TouchableOpacity>

      {/* Loan list */}
      <Text style={styles.h2}>Active Loans</Text>
      {liabilities.length === 0 ? (
        <Text style={styles.empty}>No loans recorded yet.</Text>
      ) : (
        liabilities.map((l) => (
          <TouchableOpacity
            key={l.loanUuid}
            style={styles.loanCard}
            onPress={() => openRepayments(l)}
            activeOpacity={0.85}
          >
            <View style={styles.loanRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.loanLender}>
                  {l.lenderName || l.lenderType}
                </Text>
                <Text style={styles.loanMeta}>
                  {l.loanPurpose} • {l.lenderType}
                  {l.interestRatePct ? ` • ${l.interestRatePct}%` : ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.loanAmount}>{formatRupees(l.outstandingInr)}</Text>
                <Text style={styles.loanMeta}>outstanding</Text>
              </View>
            </View>
            {l.emiInr ? (
              <Text style={styles.loanEmi}>
                EMI: {formatRupees(l.emiInr)} {l.emiFrequency.toLowerCase()}
              </Text>
            ) : null}
          </TouchableOpacity>
        ))
      )}

      <View style={{ height: 32 }} />

      {/* ─── Add Loan Modal ──────────────────────────────────────── */}
      <Modal visible={addOpen} animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => setAddOpen(false)} style={styles.back}>
            <Text style={styles.backText}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.h1}>Add Loan</Text>

          <Text style={styles.fieldLabel}>Lender type</Text>
          <View style={styles.pillRow}>
            {LENDER_TYPES.map((lt) => (
              <TouchableOpacity
                key={lt.key}
                style={[styles.pill, form.lenderType === lt.key && styles.pillOn]}
                onPress={() => setForm({ ...form, lenderType: lt.key })}
              >
                <Text
                  style={[
                    styles.pillText,
                    form.lenderType === lt.key && styles.pillTextOn,
                  ]}
                >
                  {lt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Lender name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. State Bank of India"
            value={form.lenderName}
            onChangeText={(t) => setForm({ ...form, lenderName: t })}
          />

          <Text style={styles.fieldLabel}>Loan purpose</Text>
          <View style={styles.pillRow}>
            {LOAN_PURPOSES.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.pill, form.loanPurpose === p.key && styles.pillOn]}
                onPress={() => setForm({ ...form, loanPurpose: p.key })}
              >
                <Text
                  style={[
                    styles.pillText,
                    form.loanPurpose === p.key && styles.pillTextOn,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Principal amount (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 150000"
            value={form.principalInr}
            onChangeText={(t) => setForm({ ...form, principalInr: t })}
          />

          <Text style={styles.fieldLabel}>Outstanding amount (₹) — defaults to principal</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="optional"
            value={form.outstandingInr}
            onChangeText={(t) => setForm({ ...form, outstandingInr: t })}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Interest %</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="e.g. 7.5"
                value={form.interestRatePct}
                onChangeText={(t) => setForm({ ...form, interestRatePct: t })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>EMI (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="e.g. 4700"
                value={form.emiInr}
                onChangeText={(t) => setForm({ ...form, emiInr: t })}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, savingAdd && { opacity: 0.6 }]}
            disabled={savingAdd}
            onPress={submitAdd}
          >
            <Text style={styles.saveBtnText}>{savingAdd ? "Saving..." : "Save Loan"}</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>

      {/* ─── Repayment Log Modal ─────────────────────────────────── */}
      <Modal visible={repayOpen} animationType="slide" onRequestClose={() => setRepayOpen(false)}>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => setRepayOpen(false)} style={styles.back}>
            <Text style={styles.backText}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.h1}>{repayLoan?.lenderName || repayLoan?.lenderType}</Text>
          <Text style={styles.sub}>
            Outstanding: {formatRupees(repayLoan?.outstandingInr || 0)}
          </Text>

          <Text style={styles.h2}>Log a Payment</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Due date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={repayForm.dueDate}
                onChangeText={(t) => setRepayForm({ ...repayForm, dueDate: t })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Due (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={repayForm.dueAmountInr}
                onChangeText={(t) => setRepayForm({ ...repayForm, dueAmountInr: t })}
              />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Paid date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={repayForm.paidDate}
                onChangeText={(t) => setRepayForm({ ...repayForm, paidDate: t })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Paid (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={repayForm.paidAmountInr}
                onChangeText={(t) => setRepayForm({ ...repayForm, paidAmountInr: t })}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, savingRepay && { opacity: 0.6 }]}
            disabled={savingRepay}
            onPress={submitRepayment}
          >
            <Text style={styles.saveBtnText}>
              {savingRepay ? "Saving..." : "Log Payment"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.h2}>Payment History</Text>
          {repayments.length === 0 ? (
            <Text style={styles.empty}>No payments logged yet.</Text>
          ) : (
            repayments.map((r) => {
              const color =
                r.status === "PAID_ONTIME"
                  ? GREEN_MID
                  : r.status === "PAID_LATE" || r.status === "PARTIAL"
                    ? ORANGE
                    : r.status === "MISSED"
                      ? RED
                      : "#999";
              return (
                <View key={r.repaymentUuid} style={styles.repayRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.repayDate}>Due {r.dueDate}</Text>
                    <Text style={styles.repayMeta}>
                      {formatRupees(r.dueAmountInr)}
                      {r.paidDate ? ` • paid ${r.paidDate}` : ""}
                      {r.daysLate ? ` • ${r.daysLate}d late` : ""}
                    </Text>
                  </View>
                  <Text style={[styles.repayStatus, { color }]}>
                    {r.status.replace("_", " ")}
                  </Text>
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  modalScroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },

  back: { marginBottom: 12 },
  backText: { color: GREEN_MID, fontWeight: "700", fontSize: 15 },

  h1: { fontSize: 22, fontWeight: "900", color: GREEN_DARK },
  h2: { fontSize: 15, fontWeight: "700", color: "#333", marginTop: 18, marginBottom: 10 },
  sub: { fontSize: 13, color: "#666", marginBottom: 14, marginTop: 4, lineHeight: 18 },
  empty: { color: "#999", marginTop: 8, fontStyle: "italic", textAlign: "center" },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  summaryCell: {
    flex: 1,
    backgroundColor: GREEN_PALE,
    padding: 12,
    borderRadius: 10,
  },
  summaryLabel: { fontSize: 11, color: "#666", fontWeight: "600", textTransform: "uppercase" },
  summaryValue: { fontSize: 18, fontWeight: "900", color: GREEN_DARK, marginTop: 4 },

  addBtn: {
    backgroundColor: GREEN_DARK,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  loanCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  loanRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  loanLender: { fontSize: 15, fontWeight: "800", color: "#333" },
  loanMeta: { fontSize: 11, color: "#888", marginTop: 2 },
  loanAmount: { fontSize: 16, fontWeight: "900", color: GREEN_DARK },
  loanEmi: { fontSize: 12, color: "#666", marginTop: 8 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#666",
    marginTop: 12,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    fontSize: 14,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  pillOn: { backgroundColor: GREEN_DARK, borderColor: GREEN_DARK },
  pillText: { fontSize: 12, color: "#666", fontWeight: "600" },
  pillTextOn: { color: "#fff" },

  saveBtn: {
    backgroundColor: GREEN_MID,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
  },
  saveBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  repayRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  repayDate: { fontSize: 13, fontWeight: "700", color: "#333" },
  repayMeta: { fontSize: 11, color: "#888", marginTop: 2 },
  repayStatus: { fontSize: 11, fontWeight: "800" },
});
