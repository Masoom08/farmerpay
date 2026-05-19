import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { runClimateStress, getFarmerContext, formatCompact, healthColor, type ClimateStressResult, type FarmerContext } from "../lib/drishti";
import DrishtiScenarioCard from "../components/drishti/DrishtiScenarioCard";
import DrishtiRecommendations from "../components/drishti/DrishtiRecommendations";
import DrishtiShareButton from "../components/drishti/DrishtiShareButton";

export default function DrishtiClimate() {
  const [rainfall, setRainfall] = useState(-25);
  const [temperature, setTemperature] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClimateStressResult | null>(null);
  const [ctx, setCtx] = useState<FarmerContext | null>(null);

  useFocusEffect(useCallback(() => { getFarmerContext().then(setCtx).catch(() => {}); }, []));

  const handleRun = useCallback(async () => {
    setLoading(true);
    try {
      const res = await runClimateStress({
        farmer_id: ctx?.farmerId || 1,
        climate_scenario: { rainfall_deviation_pct: rainfall, temperature_deviation_celsius: temperature, delayed_monsoon_weeks: 0 },
        computation_mode: "deterministic",
      });
      setResult(res);
    } catch (err: any) { Alert.alert("Error", err.message); }
    finally { setLoading(false); }
  }, [rainfall, temperature]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Climate Stress Test</Text>
      <Text style={styles.subtitle}>What if the monsoon fails? See cascading impact on your farm</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Climate Parameters</Text>
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Rainfall Deviation (%)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={String(rainfall)} onChangeText={(v) => setRainfall(Number(v) || 0)} />
            <Text style={styles.inputHint}>-50 (drought) to +50 (flood)</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Temperature +°C</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={String(temperature)} onChangeText={(v) => setTemperature(Number(v) || 0)} />
            <Text style={styles.inputHint}>0 (normal) to 6 (heatwave)</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.runBtn} onPress={handleRun} disabled={loading}><Text style={styles.runBtnText}>{loading ? "Testing..." : "🌧️ Run Stress Test"}</Text></TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 20 }} />}

      {result && (
        <>
          {/* Scenario Classification */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Scenario: {(result.climate_scenario.scenario_type || "").replace(/_/g, " ").toUpperCase()}</Text>
            <View style={styles.row}><Text style={styles.label}>Severity</Text><Text style={[styles.value, { color: result.climate_scenario.severity === "severe" || result.climate_scenario.severity === "extreme" ? "#c62828" : "#e65100" }]}>{result.climate_scenario.severity?.toUpperCase()}</Text></View>
          </View>

          {/* Impact Cascade */}
          {result.impact_cascade && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Impact Cascade</Text>
              <View style={styles.cascadeItem}><Text style={styles.cascadeIcon}>🌧️</Text><Text style={styles.cascadeText}>Revenue: {formatCompact(result.impact_cascade.revenue_impact?.change)} ({result.impact_cascade.revenue_impact?.change_pct}%)</Text></View>
              <View style={styles.cascadeItem}><Text style={styles.cascadeIcon}>💰</Text><Text style={styles.cascadeText}>Income: {formatCompact(result.impact_cascade.income_impact?.change)}</Text></View>
              <View style={styles.cascadeItem}><Text style={styles.cascadeIcon}>🐄</Text><Text style={styles.cascadeText}>Dairy feed: {result.impact_cascade.cost_impact?.dairy_feed_multiplier}x cost</Text></View>
              <View style={styles.cascadeItem}><Text style={styles.cascadeIcon}>🏦</Text><Text style={styles.cascadeText}>Loan: {result.impact_cascade.loan_stress?.sma_migration}</Text></View>
            </View>
          )}

          {/* MC Results */}
          {result.monte_carlo && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Monte Carlo ({result.monte_carlo.num_runs || 0} simulations)</Text>
              <View style={styles.row}><Text style={styles.label}>Prob. Profitable</Text><Text style={[styles.value, { color: result.monte_carlo.probability_profitable > 0.6 ? "#2e7d32" : "#c62828" }]}>{Math.round(result.monte_carlo.probability_profitable * 100)}%</Text></View>
              <View style={styles.row}><Text style={styles.label}>Income P10</Text><Text style={styles.value}>{formatCompact(result.monte_carlo.income_p10)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Income P50</Text><Text style={styles.value}>{formatCompact(result.monte_carlo.income_p50)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Income P90</Text><Text style={styles.value}>{formatCompact(result.monte_carlo.income_p90)}</Text></View>
            </View>
          )}

          {/* Scenarios */}
          <Text style={styles.sectionTitle}>Baseline vs Stress</Text>
          {(result.scenarios || []).map(s => <DrishtiScenarioCard key={s.label} label={s.label} description={s.description} projections={s.projections} />)}

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
  inputRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 11, color: "#666", fontWeight: "600", marginBottom: 4 },
  input: { backgroundColor: "#f5f5f5", borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1, borderColor: "#e0e0e0" },
  inputHint: { fontSize: 10, color: "#aaa", marginTop: 2 },
  runBtn: { backgroundColor: "#0d47a1", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 12 },
  runBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1b5e20", marginTop: 8, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0" },
  label: { fontSize: 13, color: "#666" }, value: { fontSize: 13, fontWeight: "700", color: "#1a1a2e" },
  cascadeItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  cascadeIcon: { fontSize: 18 }, cascadeText: { fontSize: 13, color: "#333" },
});
