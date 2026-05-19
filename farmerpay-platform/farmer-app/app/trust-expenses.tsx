/**
 * TRUST Expenses Screen
 *
 * Once-a-month form to capture household expense breakdown by category.
 * Pre-loads the current month if it's already been saved (so editing works).
 * Shows recent history + 3-month average. Surfaces monthly nudge state.
 *
 *   GET  /trust/expenses                 (list of past months)
 *   GET  /trust/expenses/current         (current month or null)
 *   GET  /trust/expenses/summary         (averages + current state)
 *   POST /trust/expenses                 (upsert)
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
} from "react-native";
import { useRouter } from "expo-router";
import { apiGet, apiPost, formatRupees } from "../lib/api";

const GREEN_DARK = "#1b5e20";
const GREEN_MID = "#2e7d32";
const GREEN_PALE = "#e8f5e9";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CATEGORIES: Array<{ key: keyof FormState; label: string; emoji: string }> = [
  { key: "foodInr", label: "Food & groceries", emoji: "🍚" },
  { key: "educationInr", label: "Children's education", emoji: "📚" },
  { key: "healthInr", label: "Health & medicine", emoji: "🏥" },
  { key: "utilitiesInr", label: "Electricity, water, gas", emoji: "💡" },
  { key: "transportInr", label: "Transport & fuel", emoji: "🛺" },
  { key: "rentInr", label: "Rent", emoji: "🏠" },
  { key: "farmInputsInr", label: "Farm inputs (seeds, feed)", emoji: "🌾" },
  { key: "loanEmiInr", label: "Loan EMIs", emoji: "🏦" },
  { key: "savingsInr", label: "Savings / chits", emoji: "🪙" },
  { key: "otherInr", label: "Other", emoji: "📦" },
];

interface FormState {
  foodInr: string;
  educationInr: string;
  healthInr: string;
  utilitiesInr: string;
  transportInr: string;
  rentInr: string;
  farmInputsInr: string;
  loanEmiInr: string;
  savingsInr: string;
  otherInr: string;
}

interface Expense {
  expenseUuid: string;
  referenceYear: number;
  referenceMonth: number;
  totalInr: number;
}

interface Summary {
  monthsLogged: number;
  avgLast3MonthsInr: number;
  avgLast6MonthsInr: number;
  currentMonth: { year: number; month: number; logged: boolean };
}

const blankForm = (): FormState => ({
  foodInr: "",
  educationInr: "",
  healthInr: "",
  utilitiesInr: "",
  transportInr: "",
  rentInr: "",
  farmInputsInr: "",
  loanEmiInr: "",
  savingsInr: "",
  otherInr: "",
});

export default function TrustExpensesScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm());
  const [history, setHistory] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const total = CATEGORIES.reduce(
    (s, c) => s + (parseFloat(form[c.key] || "0") || 0),
    0,
  );

  const load = useCallback(async () => {
    try {
      const [cur, list, sum] = await Promise.all([
        apiGet("/trust/expenses/current"),
        apiGet("/trust/expenses?limit=12"),
        apiGet("/trust/expenses/summary"),
      ]);
      if (cur?.success && cur.data) {
        const d = cur.data;
        setForm({
          foodInr: String(d.foodInr || ""),
          educationInr: String(d.educationInr || ""),
          healthInr: String(d.healthInr || ""),
          utilitiesInr: String(d.utilitiesInr || ""),
          transportInr: String(d.transportInr || ""),
          rentInr: String(d.rentInr || ""),
          farmInputsInr: String(d.farmInputsInr || ""),
          loanEmiInr: String(d.loanEmiInr || ""),
          savingsInr: String(d.savingsInr || ""),
          otherInr: String(d.otherInr || ""),
        });
      }
      if (list?.success) setHistory(list.data || []);
      if (sum?.success) setSummary(sum.data || null);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load expenses");
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

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (total <= 0) {
      Alert.alert("Empty", "Please enter at least one expense.");
      return;
    }
    setSaving(true);
    try {
      const body: any = {};
      for (const c of CATEGORIES) {
        const v = parseFloat(form[c.key] || "0") || 0;
        if (v > 0) body[c.key] = v;
      }
      const r = await apiPost("/trust/expenses", body);
      if (r?.success) {
        Alert.alert("Saved", `This month's total: ${formatRupees(total)}`);
        await load();
      } else {
        Alert.alert("Error", r?.message || "Failed to save");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN_MID} />
      </View>
    );
  }

  const now = new Date();
  const currentLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  const alreadyLogged = summary?.currentMonth.logged;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={styles.h1}>Monthly Expenses</Text>
      <Text style={styles.sub}>
        Once a month, log how much your household spent. Honest numbers help us
        compute how much credit you can really afford.
      </Text>

      {/* Status / nudge banner */}
      <View
        style={[
          styles.banner,
          { backgroundColor: alreadyLogged ? GREEN_PALE : "#fff8e1" },
        ]}
      >
        <Text style={styles.bannerTitle}>{currentLabel}</Text>
        <Text style={styles.bannerSub}>
          {alreadyLogged
            ? "✓ This month is logged. You can edit anytime."
            : "Pending — please fill in to keep your TRUST current."}
        </Text>
      </View>

      {/* Summary */}
      {summary && summary.monthsLogged > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Months logged</Text>
            <Text style={styles.summaryValue}>{summary.monthsLogged}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>3-mo avg</Text>
            <Text style={styles.summaryValue}>
              {formatRupees(summary.avgLast3MonthsInr)}
            </Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>6-mo avg</Text>
            <Text style={styles.summaryValue}>
              {formatRupees(summary.avgLast6MonthsInr)}
            </Text>
          </View>
        </View>
      )}

      {/* Category form */}
      <Text style={styles.h2}>Enter {currentLabel}</Text>
      {CATEGORIES.map((c) => (
        <View key={c.key} style={styles.row}>
          <Text style={styles.rowEmoji}>{c.emoji}</Text>
          <Text style={styles.rowLabel}>{c.label}</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0"
              value={form[c.key]}
              onChangeText={(t) => setField(c.key, t)}
            />
          </View>
        </View>
      ))}

      {/* Live total */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total this month</Text>
        <Text style={styles.totalValue}>{formatRupees(total)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        disabled={saving}
        onPress={save}
      >
        <Text style={styles.saveBtnText}>
          {saving ? "Saving..." : alreadyLogged ? "Update" : "Save"}
        </Text>
      </TouchableOpacity>

      {/* History */}
      {history.length > 0 && (
        <>
          <Text style={styles.h2}>Past months</Text>
          {history.map((h) => (
            <View key={h.expenseUuid} style={styles.histRow}>
              <Text style={styles.histLabel}>
                {MONTH_NAMES[h.referenceMonth - 1]} {h.referenceYear}
              </Text>
              <Text style={styles.histAmount}>{formatRupees(h.totalInr)}</Text>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },

  back: { marginBottom: 12 },
  backText: { color: GREEN_MID, fontWeight: "700", fontSize: 15 },

  h1: { fontSize: 22, fontWeight: "900", color: GREEN_DARK },
  h2: { fontSize: 15, fontWeight: "700", color: "#333", marginTop: 18, marginBottom: 10 },
  sub: { fontSize: 13, color: "#666", marginBottom: 14, marginTop: 4, lineHeight: 18 },

  banner: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  bannerTitle: { fontSize: 14, fontWeight: "800", color: GREEN_DARK },
  bannerSub: { fontSize: 12, color: "#666", marginTop: 4 },

  summaryCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 6,
  },
  summaryCell: {
    flex: 1,
    backgroundColor: GREEN_PALE,
    padding: 10,
    borderRadius: 8,
  },
  summaryLabel: { fontSize: 10, color: "#666", fontWeight: "700", textTransform: "uppercase" },
  summaryValue: { fontSize: 15, fontWeight: "900", color: GREEN_DARK, marginTop: 4 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  rowEmoji: { fontSize: 20 },
  rowLabel: { flex: 1, fontSize: 13, color: "#333", fontWeight: "600" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 8,
    width: 110,
    backgroundColor: "#fafafa",
  },
  rupee: { color: "#888", marginRight: 4, fontSize: 13 },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: "right",
  },

  totalCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: GREEN_DARK,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  totalLabel: { color: "#a5d6a7", fontSize: 13, fontWeight: "700" },
  totalValue: { color: "#fff", fontSize: 22, fontWeight: "900" },

  saveBtn: {
    backgroundColor: GREEN_MID,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  saveBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  histRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  histLabel: { fontSize: 13, color: "#333", fontWeight: "600" },
  histAmount: { fontSize: 14, fontWeight: "800", color: GREEN_DARK },
});
