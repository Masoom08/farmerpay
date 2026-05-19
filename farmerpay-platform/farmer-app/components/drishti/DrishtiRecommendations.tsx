import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Recommendation } from "../../lib/drishti";

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  verdict: { bg: "#e8f5e9", border: "#2e7d32", icon: "✅" },
  strength: { bg: "#e8f5e9", border: "#4caf50", icon: "💪" },
  action: { bg: "#e3f2fd", border: "#1976d2", icon: "👉" },
  warning: { bg: "#fff3e0", border: "#e65100", icon: "⚠️" },
  info: { bg: "#f5f5f5", border: "#9e9e9e", icon: "ℹ️" },
};

export default function DrishtiRecommendations({ recommendations }: { recommendations: Recommendation[] }) {
  if (!recommendations || recommendations.length === 0) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recommendations</Text>
      {recommendations.map((rec, i) => {
        const s = TYPE_STYLES[rec.type] || TYPE_STYLES.info;
        return (
          <View key={i} style={[styles.rec, { backgroundColor: s.bg, borderLeftColor: s.border }]}>
            <Text style={styles.recText}>{s.icon} {rec.message}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  title: { fontSize: 14, fontWeight: "700", color: "#1b5e20", marginBottom: 8 },
  rec: { padding: 12, marginBottom: 6, borderRadius: 10, borderLeftWidth: 3 },
  recText: { fontSize: 13, color: "#333", lineHeight: 18 },
});
