import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { runInsurance, getFarmerContext, formatCompact, verdictColor, type InsuranceResult, type FarmerContext } from "../lib/drishti";
import { formatRupees } from "../lib/api";
import DrishtiRecommendations from "../components/drishti/DrishtiRecommendations";
import DrishtiShareButton from "../components/drishti/DrishtiShareButton";

export default function DrishtiInsurance() {
  const [sumInsured, setSumInsured] = useState("100000");
  const [insuranceType, setInsuranceType] = useState("pmfby");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsuranceResult | null>(null);
  const [ctx, setCtx] = useState<FarmerContext | null>(null);

  useFocusEffect(useCallback(() => {
    getFarmerContext().then((c) => {
      setCtx(c);
      // Auto-select livestock type if farmer has dairy but no crops
      if (c.hasDairy && c.activeCrops.length === 0) setInsuranceType("livestock");
    }).catch(() => {});
  }, []));

  const handleRun = useCallback(async () => {
    setLoading(true);
    try {
      const cropId = ctx?.activeCrops?.[0]?.cropId || "crop_paddy";
      const season = ctx?.activeCrops?.[0]?.season || "kharif";
      const activityType = insuranceType === "livestock" ? "dairy" : insuranceType === "aquaculture" ? "fishery" : "crop";
      const res = await runInsurance({
        farmer_id: ctx?.farmerId || 1, insurance_type: insuranceType, sum_insured: parseInt(sumInsured) || 100000,
        activity: { type: activityType, crop_id: cropId, acreage_hectares: 1.2, season },
      });
      setResult(res);
    } catch (err: any) { Alert.alert("Error", err.message); }
    finally { setLoading(false); }
  }, [sumInsured, insuranceType]);

  const types = [{ key: "pmfby", label: "PMFBY" }, { key: "weather_index", label: "Weather" }, { key: "livestock", label: "Livestock" }];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Insurance Decision</Text>
      <Text style={styles.subtitle}>Is crop/livestock insurance worth it for you?</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Insurance Type</Text>
        <View style={styles.chipRow}>
          {types.map(t => (
            <TouchableOpacity key={t.key} style={[styles.chip, insuranceType === t.key && styles.chipActive]} onPress={() => setInsuranceType(t.key)}>
              <Text style={[styles.chipText, insuranceType === t.key && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Sum Insured (₹)</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={sumInsured} onChangeText={setSumInsured} />
        <TouchableOpacity style={styles.runBtn} onPress={handleRun} disabled={loading}><Text style={styles.runBtnText}>{loading ? "Evaluating..." : "🛡️ Evaluate Insurance"}</Text></TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 20 }} />}

      {result && (
        <>
          {/* Verdict */}
          <View style={[styles.card, { backgroundColor: verdictColor(result.recommendation.verdict).bg }]}>
            <Text style={[styles.verdictText, { color: verdictColor(result.recommendation.verdict).fg }]}>
              {result.recommendation.verdict === "ENROLL" ? "✅" : result.recommendation.verdict === "SKIP" ? "❌" : "⚠️"} {result.recommendation.verdict}
            </Text>
            <Text style={styles.verdictReason}>{result.recommendation.reasoning}</Text>
            <View style={styles.row}><Text style={styles.label}>Confidence</Text><Text style={styles.value}>{result.recommendation.confidence}</Text></View>
            <View style={styles.row}><Text style={styles.label}>5-Year ROI</Text><Text style={[styles.value, { color: result.five_year_analysis.five_year_roi_pct > 0 ? "#2e7d32" : "#c62828" }]}>{result.five_year_analysis.five_year_roi_pct}%</Text></View>
          </View>

          {/* Terms */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Insurance Terms</Text>
            <View style={styles.row}><Text style={styles.label}>Premium/Season</Text><Text style={styles.value}>{formatRupees(result.insurance_terms.premium_per_season)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Sum Insured</Text><Text style={styles.value}>{formatRupees(result.insurance_terms.sum_insured)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Premium %</Text><Text style={styles.value}>{result.insurance_terms.premium_as_pct_of_sum}%</Text></View>
          </View>

          {/* Break-Even */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Break-Even</Text>
            <View style={styles.row}><Text style={styles.label}>Break-Even Frequency</Text><Text style={styles.value}>{Math.round(result.break_even.break_even_claim_frequency * 100)}%</Text></View>
            <View style={styles.row}><Text style={styles.label}>Historical Frequency</Text><Text style={styles.value}>{Math.round(result.break_even.historical_claim_frequency * 100)}%</Text></View>
          </View>

          {/* Stress Comparisons */}
          {result.stress_comparisons?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Stress Scenarios</Text>
              {result.stress_comparisons.map((sc, i) => (
                <View key={i} style={styles.stressItem}>
                  <Text style={styles.stressLabel}>{sc.scenario?.label || `Scenario ${i + 1}`}</Text>
                  <View style={styles.stressCompare}>
                    <View><Text style={styles.stressSmall}>Without</Text><Text style={[styles.stressAmt, { color: "#c62828" }]}>{formatCompact(sc.without_insurance.net_income)}</Text></View>
                    <Text style={styles.stressArrow}>→</Text>
                    <View><Text style={styles.stressSmall}>With</Text><Text style={[styles.stressAmt, { color: "#2e7d32" }]}>{formatCompact(sc.with_insurance.net_income)}</Text></View>
                    <View><Text style={styles.stressSmall}>Payout</Text><Text style={[styles.stressAmt, { color: "#1976d2" }]}>{formatCompact(sc.insurance_payout)}</Text></View>
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
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: "#ddd" },
  chipActive: { backgroundColor: "#e8f5e9", borderColor: "#2e7d32" },
  chipText: { fontSize: 13, color: "#888" }, chipTextActive: { color: "#2e7d32", fontWeight: "600" },
  inputLabel: { fontSize: 11, color: "#666", fontWeight: "600", marginBottom: 4 },
  input: { backgroundColor: "#f5f5f5", borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1, borderColor: "#e0e0e0" },
  runBtn: { backgroundColor: "#6a1b9a", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 12 },
  runBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  verdictText: { fontSize: 22, fontWeight: "800", marginBottom: 6 },
  verdictReason: { fontSize: 13, color: "#555", lineHeight: 18, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0" },
  label: { fontSize: 13, color: "#666" }, value: { fontSize: 13, fontWeight: "700", color: "#1a1a2e" },
  stressItem: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0" },
  stressLabel: { fontSize: 13, fontWeight: "600", color: "#333", marginBottom: 4, textTransform: "capitalize" },
  stressCompare: { flexDirection: "row", alignItems: "center", gap: 12 },
  stressSmall: { fontSize: 10, color: "#888", textAlign: "center" },
  stressAmt: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  stressArrow: { fontSize: 16, color: "#ccc" },
});
