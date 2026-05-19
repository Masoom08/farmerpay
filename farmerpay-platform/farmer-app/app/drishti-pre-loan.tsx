import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { runPreLoan, getFarmerContext, type PreLoanResult, type FarmerContext } from "../lib/drishti";
import { formatRupees } from "../lib/api";
import DrishtiScenarioCard from "../components/drishti/DrishtiScenarioCard";
import DrishtiCashFlowChart from "../components/drishti/DrishtiCashFlowChart";
import DrishtiRecommendations from "../components/drishti/DrishtiRecommendations";
import DrishtiRiskGauge from "../components/drishti/DrishtiRiskGauge";
import DrishtiShareButton from "../components/drishti/DrishtiShareButton";

export default function DrishtiPreLoan() {
  const params = useLocalSearchParams<{ cropId?: string; season?: string; loanAmount?: string; acreage?: string }>();

  const [loanAmount, setLoanAmount] = useState(params.loanAmount || "200000");
  const [tenure, setTenure] = useState("12");
  const [acreage, setAcreage] = useState(params.acreage || "1.2");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreLoanResult | null>(null);
  const [ctx, setCtx] = useState<FarmerContext | null>(null);

  // Load farmer context on mount
  useFocusEffect(useCallback(() => {
    getFarmerContext().then(setCtx).catch(() => {});
  }, []));

  const handleRun = useCallback(async () => {
    setLoading(true);
    try {
      const farmerId = ctx?.farmerId || 1;
      const res = await runPreLoan({
        farmer_id: farmerId,
        loan_product_id: ctx?.activeLoans?.[0]?.applicationId || 1,
        loan_amount: parseInt(loanAmount) || 200000,
        loan_tenure_months: parseInt(tenure) || 12,
        repayment_type: "emi",
        activity: {
          type: "crop",
          crop_id: params.cropId || "crop_paddy",
          acreage_hectares: parseFloat(acreage) || 1.2,
          season: params.season || "kharif",
          irrigation_type: "rainfed",
        },
        include_insurance_comparison: true,
      });
      setResult(res);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to run scenario");
    } finally {
      setLoading(false);
    }
  }, [loanAmount, tenure, acreage, params]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Pre-Loan Scenario</Text>
      <Text style={styles.subtitle}>See how this crop loan could perform under 3 climate conditions</Text>

      {/* Input Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Loan Parameters</Text>
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Loan Amount (₹)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={loanAmount} onChangeText={setLoanAmount} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tenure (months)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={tenure} onChangeText={setTenure} />
          </View>
        </View>
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Acreage (ha)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={acreage} onChangeText={setAcreage} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Season</Text>
            <View style={styles.chipRow}>
              <View style={[styles.chip, styles.chipActive]}><Text style={styles.chipTextActive}>Kharif</Text></View>
              <View style={styles.chip}><Text style={styles.chipText}>Rabi</Text></View>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.runBtn} onPress={handleRun} disabled={loading} activeOpacity={0.8}>
          <Text style={styles.runBtnText}>{loading ? "Computing..." : "🔮 Run Scenario"}</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 20 }} />}

      {result && (
        <>
          {/* Loan Terms */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Loan Terms</Text>
            <View style={styles.row}><Text style={styles.metricLabel}>Amount</Text><Text style={styles.metricValue}>{formatRupees(result.loan_terms.amount)}</Text></View>
            <View style={styles.row}><Text style={styles.metricLabel}>Interest Rate</Text><Text style={styles.metricValue}>{result.loan_terms.interest_rate}%</Text></View>
            <View style={styles.row}><Text style={styles.metricLabel}>Monthly EMI</Text><Text style={[styles.metricValue, { color: "#1b5e20", fontWeight: "800" }]}>{formatRupees(result.loan_terms.monthly_emi)}</Text></View>
            <View style={styles.row}><Text style={styles.metricLabel}>Total Repayable</Text><Text style={styles.metricValue}>{formatRupees(result.loan_terms.total_repayable)}</Text></View>
            <View style={styles.row}><Text style={styles.metricLabel}>Total Interest</Text><Text style={[styles.metricValue, { color: "#c62828" }]}>{formatRupees(result.loan_terms.total_interest)}</Text></View>
          </View>

          {/* Risk Gauge */}
          {result.scenarios[1]?.projections?.risk_score != null && (
            <View style={[styles.card, { alignItems: "center" }]}>
              <DrishtiRiskGauge score={result.scenarios[1].projections.risk_score} size={120} />
              <Text style={styles.gaugeLabel}>Base Scenario Risk Score</Text>
            </View>
          )}

          {/* 3 Scenarios */}
          <Text style={styles.sectionTitle}>Climate Scenarios</Text>
          {result.scenarios.map(s => (
            <DrishtiScenarioCard key={s.label} label={s.label} description={s.description} projections={s.projections} />
          ))}

          {/* Cash Flow Chart */}
          {result.scenarios[1]?.monthly_cashflow && (
            <DrishtiCashFlowChart data={result.scenarios[1].monthly_cashflow} />
          )}

          {/* Insurance Comparison */}
          {result.insurance_comparison && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Insurance Comparison</Text>
              <View style={styles.row}>
                <Text style={styles.metricLabel}>Without Insurance Loss</Text>
                <Text style={[styles.metricValue, { color: "#c62828" }]}>{formatRupees(result.insurance_comparison.without_insurance.worst_case_loss)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.metricLabel}>With PMFBY Loss</Text>
                <Text style={[styles.metricValue, { color: "#2e7d32" }]}>{formatRupees(result.insurance_comparison.with_pmfby.worst_case_loss)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.metricLabel}>Premium</Text>
                <Text style={styles.metricValue}>{formatRupees(result.insurance_comparison.with_pmfby.premium)}</Text>
              </View>
            </View>
          )}

          {/* Recommendations */}
          <DrishtiRecommendations recommendations={result.recommendations} />

          {/* Share */}
          <DrishtiShareButton runUuid={result.run_uuid} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: "800", color: "#1b5e20" },
  subtitle: { fontSize: 12, color: "#888", marginBottom: 16 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#1b5e20", marginBottom: 10 },
  inputRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 11, color: "#666", fontWeight: "600", marginBottom: 4 },
  input: { backgroundColor: "#f5f5f5", borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1, borderColor: "#e0e0e0" },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: "#ddd" },
  chipActive: { backgroundColor: "#e8f5e9", borderColor: "#2e7d32" },
  chipText: { fontSize: 12, color: "#888" },
  chipTextActive: { fontSize: 12, color: "#2e7d32", fontWeight: "600" },
  runBtn: { backgroundColor: "#2e7d32", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 8 },
  runBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1b5e20", marginTop: 8, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0" },
  metricLabel: { fontSize: 13, color: "#666" },
  metricValue: { fontSize: 13, fontWeight: "700", color: "#1a1a2e" },
  gaugeLabel: { fontSize: 12, color: "#888", marginTop: 8 },
});
