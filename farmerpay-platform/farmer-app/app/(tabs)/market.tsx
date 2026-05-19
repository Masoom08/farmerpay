import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { apiGet, formatRupees } from "../../lib/api";

function getTrend(current: number, forecast: number) {
  const pct = ((forecast - current) / current) * 100;
  if (pct > 5) return { arrow: "↑", color: "#2e7d32", label: `+${pct.toFixed(0)}%` };
  if (pct > 0) return { arrow: "↗", color: "#558b2f", label: `+${pct.toFixed(0)}%` };
  if (pct > -5) return { arrow: "→", color: "#f57f17", label: `${pct.toFixed(0)}%` };
  return { arrow: "↓", color: "#c62828", label: `${pct.toFixed(0)}%` };
}

export default function MarketScreen() {
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<any>({});
  const [msp, setMsp] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const [priceRes, f7, f15, f30, mspRes] = await Promise.all([
          apiGet("/pulse/prices/latest?commodityId=COMM-WHEAT-UUID-001&mandiId=1&days=7"),
          apiGet("/pulse/price-forecast/COMM-WHEAT-UUID-001?mandiId=1&horizonDays=7"),
          apiGet("/pulse/price-forecast/COMM-WHEAT-UUID-001?mandiId=1&horizonDays=15"),
          apiGet("/pulse/price-forecast/COMM-WHEAT-UUID-001?mandiId=1&horizonDays=30"),
          apiGet("/pulse/msp/COMM-WHEAT-UUID-001"),
        ]);
        setPrices(priceRes.data || []);
        setForecasts({ day7: f7.data, day15: f15.data, day30: f30.data });
        setMsp(mspRes.data);
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2e7d32" /></View>;

  const todayPrice = prices[0]?.modalPrice || prices[0]?.closePrice || 0;
  const mspPrice = msp?.mspPrice || 2275;
  const aboveMsp = todayPrice >= mspPrice;

  const forecastCards = [
    { label: "7 Days / ७ दिन", data: forecasts.day7 },
    { label: "15 Days / १५ दिन", data: forecasts.day15 },
    { label: "30 Days / ३० दिन", data: forecasts.day30 },
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Today's Price */}
      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>Today's Price / आज का भाव</Text>
        <Text style={styles.priceValue}>{formatRupees(todayPrice)}</Text>
        <Text style={styles.priceUnit}>/quintal — Mysuru APMC</Text>
        <View style={[styles.mspBadge, { backgroundColor: aboveMsp ? "#e8f5e9" : "#fbe9e7" }]}>
          <Text style={{ color: aboveMsp ? "#2e7d32" : "#c62828", fontWeight: "700", fontSize: 13 }}>
            {aboveMsp ? "↑ Above MSP" : "↓ Below MSP"} ({formatRupees(mspPrice)})
          </Text>
        </View>
      </View>

      {/* Forecasts */}
      <Text style={styles.sectionTitle}>Price Forecast / भाव अनुमान</Text>
      {forecastCards.map((fc, i) => {
        const predicted = fc.data?.predictedPrice || todayPrice;
        const confidence = fc.data?.confidence || 0;
        const trend = getTrend(todayPrice, predicted);
        return (
          <View key={i} style={styles.forecastCard}>
            <View style={styles.fcRow}>
              <Text style={styles.fcLabel}>{fc.label}</Text>
              <Text style={[styles.fcArrow, { color: trend.color }]}>{trend.arrow} {trend.label}</Text>
            </View>
            <Text style={styles.fcPrice}>{formatRupees(predicted)}/qtl</Text>
            <View style={styles.confRow}>
              <Text style={styles.confLabel}>Confidence / विश्वास:</Text>
              <View style={styles.confBar}>
                <View style={[styles.confFill, { width: `${confidence}%`, backgroundColor: confidence > 70 ? "#4caf50" : confidence > 50 ? "#ff9800" : "#f44336" }]} />
              </View>
              <Text style={styles.confPct}>{confidence}%</Text>
            </View>
          </View>
        );
      })}

      {/* Sell vs Store */}
      <View style={styles.card}>
        <Text style={styles.label}>💡 Recommendation / सिफारिश</Text>
        <Text style={styles.recText}>
          Prices are trending upward. Consider storing wheat for 15 days — predicted gain of {formatRupees(500)}/quintal after storage costs.
        </Text>
        <Text style={styles.recTextHi}>
          भाव बढ़ रहे हैं। 15 दिन गोदाम में रखने पर ₹500/क्विंटल अधिक मिल सकता है।
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  priceCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 16, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  priceLabel: { fontSize: 12, color: "#888", fontWeight: "600" },
  priceValue: { fontSize: 40, fontWeight: "900", color: "#1b5e20", marginVertical: 4 },
  priceUnit: { fontSize: 13, color: "#888" },
  mspBadge: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 10 },
  forecastCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  fcRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  fcLabel: { fontSize: 13, color: "#888", fontWeight: "600" },
  fcArrow: { fontSize: 15, fontWeight: "800" },
  fcPrice: { fontSize: 22, fontWeight: "800", color: "#1b5e20", marginBottom: 8 },
  confRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  confLabel: { fontSize: 11, color: "#999" },
  confBar: { flex: 1, height: 6, backgroundColor: "#e0e0e0", borderRadius: 3 },
  confFill: { height: "100%", borderRadius: 3 },
  confPct: { fontSize: 11, color: "#999", width: 30, textAlign: "right" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginTop: 6, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  label: { fontSize: 12, fontWeight: "700", color: "#888", marginBottom: 8 },
  recText: { fontSize: 14, color: "#333", lineHeight: 20, marginBottom: 8 },
  recTextHi: { fontSize: 13, color: "#666", lineHeight: 19 },
});
