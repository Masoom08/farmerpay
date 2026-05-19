/**
 * My Borrowing Sources — unified view of formal + informal debt.
 *
 * Cards grouped by category (formal / informal) with color-coded left
 * borders. Summary strip at bottom shows total debt breakdown.
 * Entry points: Home tile, Money tab link, More menu.
 */

import React, { useCallback, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { apiGet, apiPut, formatRupees } from "../lib/api";

// ─── Display helpers ────────────────────────────────────────────

const SOURCE_EMOJI: Record<string, string> = {
  public_sector_bank: "🏦", private_bank: "🏦", rrb: "🏦", cooperative_bank: "🏦",
  sfb: "🏦", nbfc: "🏦", pacs: "🏛", fpo: "🏘", shg: "👥", mfi: "🏦",
  family_friends: "👨‍👩‍👧", money_lender: "💰", adathiya: "🏪",
  input_seller_credit: "🏪", landlord: "🏠", other: "📋",
};

const SOURCE_LABEL: Record<string, string> = {
  public_sector_bank: "Public Bank", private_bank: "Private Bank",
  rrb: "RRB", cooperative_bank: "Co-op Bank", sfb: "Small Finance Bank",
  nbfc: "NBFC", pacs: "PACS", fpo: "FPO", shg: "SHG", mfi: "MFI",
  family_friends: "Family / Friends", money_lender: "Money Lender",
  adathiya: "Adathiya", input_seller_credit: "Input Seller Credit",
  landlord: "Landlord", other: "Other",
};

const LOAN_LABEL: Record<string, string> = {
  kcc_crop: "KCC Crop", kcc_allied: "KCC Allied", kcc_consumption: "KCC Consumption",
  crop_loan: "Crop Loan", dairy_loan: "Dairy Loan", livestock_loan: "Livestock",
  fisheries_loan: "Fisheries", horticulture_loan: "Horticulture",
  animal_husbandry: "Animal Husbandry", farm_mechanization: "Farm Mechanization",
  irrigation: "Irrigation", land_development: "Land Development",
  agri_processing: "Agri Processing", warehouse_receipt: "Warehouse Receipt",
  input_loan: "Input Loan", agri_infrastructure: "Agri Infra",
  agri_gold: "Agri Gold", kcc_gold: "KCC Gold", allied_gold: "Allied Gold",
  consumption_gold: "Consumption Gold", gold_general: "Gold Loan",
  jlg: "JLG", shg_group_loan: "SHG Group", mudra_shishu: "MUDRA Shishu",
  mudra_kishore: "MUDRA Kishore", mudra_tarun: "MUDRA Tarun",
  personal: "Personal", other: "Other",
};

const STATUS_DOT: Record<string, string> = {
  active: "🟢", partially_paid: "🟡", overdue: "🔴", restructured: "🟠", fully_paid: "⚪",
};

interface BorrowingSource {
  id: number;
  borrowing_uuid: string;
  source_category: "formal" | "informal";
  source_type: string;
  source_name: string | null;
  loan_type: string | null;
  outstanding_amount: number | null;
  borrowed_amount: number | null;
  sanction_amount: number | null;
  interest_rate_pct: number | null;
  interest_period: string | null;
  repayment_status: string;
  member_id: string | null;
  pacs_code: string | null;
  collateral_type: string | null;
  lender_name: string | null;
}

interface Summary {
  formal: { count: number; totalOutstanding: number };
  informal: { count: number; totalOutstanding: number };
  total: { count: number; totalOutstanding: number };
}

export default function BorrowingSources() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sources, setSources] = useState<BorrowingSource[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = useCallback(async () => {
    try {
      const [srcRes, sumRes] = await Promise.all([
        apiGet("/farmer/borrowing-sources").catch(() => null),
        apiGet("/farmer/borrowing-summary").catch(() => null),
      ]);
      setSources(srcRes?.data?.sources || []);
      setSummary(sumRes?.data?.summary || null);
    } catch { /* tolerate */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const formal = sources.filter(s => s.source_category === "formal");
  const informal = sources.filter(s => s.source_category === "informal");

  const borderColor = (s: BorrowingSource) => {
    if (s.source_category === "informal") return "#e65100";
    if (["pacs", "fpo", "shg"].includes(s.source_type)) return "#00695c";
    return "#2e7d32";
  };

  const renderCard = (s: BorrowingSource) => {
    const emoji = SOURCE_EMOJI[s.source_type] || "📋";
    const typeLabel = SOURCE_LABEL[s.source_type] || s.source_type;
    const loanLabel = s.loan_type ? LOAN_LABEL[s.loan_type] || s.loan_type : null;
    const amount = s.outstanding_amount || s.borrowed_amount || s.sanction_amount || 0;
    const dot = STATUS_DOT[s.repayment_status] || "⚪";

    const editRoute = s.source_category === "formal"
      ? `/add-formal-borrowing?id=${s.id}`
      : `/add-informal-borrowing?id=${s.id}`;

    return (
      <TouchableOpacity
        key={s.id}
        style={[styles.card, { borderLeftColor: borderColor(s) }]}
        onPress={() => router.push(editRoute as any)}
        activeOpacity={0.85}
      >
        <View style={styles.cardRow}>
          <Text style={styles.cardEmoji}>{emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {s.source_name || typeLabel}
            </Text>
            <Text style={styles.cardSub}>
              {loanLabel ? `${loanLabel} · ` : ""}
              {formatRupees(amount)}
              {s.interest_rate_pct ? ` · ${s.interest_rate_pct}%${s.interest_period === "monthly" ? "/mo" : "/yr"}` : ""}
            </Text>
            {s.member_id && <Text style={styles.cardMeta}>Member: {s.member_id}</Text>}
            {s.collateral_type && s.collateral_type !== "none" && (
              <Text style={styles.cardMeta}>Against: {s.collateral_type.replace(/_/g, " ")}</Text>
            )}
          </View>
          <Text style={styles.statusDot}>{dot}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2e7d32" /></View>;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Formal section */}
      <Text style={styles.sectionHeader}>Formal borrowing</Text>
      {formal.length === 0 ? (
        <View style={[styles.card, { alignItems: "center", padding: 20 }]}>
          <Text style={styles.emptyText}>No formal borrowing added yet</Text>
          <Text style={styles.emptyHint}>Add your bank loans, PACS, FPO, SHG accounts</Text>
        </View>
      ) : (
        formal.map(renderCard)
      )}

      {/* Informal section */}
      <Text style={styles.sectionHeader}>Informal borrowing</Text>
      {informal.length === 0 ? (
        <View style={[styles.card, { alignItems: "center", padding: 20 }]}>
          <Text style={styles.emptyText}>No informal borrowing added</Text>
          <Text style={styles.emptyHint}>Family, money lender, adathiya, input credit</Text>
        </View>
      ) : (
        informal.map(renderCard)
      )}

      {/* Summary */}
      {summary && summary.total.count > 0 && (
        <>
          <Text style={styles.sectionHeader}>Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Formal ({summary.formal.count})</Text>
              <Text style={[styles.summaryValue, { color: "#2e7d32" }]}>
                {formatRupees(summary.formal.totalOutstanding)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Informal ({summary.informal.count})</Text>
              <Text style={[styles.summaryValue, { color: "#e65100" }]}>
                {formatRupees(summary.informal.totalOutstanding)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { fontWeight: "800" }]}>Total</Text>
              <Text style={[styles.summaryValue, { color: "#c62828", fontSize: 16 }]}>
                {formatRupees(summary.total.totalOutstanding)}
              </Text>
            </View>
          </View>
        </>
      )}

      {/* Add buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: "#e8f5e9", borderColor: "#2e7d32" }]}
          onPress={() => router.push("/add-formal-borrowing" as any)}
          activeOpacity={0.85}
        >
          <Text style={[styles.addBtnText, { color: "#2e7d32" }]}>+ Add Formal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: "#fff3e0", borderColor: "#e65100" }]}
          onPress={() => router.push("/add-informal-borrowing" as any)}
          activeOpacity={0.85}
        >
          <Text style={[styles.addBtnText, { color: "#e65100" }]}>+ Add Informal</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },

  sectionHeader: { fontSize: 14, fontWeight: "700", color: "#333", marginBottom: 8, marginLeft: 4, marginTop: 12 },

  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: "#2e7d32",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardEmoji: { fontSize: 28 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#333" },
  cardSub: { fontSize: 12, color: "#555", marginTop: 2 },
  cardMeta: { fontSize: 11, color: "#888", marginTop: 2 },
  statusDot: { fontSize: 16 },

  emptyText: { fontSize: 13, color: "#888", marginBottom: 4 },
  emptyHint: { fontSize: 11, color: "#bbb" },

  summaryCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  summaryLabel: { fontSize: 13, color: "#555" },
  summaryValue: { fontSize: 14, fontWeight: "800", color: "#222" },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 2 },

  btnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  addBtn: {
    flex: 1, borderRadius: 12, borderWidth: 1.5, paddingVertical: 14, alignItems: "center",
  },
  addBtnText: { fontSize: 14, fontWeight: "700" },
});
