import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { healthColor, formatCompact, type ScenarioProjection } from "../../lib/drishti";

interface Props {
  label: string;
  description?: string;
  projections: ScenarioProjection;
  onPress?: () => void;
}

export default function DrishtiScenarioCard({ label, description, projections: p, onPress }: Props) {
  const hc = healthColor(p.health_status);
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress} disabled={!onPress}>
      <View style={styles.header}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        <View style={[styles.badge, { backgroundColor: hc.bg }]}><Text style={[styles.badgeText, { color: hc.fg }]}>{p.health_status?.toUpperCase()}</Text></View>
      </View>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      <View style={styles.row}><Text style={styles.metricLabel}>Revenue</Text><Text style={styles.metricValue}>{formatCompact(p.total_revenue)}</Text></View>
      <View style={styles.row}><Text style={styles.metricLabel}>Cost</Text><Text style={[styles.metricValue, { color: "#c62828" }]}>{formatCompact(p.total_cost)}</Text></View>
      <View style={[styles.row, styles.rowHighlight]}><Text style={styles.metricLabel}>Net Income</Text><Text style={[styles.metricValue, { color: p.net_farm_income >= 0 ? "#2e7d32" : "#c62828" }]}>{formatCompact(p.net_farm_income)}</Text></View>
      {p.emi_to_income_ratio > 0 && <View style={styles.row}><Text style={styles.metricLabel}>EMI Burden</Text><Text style={[styles.metricValue, { color: p.emi_to_income_ratio > 0.4 ? "#c62828" : "#2e7d32" }]}>{Math.round(p.emi_to_income_ratio * 100)}%</Text></View>}
      {p.yield_safety_margin_pct != null && <View style={styles.row}><Text style={styles.metricLabel}>Yield Safety</Text><Text style={[styles.metricValue, { color: p.yield_safety_margin_pct > 20 ? "#2e7d32" : "#e65100" }]}>{Math.round(p.yield_safety_margin_pct)}%</Text></View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { fontSize: 12, fontWeight: "700", color: "#555", letterSpacing: 0.5 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  desc: { fontSize: 12, color: "#888", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0" },
  rowHighlight: { borderBottomWidth: 0, paddingTop: 8 },
  metricLabel: { fontSize: 13, color: "#666" },
  metricValue: { fontSize: 13, fontWeight: "700", color: "#1a1a2e" },
});
