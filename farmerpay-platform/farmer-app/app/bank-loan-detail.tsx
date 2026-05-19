/**
 * Bank-Loan Detail — shows one bank-imported loan in full.
 *
 * Activates the `bank_loan_accounts` + `bank_data_entries` tables which
 * were previously only visible in the aggregated row on (tabs)/money.tsx.
 * Now tapping any bank-linked loan in the money tab routes here via
 *   /bank-loan-detail?id=<accountId>&source=bank
 * and the farmer sees sanction + rate + NPA + recent data-entry timeline.
 *
 * Data flow: GET /bank/loan-accounts/:accountId
 * Response: { success: true, data: BankLoanAccount with dataEntries[] }
 *
 * Tier-1 auth only. Bank-imported loans are strictly read-only from the
 * farmer side — any updates happen via /bank/portfolio/bulk-import on
 * the banker side.
 */

import React, { useCallback, useState } from "react";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { apiGet, formatRupees } from "../lib/api";

// ─── Types ───────────────────────────────────────────────────────

interface DataEntry {
  id: number;
  entry_type: string;
  entry_notes: string | null;
  entry_data: any;
  created_at: string;
}

interface BankLoanAccount {
  id: number;
  account_uuid: string;
  finacle_account_number: string;
  borrower_name: string | null;
  loan_type: string | null;
  scheme_name: string | null;
  scheme_code: string | null;
  sanction_amount: string | null;
  sanction_date: string | null;
  interest_rate: string | null;
  maturity_date: string | null;
  repayment_type: string | null;
  outstanding_amount: string | null;
  overdue_amount: string | null;
  days_past_due: number | null;
  gold_weight_grams: string | null;
  gold_purity_carat: string | null;
  gold_valuation_amount: string | null;
  sma_classification: string;
  psl_category: string | null;
  disbursement_mode: string | null;
  linkage_status: string;
  district: string | null;
  cohort_tag: string | null;
  data_as_of_date: string | null;
  dataEntries?: DataEntry[];
}

// ─── SMA classification chip ─────────────────────────────────────

const SMA_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  standard: { bg: "#e8f5e9", fg: "#2e7d32", label: "STANDARD" },
  sma_0:    { bg: "#fff8e1", fg: "#7c5800", label: "SMA-0" },
  sma_1:    { bg: "#fff3e0", fg: "#e65100", label: "SMA-1" },
  sma_2:    { bg: "#ffe0b2", fg: "#bf360c", label: "SMA-2" },
  npa:      { bg: "#fbe9e7", fg: "#c62828", label: "NPA" },
};

const ENTRY_LABEL: Record<string, string> = {
  repayment_update:   "💰 Repayment update",
  sma_update:         "⚠️ SMA status change",
  collateral_update:  "🏅 Collateral update",
  disbursement_event: "🏦 Disbursement",
  closure_event:      "✅ Closure",
  topup_event:        "➕ Top-up",
  general_note:       "📝 Note",
};

// ─── Helpers ──────────────────────────────────────────────────────

const num = (v: string | null | undefined): number => {
  if (!v) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const formatDate = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const maskAccount = (n: string) => {
  if (!n || n.length <= 4) return n;
  return "XXXX" + n.slice(-4);
};

const prettyLoanType = (t: string | null): string => {
  if (!t) return "Loan";
  return t.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
};

// ─── Component ────────────────────────────────────────────────────

export default function BankLoanDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const accountId = parseInt(params.id || "0", 10);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [account, setAccount] = useState<BankLoanAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accountId) {
      setError("No account id provided");
      setLoading(false);
      return;
    }
    try {
      const res = await apiGet(`/bank/loan-accounts/${accountId}`);
      const data: BankLoanAccount = res?.data || res;
      if (!data || !data.id) {
        setError("Account not found");
      } else {
        setAccount(data);
        setError(null);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load account");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accountId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  if (error || !account) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>🏦</Text>
        <Text style={styles.errorTitle}>{error || "Account not available"}</Text>
        <Text style={styles.errorSub}>Pull down to retry, or go back.</Text>
      </View>
    );
  }

  const sma = SMA_STYLE[account.sma_classification] || SMA_STYLE.standard;
  const isOverdue = (account.days_past_due || 0) > 0;
  const entries = account.dataEntries || [];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerEmoji}>🏦</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{prettyLoanType(account.loan_type)}</Text>
            <Text style={styles.headerSub}>
              {account.scheme_name || "—"}
              {account.district ? ` · ${account.district}` : ""}
            </Text>
          </View>
          <View style={[styles.smaBadge, { backgroundColor: sma.bg }]}>
            <Text style={[styles.smaBadgeText, { color: sma.fg }]}>{sma.label}</Text>
          </View>
        </View>
        <View style={styles.headerBottomRow}>
          <Text style={styles.accountNumber}>
            A/c {maskAccount(account.finacle_account_number)}
          </Text>
          {account.borrower_name ? (
            <Text style={styles.borrowerName}> · {account.borrower_name}</Text>
          ) : null}
        </View>
      </View>

      {/* ─── Summary grid ─── */}
      <Text style={styles.sectionHeader}>Loan summary</Text>
      <View style={styles.grid}>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>Sanction</Text>
          <Text style={styles.gridValue}>{formatRupees(num(account.sanction_amount))}</Text>
          <Text style={styles.gridSub}>{formatDate(account.sanction_date)}</Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>Outstanding</Text>
          <Text style={[styles.gridValue, { color: "#c62828" }]}>
            {formatRupees(num(account.outstanding_amount))}
          </Text>
          <Text style={styles.gridSub}>
            {account.data_as_of_date ? `as of ${formatDate(account.data_as_of_date)}` : "—"}
          </Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>Interest rate</Text>
          <Text style={styles.gridValue}>
            {account.interest_rate ? `${num(account.interest_rate).toFixed(2)}%` : "—"}
          </Text>
          <Text style={styles.gridSub}>
            {account.repayment_type === "emi" ? "EMI" : account.repayment_type === "bullet" ? "Bullet" : "—"}
          </Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>Maturity</Text>
          <Text style={styles.gridValue}>{formatDate(account.maturity_date)}</Text>
          <Text style={styles.gridSub}>{account.psl_category || "—"}</Text>
        </View>
      </View>

      {/* ─── Overdue banner (if any) ─── */}
      {isOverdue && (
        <View style={styles.overdueBanner}>
          <Text style={styles.overdueIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.overdueTitle}>
              {account.days_past_due} day{account.days_past_due === 1 ? "" : "s"} overdue
            </Text>
            <Text style={styles.overdueSub}>
              Overdue amount: {formatRupees(num(account.overdue_amount))}
            </Text>
          </View>
        </View>
      )}

      {/* ─── Gold collateral (only if present) ─── */}
      {num(account.gold_weight_grams) > 0 && (
        <>
          <Text style={styles.sectionHeader}>Gold collateral</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Weight</Text>
              <Text style={styles.rowValue}>{num(account.gold_weight_grams).toFixed(2)} g</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Purity</Text>
              <Text style={styles.rowValue}>
                {account.gold_purity_carat ? `${account.gold_purity_carat} carat` : "—"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Valuation</Text>
              <Text style={styles.rowValue}>
                {formatRupees(num(account.gold_valuation_amount))}
              </Text>
            </View>
          </View>
        </>
      )}

      {/* ─── Recent activity timeline ─── */}
      <Text style={styles.sectionHeader}>Recent activity</Text>
      {entries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptySub}>
            No bank-side updates recorded yet. This loan will update here
            whenever your bank files a repayment, SMA change, or note on
            this account.
          </Text>
        </View>
      ) : (
        entries.map((e) => (
          <View key={e.id} style={styles.timelineCard}>
            <View style={styles.timelineHeader}>
              <Text style={styles.timelineTitle}>
                {ENTRY_LABEL[e.entry_type] || e.entry_type}
              </Text>
              <Text style={styles.timelineDate}>{formatDate(e.created_at)}</Text>
            </View>
            {e.entry_notes ? (
              <Text style={styles.timelineNotes}>{e.entry_notes}</Text>
            ) : null}
          </View>
        ))
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f5f5f5" },

  errorEmoji: { fontSize: 42, marginBottom: 10 },
  errorTitle: { fontSize: 16, fontWeight: "800", color: "#333" },
  errorSub: { fontSize: 13, color: "#777", marginTop: 6, textAlign: "center" },

  header: {
    backgroundColor: "#1565c0",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  headerTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerEmoji: { fontSize: 26 },
  headerTitle: { fontSize: 16, fontWeight: "900", color: "#fff" },
  headerSub: { fontSize: 12, color: "#bbdefb", marginTop: 2, fontWeight: "600" },
  headerBottomRow: { flexDirection: "row", marginTop: 12, flexWrap: "wrap" },
  accountNumber: { fontSize: 12, color: "#e3f2fd", fontWeight: "700", letterSpacing: 0.5 },
  borrowerName: { fontSize: 12, color: "#bbdefb", fontWeight: "600" },

  smaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  smaBadgeText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },

  sectionHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: "#333",
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 6,
  },
  gridCell: {
    width: "47.5%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
  },
  gridLabel: { fontSize: 10, color: "#888", fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },
  gridValue: { fontSize: 16, fontWeight: "900", color: "#1b5e20", marginTop: 4 },
  gridSub: { fontSize: 11, color: "#888", marginTop: 3 },

  overdueBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fbe9e7",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#c62828",
  },
  overdueIcon: { fontSize: 22, marginRight: 10 },
  overdueTitle: { fontSize: 14, fontWeight: "800", color: "#c62828" },
  overdueSub: { fontSize: 12, color: "#6d4c41", marginTop: 2 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLabel: { fontSize: 13, color: "#555" },
  rowValue: { fontSize: 13, fontWeight: "800", color: "#222" },

  timelineCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#1565c0",
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineTitle: { fontSize: 13, fontWeight: "800", color: "#1565c0" },
  timelineDate: { fontSize: 11, color: "#888", fontWeight: "600" },
  timelineNotes: { fontSize: 12, color: "#555", marginTop: 6, lineHeight: 17 },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  emptySub: { fontSize: 12, color: "#777", lineHeight: 18 },
});
