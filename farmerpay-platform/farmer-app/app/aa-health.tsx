import React, { useCallback, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getHealthScore, refreshAnalysis, scoreColor, gradeColor,
  COMPONENT_LABELS, type HealthScore,
} from "../lib/aa";
import HealthScoreGauge from "../components/aa/HealthScoreGauge";

export default function FinancialHealthScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<HealthScore | null>(null);

  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    try {
      const result = await getHealthScore();
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAnalysis();
      await loadData();
    } catch { /* ignore */ }
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.loadingText}>Loading your financial health...</Text>
      </View>
    );
  }

  if (!data || !data.available) {
    return (
      <View style={styles.center}>
        <Ionicons name="analytics-outline" size={48} color="#ccc" />
        <Text style={styles.emptyTitle}>No Data Yet</Text>
        <Text style={styles.emptyDesc}>Connect your bank via Account Aggregator to see your score.</Text>
        <TouchableOpacity style={styles.connectBtn} onPress={() => router.push("/aa-consent")}>
          <Text style={styles.connectBtnText}>Connect Bank</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2e7d32" />}
    >
      {/* Score Gauge */}
      <View style={styles.gaugeCard}>
        <HealthScoreGauge score={data.score} grade={data.grade} size={180} />
        <Text style={styles.gaugeHint}>Based on your bank transactions</Text>
      </View>

      {/* Component Grid */}
      <Text style={styles.sectionTitle}>Score Breakdown</Text>
      <View style={styles.grid}>
        {Object.entries(data.components).map(([key, comp]) => {
          const meta = COMPONENT_LABELS[key];
          if (!meta) return null;
          const color = scoreColor(comp.score);
          return (
            <View key={key} style={styles.componentCard}>
              <View style={styles.componentHeader}>
                <Ionicons name={meta.icon as any} size={18} color={color} />
                <Text style={styles.componentWeight}>{meta.weight}%</Text>
              </View>
              <Text style={[styles.componentScore, { color }]}>{Math.round(comp.score)}</Text>
              <Text style={styles.componentLabel} numberOfLines={2}>{meta.label}</Text>
              <ComponentInsight componentKey={key} details={comp.details} />
            </View>
          );
        })}
      </View>

      {/* Explore button */}
      <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push("/aa-insights")}>
        <Ionicons name="pie-chart-outline" size={18} color="#2e7d32" />
        <Text style={styles.exploreBtnText}>View Income & Expense Breakdown</Text>
        <Ionicons name="chevron-forward" size={16} color="#2e7d32" />
      </TouchableOpacity>
    </ScrollView>
  );
}

function ComponentInsight({ componentKey, details }: { componentKey: string; details: Record<string, any> }) {
  let text = "";
  switch (componentKey) {
    case "cashFlowStability":
      text = details?.deficitMonths != null ? `${details.deficitMonths} deficit months` : "Steady flow";
      break;
    case "balanceAdequacy":
      text = details?.monthsCovered != null ? `${details.monthsCovered.toFixed(1)}x expenses covered` : "";
      break;
    case "incomeDiversity":
      text = details?.activeSources != null ? `${details.activeSources} income sources` : "";
      break;
    case "debtDiscipline":
      text = details?.bounceCount != null ? (details.bounceCount === 0 ? "No bounces" : `${details.bounceCount} bounces`) : "";
      break;
    case "govtTransferAccess":
      text = details?.schemesDetected?.length ? details.schemesDetected.join(", ") : "No schemes detected";
      break;
    case "digitalAdoption":
      text = details?.digitalRatio != null ? `${Math.round(details.digitalRatio * 100)}% digital` : "";
      break;
  }
  return text ? <Text style={styles.componentInsight} numberOfLines={1}>{text}</Text> : null;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30, backgroundColor: "#f5f5f5" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#666" },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a2e", marginTop: 12 },
  emptyDesc: { fontSize: 13, color: "#888", textAlign: "center", marginTop: 6 },
  connectBtn: { marginTop: 16, backgroundColor: "#2e7d32", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  connectBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  gaugeCard: { backgroundColor: "#fff", borderRadius: 14, padding: 20, alignItems: "center", marginBottom: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  gaugeHint: { fontSize: 11, color: "#888", marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a2e", marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  componentCard: { width: "48%", backgroundColor: "#fff", borderRadius: 12, padding: 14, elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  componentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  componentWeight: { fontSize: 10, color: "#aaa", fontWeight: "600" },
  componentScore: { fontSize: 28, fontWeight: "800" },
  componentLabel: { fontSize: 11, color: "#666", fontWeight: "600", marginTop: 2 },
  componentInsight: { fontSize: 10, color: "#999", marginTop: 4 },
  exploreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#e8f5e9", borderRadius: 12, padding: 14, marginTop: 16 },
  exploreBtnText: { fontSize: 14, fontWeight: "600", color: "#2e7d32" },
});
