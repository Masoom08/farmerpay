import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { runMarketTiming, getFarmerContext, formatCompact, type MarketTimingResult, type FarmerContext } from "../lib/drishti";
import { formatRupees } from "../lib/api";
import DrishtiRecommendations from "../components/drishti/DrishtiRecommendations";
import DrishtiShareButton from "../components/drishti/DrishtiShareButton";

export default function DrishtiMarket() {
  const [quantity, setQuantity] = useState("50");
  const [price, setPrice] = useState("2200");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketTimingResult | null>(null);
  const [ctx, setCtx] = useState<FarmerContext | null>(null);

  useFocusEffect(useCallback(() => { getFarmerContext().then(setCtx).catch(() => {}); }, []));

  const handleRun = useCallback(async () => {
    setLoading(true);
    try {
      const commodityId = ctx?.activeCrops?.[0]?.cropId || "crop_paddy";
      const res = await runMarketTiming({
        farmer_id: ctx?.farmerId || 1, commodity_id: commodityId,
        quantity_quintals: parseInt(quantity) || 50,
        current_price_per_quintal: parseInt(price) || 2200,
        storage_options: { warehousing_cost_per_quintal_month: 50, storage_duration_months: [1, 2, 3] },
        include_topup_loan_simulation: true,
      });
      setResult(res);
    } catch (err: any) { Alert.alert("Error", err.message); }
    finally { setLoading(false); }
  }, [quantity, price]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Market Timing</Text>
      <Text style={styles.subtitle}>Should you sell now or store in warehouse?</Text>

      <View style={styles.card}>
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}><Text style={styles.inputLabel}>Quantity (quintals)</Text><TextInput style={styles.input} keyboardType="numeric" value={quantity} onChangeText={setQuantity} /></View>
          <View style={styles.inputGroup}><Text style={styles.inputLabel}>Current Price (₹/qtl)</Text><TextInput style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} /></View>
        </View>
        <TouchableOpacity style={styles.runBtn} onPress={handleRun} disabled={loading}><Text style={styles.runBtnText}>{loading ? "Analyzing..." : "📈 Analyze Timing"}</Text></TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#2e7d32" style={{ marginTop: 20 }} />}

      {result && (
        <>
          {/* Sell Now */}
          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#2e7d32" }]}>
            <Text style={styles.cardTitle}>Sell Now</Text>
            <View style={styles.row}><Text style={styles.label}>Price</Text><Text style={styles.value}>{formatRupees(result.sell_now.price_per_quintal)}/qtl</Text></View>
            <View style={styles.row}><Text style={styles.label}>Net Proceeds</Text><Text style={[styles.value, { color: "#1b5e20", fontWeight: "800" }]}>{formatRupees(result.sell_now.net_proceeds)}</Text></View>
          </View>

          {/* Optimal */}
          <View style={[styles.card, { backgroundColor: "#e8f5e9" }]}>
            <Text style={[styles.cardTitle, { color: "#1b5e20" }]}>Recommended: {result.optimal_window.recommended_action.replace(/_/g, " ")}</Text>
            <View style={styles.row}><Text style={styles.label}>Expected Proceeds</Text><Text style={[styles.value, { fontWeight: "800" }]}>{formatCompact(result.optimal_window.expected_net_proceeds)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Gain vs Sell Now</Text><Text style={[styles.value, { color: result.optimal_window.gain_vs_sell_now > 0 ? "#2e7d32" : "#c62828" }]}>{formatCompact(result.optimal_window.gain_vs_sell_now)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Confidence</Text><Text style={styles.value}>{result.optimal_window.confidence}</Text></View>
          </View>

          {/* Storage Scenarios */}
          <Text style={styles.sectionTitle}>Storage Options</Text>
          {(result.storage_scenarios || []).map(s => (
            <View key={s.months} style={styles.card}>
              <Text style={styles.cardTitle}>Store {s.months} Month{s.months > 1 ? "s" : ""}</Text>
              <View style={styles.row}><Text style={styles.label}>Projected Price</Text><Text style={styles.value}>{formatRupees(s.projected_price)}/qtl</Text></View>
              <View style={styles.row}><Text style={styles.label}>Storage Cost</Text><Text style={[styles.value, { color: "#c62828" }]}>{formatRupees(s.storage_cost)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Net Proceeds</Text><Text style={styles.value}>{formatRupees(s.net_proceeds)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Gain vs Now</Text><Text style={[styles.value, { color: s.net_gain_vs_sell_now > 0 ? "#2e7d32" : "#c62828", fontWeight: "800" }]}>{s.net_gain_vs_sell_now > 0 ? "+" : ""}{formatRupees(s.net_gain_vs_sell_now)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>ROI on Storage</Text><Text style={styles.value}>{s.storage_roi_pct}%</Text></View>
            </View>
          ))}

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
  inputGroup: { flex: 1 }, inputLabel: { fontSize: 11, color: "#666", fontWeight: "600", marginBottom: 4 },
  input: { backgroundColor: "#f5f5f5", borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1, borderColor: "#e0e0e0" },
  runBtn: { backgroundColor: "#e65100", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 8 },
  runBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1b5e20", marginTop: 8, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0" },
  label: { fontSize: 13, color: "#666" }, value: { fontSize: 13, fontWeight: "700", color: "#1a1a2e" },
});
