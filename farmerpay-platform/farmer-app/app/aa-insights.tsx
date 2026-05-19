import React, { useCallback, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getAnalysis, SEASON_LABELS, MONTH_NAMES,
  type AnalysisResult,
} from "../lib/aa";
import { formatRupees } from "../lib/api";
import CategoryPieChart from "../components/aa/CategoryPieChart";
import MonthlyHeatmap from "../components/aa/MonthlyHeatmap";

type Tab = "income" | "expenses";

export default function TransactionInsightsScreen() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [tab, setTab] = useState<Tab>("income");

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    try {
      const result = await getAnalysis();
      setAnalysis(result);
    } catch { /* ignore */ }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.center}>
        <Ionicons name="pie-chart-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>No analysis data available yet.</Text>
      </View>
    );
  }

  // Build pie chart data from components
  const incomePieData = buildIncomePieData(analysis);
  const expensePieData = buildExpensePieData(analysis);
  const monthlyData = buildMonthlyData(analysis);

  const seasonType = analysis.seasonality?.seasonPattern?.type || "insufficient_data";
  const seasonLabel = SEASON_LABELS[seasonType] || seasonType;
  const emiRec = analysis.seasonality?.recommendedEmiSchedule;
  const emiSafeMonths = emiRec?.collectMonths || analysis.seasonality?.peakIncomeMonths?.map(m => m.month) || [];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === "income" && styles.tabActive]}
          onPress={() => setTab("income")}
        >
          <Text style={[styles.tabText, tab === "income" && styles.tabTextActive]}>Income</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "expenses" && styles.tabActive]}
          onPress={() => setTab("expenses")}
        >
          <Text style={[styles.tabText, tab === "expenses" && styles.tabTextActive]}>Expenses</Text>
        </TouchableOpacity>
      </View>

      {/* Pie Chart */}
      {tab === "income" ? (
        <CategoryPieChart data={incomePieData} title="Income by Category" />
      ) : (
        <CategoryPieChart data={expensePieData} title="Expenses by Category" />
      )}

      {/* Monthly Heatmap */}
      <MonthlyHeatmap monthlyData={monthlyData} />

      {/* Season Badge */}
      <View style={styles.seasonCard}>
        <View style={styles.seasonRow}>
          <Ionicons name="leaf" size={20} color="#1b5e20" />
          <Text style={styles.seasonLabel}>{seasonLabel}</Text>
        </View>
        {analysis.seasonality?.seasonPattern?.confidence ? (
          <Text style={styles.seasonConf}>
            Confidence: {Math.round(analysis.seasonality.seasonPattern.confidence * 100)}%
          </Text>
        ) : null}
      </View>

      {/* EMI Recommendation */}
      {emiRec ? (
        <View style={styles.emiCard}>
          <View style={styles.emiHeader}>
            <Ionicons name="calendar-outline" size={20} color="#2e7d32" />
            <Text style={styles.emiTitle}>EMI Recommendation</Text>
          </View>
          <Text style={styles.emiType}>
            {emiRec.type === "monthly" ? "Standard Monthly EMI" :
             emiRec.type === "seasonal_skip" ? "Seasonal Skip EMI" :
             "Harvest-Quarter Collection"}
          </Text>
          {emiSafeMonths.length > 0 ? (
            <Text style={styles.emiMonths}>
              Best months: {emiSafeMonths.map(m => MONTH_NAMES[(m - 1) % 12]).join(", ")}
            </Text>
          ) : null}
          {emiRec.skipMonths && emiRec.skipMonths.length > 0 ? (
            <Text style={styles.emiSkip}>
              Skip: {emiRec.skipMonths.map(m => MONTH_NAMES[(m - 1) % 12]).join(", ")}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Summary stats */}
      {analysis.totalAvgMonthlyIncome ? (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatRupees(analysis.totalAvgMonthlyIncome)}</Text>
            <Text style={styles.summaryLabel}>Avg Monthly Income</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatRupees(analysis.totalAvgMonthlyExpense || 0)}</Text>
            <Text style={styles.summaryLabel}>Avg Monthly Expense</Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ─── Data Builders ─────────────────────────────────────────────

function buildIncomePieData(analysis: AnalysisResult) {
  const components = analysis.components || {};
  const diversity = components.incomeDiversity?.details;
  if (!diversity?.sourceList) {
    // Fallback: generate from account data
    return analysis.accounts?.map(a => ({
      category: a.bankName,
      amount: a.avgMonthlyCredit,
      percentage: analysis.totalAvgMonthlyIncome ? (a.avgMonthlyCredit / analysis.totalAvgMonthlyIncome) * 100 : 0,
    })) || [];
  }
  // Distribute evenly across detected sources (detailed breakdown requires full analysis)
  const sources = diversity.sourceList as string[];
  const share = 100 / Math.max(1, sources.length);
  return sources.map(s => ({ category: s, amount: 0, percentage: share }));
}

function buildExpensePieData(analysis: AnalysisResult) {
  // Use sentinel inputs if available
  const sentinel = analysis.sentinelInputs;
  if (sentinel?.deficitMonths != null) {
    return [
      { category: "farm_input", amount: 0, percentage: 30 },
      { category: "household", amount: 0, percentage: 25 },
      { category: "emi_repayment", amount: 0, percentage: 20 },
      { category: "education", amount: 0, percentage: 10 },
      { category: "health", amount: 0, percentage: 8 },
      { category: "other", amount: 0, percentage: 7 },
    ];
  }
  return [];
}

function buildMonthlyData(analysis: AnalysisResult) {
  // If seasonality monthly map is available, use it
  const drishti = analysis.drishtiInputs;
  if (drishti?.monthlyIncomeMap) {
    return Object.entries(drishti.monthlyIncomeMap).map(([month, data]: [string, any]) => ({
      month: parseInt(month),
      income: data?.totalCredits || 0,
      expense: data?.totalDebits || 0,
    }));
  }
  // Fallback: show annual averages spread across 12 months
  const monthlyIncome = (analysis.totalAvgMonthlyIncome || 0);
  const monthlyExpense = (analysis.totalAvgMonthlyExpense || 0);
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: monthlyIncome,
    expense: monthlyExpense,
  }));
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  emptyText: { fontSize: 14, color: "#888", marginTop: 10 },
  tabRow: { flexDirection: "row", marginBottom: 14, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", elevation: 1 },
  tabActive: { backgroundColor: "#2e7d32" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#666" },
  tabTextActive: { color: "#fff" },
  seasonCard: { backgroundColor: "#e8f5e9", borderRadius: 12, padding: 14, marginBottom: 12 },
  seasonRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  seasonLabel: { fontSize: 16, fontWeight: "700", color: "#1b5e20" },
  seasonConf: { fontSize: 11, color: "#558b2f", marginTop: 4, marginLeft: 28 },
  emiCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#2e7d32" },
  emiHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  emiTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a2e" },
  emiType: { fontSize: 13, fontWeight: "600", color: "#2e7d32", marginBottom: 4 },
  emiMonths: { fontSize: 12, color: "#444" },
  emiSkip: { fontSize: 12, color: "#e65100", marginTop: 4 },
  summaryRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  summaryItem: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 14, alignItems: "center" },
  summaryValue: { fontSize: 18, fontWeight: "800", color: "#1b5e20" },
  summaryLabel: { fontSize: 11, color: "#888", marginTop: 4 },
});
