/**
 * TRUST Leverage Screen — "How much can I borrow?"
 *
 * The L5 capstone screen. Shows the farmer ONE number (their additional EMI
 * capacity) and a fan of "what-if" loan offers across reference products
 * (KCC, crop, dairy, gold, etc.) so they can see realistic borrowing options.
 *
 *   GET /trust/leverage
 *
 * Designed to be honest: when data is missing, we show a "complete these
 * inputs to unlock" panel instead of a fake number.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { apiGet, formatRupees } from "../lib/api";

const GREEN_DARK = "#1b5e20";
const GREEN_MID = "#2e7d32";
const GREEN_PALE = "#e8f5e9";
const AMBER = "#f9a825";
const RED = "#c62828";

interface Offer {
  purpose: string;
  label: string;
  interestRatePct: number;
  tenureMonths: number;
  monthlyEmiInr: number;
  maxPrincipalInr: number;
  ceilingHit: boolean;
  notes?: string;
  priority: number;
}

interface Leverage {
  monthlyIncomeInr: number;
  monthlyExpensesInr: number;
  monthlyDebtServiceInr: number;
  disposableIncomeInr: number;
  foirCeilingPct: number;
  existingObligationRatioPct: number;
  additionalEmiCapacityInr: number;
  rawEmiCapacityInr: number;
  disciplineMultiplier: number;
  discipline: { onTime: number; late: number; missed: number; onTimeRate: number | null };
  band: string;
  offers: Offer[];
  dataQuality: {
    hasIncome: boolean;
    hasExpenses: boolean;
    hasDebtSnapshot: boolean;
    hasRepaymentHistory: boolean;
    monthsOfExpenseHistory: number;
  };
  missingInputs: string[];
  readinessLabel: "READY" | "PARTIAL" | "INSUFFICIENT_DATA";
  computedAt: string;
}

const bandColor = (band: string) => {
  switch (band) {
    case "excellent": return GREEN_DARK;
    case "good": return GREEN_MID;
    case "fair": return AMBER;
    default: return RED;
  }
};

const readinessColor = (label: string) => {
  if (label === "READY") return GREEN_MID;
  if (label === "PARTIAL") return AMBER;
  return RED;
};

export default function TrustLeverageScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leverage, setLeverage] = useState<Leverage | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiGet("/trust/leverage");
      if (r?.success) setLeverage(r.data);
      else Alert.alert("Error", r?.message || "Failed to load");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load leverage");
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN_MID} />
      </View>
    );
  }

  if (!leverage) {
    return (
      <View style={styles.center}>
        <Text>No leverage data</Text>
      </View>
    );
  }

  const lv = leverage;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={styles.h1}>How much can I borrow?</Text>
      <Text style={styles.sub}>
        Based on your income, expenses, existing loans, repayment history and
        TRUST band — here's what you can responsibly take on right now.
      </Text>

      {/* Hero card — the ONE number */}
      <View style={[styles.hero, { backgroundColor: bandColor(lv.band) }]}>
        <Text style={styles.heroLabel}>You can comfortably afford a NEW EMI of</Text>
        <Text style={styles.heroValue}>{formatRupees(lv.additionalEmiCapacityInr)}/mo</Text>
        <View style={styles.heroBadgeRow}>
          <View style={[styles.pill, { backgroundColor: readinessColor(lv.readinessLabel) }]}>
            <Text style={styles.pillText}>{lv.readinessLabel}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>TRUST: {lv.band.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Cash-flow breakdown */}
      <Text style={styles.h2}>Your monthly cash-flow</Text>
      <View style={styles.cfCard}>
        <Row label="Income" value={formatRupees(lv.monthlyIncomeInr)} positive />
        <Row label="− Expenses" value={formatRupees(lv.monthlyExpensesInr)} />
        <Row label="− Existing EMI" value={formatRupees(lv.monthlyDebtServiceInr)} />
        <View style={styles.divider} />
        <Row label="Disposable" value={formatRupees(lv.disposableIncomeInr)} bold />
      </View>

      {/* FOIR explainer */}
      <View style={styles.foirCard}>
        <Text style={styles.foirTitle}>Why this number?</Text>
        <Text style={styles.foirBody}>
          Banks cap your TOTAL debt EMIs at <Text style={styles.bold}>{lv.foirCeilingPct}%</Text> of
          your income (this is called "FOIR" — adjusted for your TRUST band).
          You're already using <Text style={styles.bold}>{lv.existingObligationRatioPct}%</Text>.
        </Text>
        {lv.discipline.onTimeRate != null && (
          <Text style={styles.foirBody}>
            Your repayment record (<Text style={styles.bold}>{lv.discipline.onTimeRate}%</Text> on-time)
            applies a <Text style={styles.bold}>×{lv.disciplineMultiplier.toFixed(2)}</Text> adjustment.
          </Text>
        )}
      </View>

      {/* Missing-input nudge */}
      {lv.missingInputs.length > 0 && (
        <View style={styles.missingCard}>
          <Text style={styles.missingTitle}>Unlock a higher number</Text>
          <Text style={styles.missingBody}>
            We're missing: <Text style={styles.bold}>{lv.missingInputs.join(", ")}</Text>.
            Adding these will give you a more accurate (and usually higher) capacity.
          </Text>
          <View style={styles.missingBtns}>
            {!lv.dataQuality.hasIncome && (
              <TouchableOpacity
                style={styles.missingBtn}
                onPress={() => router.push("/trust-activities")}
              >
                <Text style={styles.missingBtnText}>+ Add income</Text>
              </TouchableOpacity>
            )}
            {!lv.dataQuality.hasExpenses && (
              <TouchableOpacity
                style={styles.missingBtn}
                onPress={() => router.push("/trust-expenses")}
              >
                <Text style={styles.missingBtnText}>+ Add expenses</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Reference offers fan */}
      <Text style={styles.h2}>What that means in real loans</Text>
      <Text style={styles.subTight}>
        Based on your ₹{lv.additionalEmiCapacityInr.toLocaleString("en-IN")}/mo capacity,
        here's the principal you could borrow under each loan type:
      </Text>

      {lv.offers.map((o) => (
        <View key={o.purpose} style={styles.offerCard}>
          <View style={styles.offerHead}>
            <Text style={styles.offerLabel}>{o.label}</Text>
            <Text style={[styles.offerAmt, { color: bandColor(lv.band) }]}>
              {formatRupees(o.maxPrincipalInr)}
            </Text>
          </View>
          <Text style={styles.offerMeta}>
            {o.interestRatePct}% • {o.tenureMonths} months
            {o.ceilingHit && " • product cap reached"}
          </Text>
          {o.notes && <Text style={styles.offerNotes}>{o.notes}</Text>}
        </View>
      ))}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          These are reference numbers only — actual approval depends on the
          lender's own checks (KYC, land records, bank statements). FarmerPay
          uses RBI / NABARD priority-sector benchmarks as of 2026.
        </Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const Row = ({
  label, value, positive, bold,
}: { label: string; value: string; positive?: boolean; bold?: boolean }) => (
  <View style={styles.cfRow}>
    <Text style={[styles.cfLabel, bold && { fontWeight: "900", color: "#000" }]}>{label}</Text>
    <Text
      style={[
        styles.cfValue,
        positive && { color: GREEN_DARK },
        bold && { fontWeight: "900", fontSize: 17 },
      ]}
    >
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },

  back: { marginBottom: 12 },
  backText: { color: GREEN_MID, fontWeight: "700", fontSize: 15 },

  h1: { fontSize: 22, fontWeight: "900", color: GREEN_DARK },
  h2: { fontSize: 15, fontWeight: "800", color: "#333", marginTop: 18, marginBottom: 8 },
  sub: { fontSize: 13, color: "#666", marginBottom: 14, marginTop: 4, lineHeight: 18 },
  subTight: { fontSize: 12, color: "#666", marginBottom: 10, lineHeight: 17 },

  hero: {
    borderRadius: 16,
    padding: 20,
    marginTop: 6,
    alignItems: "center",
  },
  heroLabel: { color: "#e8f5e9", fontSize: 13, fontWeight: "700", textAlign: "center" },
  heroValue: { color: "#fff", fontSize: 32, fontWeight: "900", marginTop: 8 },
  heroBadgeRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  pill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },

  cfCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
  },
  cfRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  cfLabel: { fontSize: 13, color: "#555", fontWeight: "600" },
  cfValue: { fontSize: 14, color: "#333", fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 4 },

  foirCard: {
    backgroundColor: GREEN_PALE,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  foirTitle: { fontSize: 13, fontWeight: "800", color: GREEN_DARK, marginBottom: 6 },
  foirBody: { fontSize: 12, color: "#444", lineHeight: 18, marginBottom: 4 },
  bold: { fontWeight: "900", color: GREEN_DARK },

  missingCard: {
    backgroundColor: "#fff8e1",
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ffe082",
  },
  missingTitle: { fontSize: 13, fontWeight: "900", color: "#e65100" },
  missingBody: { fontSize: 12, color: "#5d4037", lineHeight: 18, marginTop: 4 },
  missingBtns: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  missingBtn: {
    backgroundColor: "#f57c00",
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8,
  },
  missingBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  offerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  offerHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  offerLabel: { fontSize: 14, fontWeight: "800", color: "#333", flex: 1 },
  offerAmt: { fontSize: 17, fontWeight: "900" },
  offerMeta: { fontSize: 11, color: "#888", fontWeight: "600", marginTop: 4 },
  offerNotes: { fontSize: 11, color: "#666", marginTop: 6, fontStyle: "italic", lineHeight: 15 },

  disclaimer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  disclaimerText: { fontSize: 10, color: "#777", lineHeight: 15, fontStyle: "italic" },
});
