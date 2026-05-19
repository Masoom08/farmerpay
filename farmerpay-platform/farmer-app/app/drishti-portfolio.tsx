import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { runHouseholdPortfolio, getFarmerContext, formatCompact, healthColor, type HouseholdPortfolioResult, type FarmerContext } from "../lib/drishti";
import DrishtiRecommendations from "../components/drishti/DrishtiRecommendations";
import DrishtiCashFlowChart from "../components/drishti/DrishtiCashFlowChart";
import DrishtiRiskGauge from "../components/drishti/DrishtiRiskGauge";
import DrishtiShareButton from "../components/drishti/DrishtiShareButton";

export default function DrishtiPortfolio() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HouseholdPortfolioResult | null>(null);
  const [dairyCount, setDairyCount] = useState(3);
  const [includeFishery, setIncludeFishery] = useState(false);
  const [ctx, setCtx] = useState<FarmerContext | null>(null);

  // Load farmer context — auto-set dairy/fishery toggles from subscriptions
  useFocusEffect(useCallback(() => {
    getFarmerContext().then((c) => {
      setCtx(c);
      if (c.hasDairy) setDairyCount(3);
      if (c.hasFishery) setIncludeFishery(true);
    }).catch(() => {});
  }, []));

  const handleRun = useCallback(async () => {
    setLoading(true);
    try {
      const res = await runHouseholdPortfolio({
        farmer_id: ctx?.farmerId || 1,
        proposed_farm_activities: {
          crops: [{ crop_id: "crop_paddy", acreage_hectares: 1.0, season: "kharif", irrigation: "rainfed" }],
          dairy: dairyCount > 0 ? { animal_count: dairyCount, feed_quality: "standard" } : undefined,
          fishery: includeFishery ? { pond_area_hectares: 0.2, stocking_density: "standard", cycle_months: 8 } : undefined,
        },
        time_horizon_months: 12,
        include_stress_scenarios: true,
      });
      setResult(res);
    } catch (err: any) { Alert.alert("Error", err.message); }
    finally { setLoading(false); }
  }, [dairyCount, includeFishery]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Household Portfolio</Text>
      <Text style={styles.subtitle}>What should your household do to maximize income?</Text>

      {/* Quick Controls */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Farm Activities</Text>
        <View style={styles.row}><Text style={styles.label}>Paddy (1 ha, kharif)</Text><Text style={styles.value}>Included</Text></View>
        <View style={styles.row}>
          <Text style={styles.label}>Dairy animals</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setDairyCount(Math.max(0, dairyCount - 1))}><Text style={styles.stepText}>−</Text></TouchableOpacity>
            <Text style={styles.stepValue}>{dairyCount}</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setDairyCount(dairyCount + 1)}><Text style={styles.stepText}>+</Text></TouchableOpacity>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Add fishery pond</Text>
          <TouchableOpacity style={[styles.toggle, includeFishery && styles.toggleActive]} onPress={() => setIncludeFishery(!includeFishery)}>
            <Text style={[styles.toggleText, includeFishery && styles.toggleTextActive]}>{includeFishery ? "Yes" : "No"}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.runBtn} onPress={handleRun} disabled={loading}><Text style={styles.runBtnText}>{loading ? "Computing..." : "🏠 Analyze Portfolio"}</Text></TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 20 }} />}

      {result && (
        <>
          {/* Income Summary */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Income Summary</Text>
            <View style={styles.row}><Text style={styles.label}>Total Projected Annual</Text><Text style={[styles.value, { color: "#1b5e20", fontWeight: "800" }]}>{formatCompact(result.income_summary.total_projected_annual)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Farm Income</Text><Text style={styles.value}>{formatCompact(result.income_summary.farm_income_annual)} ({result.income_summary.farm_income_pct}%)</Text></View>
            <View style={styles.row}><Text style={styles.label}>Non-Farm Income</Text><Text style={styles.value}>{formatCompact(result.income_summary.non_farm_income_annual)} ({result.income_summary.non_farm_income_pct}%)</Text></View>
            <View style={styles.row}><Text style={styles.label}>Diversification</Text><Text style={styles.value}>{result.income_summary.income_diversification_index} ({result.income_summary.income_diversification_rating})</Text></View>
          </View>

          {/* Income Streams */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Income Streams</Text>
            {(result.income_summary.income_streams || []).slice(0, 8).map((s, i) => (
              <View key={i} style={styles.streamRow}>
                <View style={[styles.streamDot, { backgroundColor: s.type === "farm" ? "#2e7d32" : "#1976d2" }]} />
                <Text style={styles.streamName} numberOfLines={1}>{s.source.replace(/_/g, " ")}</Text>
                <Text style={styles.streamAmt}>{formatCompact(s.annual)}</Text>
                <Text style={styles.streamPct}>{s.pct}%</Text>
              </View>
            ))}
          </View>

          {/* Net Position */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Net Position</Text>
            <View style={styles.row}><Text style={styles.label}>Annual Surplus</Text><Text style={[styles.value, { color: result.net_household_position.annual_surplus >= 0 ? "#2e7d32" : "#c62828" }]}>{formatCompact(result.net_household_position.annual_surplus)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Surplus Months</Text><Text style={styles.value}>{result.net_household_position.surplus_months}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Deficit Months</Text><Text style={[styles.value, { color: result.net_household_position.deficit_months > 3 ? "#c62828" : "#666" }]}>{result.net_household_position.deficit_months}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Working Capital Gap</Text><Text style={styles.value}>{formatCompact(result.net_household_position.working_capital_gap)}</Text></View>
          </View>

          {/* Resilience */}
          <View style={[styles.card, { alignItems: "center" }]}>
            <Text style={styles.cardTitle}>Financial Resilience</Text>
            <DrishtiRiskGauge score={result.financial_resilience.resilience_score} size={120} label={result.financial_resilience.resilience_rating} />
            <Text style={styles.resilienceInfo}>Can survive {result.financial_resilience.months_survivable_without_farm_income} months without farm income</Text>
          </View>

          {/* Comparison */}
          {result.comparison_to_current && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>vs Current Portfolio</Text>
              <View style={styles.row}><Text style={styles.label}>Income Change</Text><Text style={[styles.value, { color: result.comparison_to_current.income_change_pct > 0 ? "#2e7d32" : "#c62828" }]}>{result.comparison_to_current.income_change_pct > 0 ? "+" : ""}{result.comparison_to_current.income_change_pct}%</Text></View>
              <View style={styles.row}><Text style={styles.label}>Risk Change</Text><Text style={styles.value}>{(result.comparison_to_current.risk_change || "").replace(/_/g, " ")}</Text></View>
            </View>
          )}

          {/* Cash Flow */}
          {result.scenarios?.[0]?.monthly_cashflow && <DrishtiCashFlowChart data={result.scenarios[0].monthly_cashflow} />}

          {/* Stress Scenarios */}
          {result.stress_scenarios?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Stress Scenarios</Text>
              {result.stress_scenarios.map((s, i) => (
                <View key={i} style={styles.stressRow}>
                  <Text style={styles.stressLabel}>{s.label.replace(/_/g, " ")}</Text>
                  <Text style={styles.stressDesc}>{s.description}</Text>
                  <View style={styles.stressMeta}>
                    <Text style={{ fontSize: 12, color: "#c62828", fontWeight: "600" }}>{formatCompact(s.income_change)}</Text>
                    <Text style={{ fontSize: 11, color: s.household_can_survive ? "#2e7d32" : "#c62828" }}>{s.household_can_survive ? "Can survive" : "At risk"}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <DrishtiRecommendations recommendations={result.recommendations} />
          <DrishtiShareButton runUuid={result.run_uuid} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" }, content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: "800", color: "#1b5e20" }, subtitle: { fontSize: 12, color: "#888", marginBottom: 16 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#1b5e20", marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0" },
  label: { fontSize: 13, color: "#666" }, value: { fontSize: 13, fontWeight: "700", color: "#1a1a2e" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#e8f5e9", justifyContent: "center", alignItems: "center" },
  stepText: { fontSize: 18, fontWeight: "700", color: "#2e7d32" }, stepValue: { fontSize: 16, fontWeight: "700", minWidth: 20, textAlign: "center" },
  toggle: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#ddd" },
  toggleActive: { backgroundColor: "#e8f5e9", borderColor: "#2e7d32" },
  toggleText: { fontSize: 12, color: "#888" }, toggleTextActive: { color: "#2e7d32", fontWeight: "600" },
  runBtn: { backgroundColor: "#2e7d32", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 12 },
  runBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  streamRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5, gap: 8 },
  streamDot: { width: 8, height: 8, borderRadius: 4 }, streamName: { flex: 1, fontSize: 12, color: "#555" },
  streamAmt: { fontSize: 12, fontWeight: "700", color: "#1a1a2e", width: 60, textAlign: "right" },
  streamPct: { fontSize: 11, color: "#888", width: 35, textAlign: "right" },
  resilienceInfo: { fontSize: 12, color: "#888", marginTop: 8, textAlign: "center" },
  stressRow: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0" },
  stressLabel: { fontSize: 13, fontWeight: "700", color: "#333", textTransform: "capitalize" },
  stressDesc: { fontSize: 11, color: "#888", marginVertical: 2 },
  stressMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
});
