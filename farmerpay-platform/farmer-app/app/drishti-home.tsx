import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { getTemplates, type ScenarioTemplate } from "../lib/drishti";

const ENGINE_META: Record<string, { icon: string; color: string; bg: string; desc: string }> = {
  pre_loan: { icon: "🏦", color: "#1b5e20", bg: "#e8f5e9", desc: "Should I take this loan? See projected income vs EMI under 3 climate scenarios" },
  household_portfolio: { icon: "🏠", color: "#4e342e", bg: "#efebe9", desc: "What should my household do? Optimize income across farm + non-farm activities" },
  climate_stress: { icon: "🌧️", color: "#0d47a1", bg: "#e3f2fd", desc: "What if monsoon fails? Test how climate affects your crops, dairy, and loans" },
  insurance: { icon: "🛡️", color: "#6a1b9a", bg: "#f3e5f5", desc: "Is PMFBY worth it? Compare insured vs uninsured outcomes over 5 years" },
  market_timing: { icon: "📈", color: "#e65100", bg: "#fff3e0", desc: "Sell now or store? See if storing your harvest in warehouse pays off" },
};

export default function DrishtiHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<ScenarioTemplate[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getTemplates();
      setTemplates(res);
    } catch { setTemplates([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e7d32" /></View>;

  const engines = Object.keys(ENGINE_META);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>

      <Text style={styles.heading}>DRISHTI Scenarios</Text>
      <Text style={styles.subtitle}>Explore what-if scenarios for your farm and household</Text>

      {engines.map(engine => {
        const meta = ENGINE_META[engine];
        const engineTemplates = templates.filter(t => t.engine_type === engine);
        const screen = engine === "pre_loan" ? "/drishti-pre-loan"
          : engine === "household_portfolio" ? "/drishti-portfolio"
          : engine === "climate_stress" ? "/drishti-climate"
          : engine === "insurance" ? "/drishti-insurance"
          : engine === "market_timing" ? "/drishti-market" : "/drishti-home";

        return (
          <TouchableOpacity key={engine} style={[styles.card, { borderLeftColor: meta.color, borderLeftWidth: 4 }]}
            activeOpacity={0.85} onPress={() => router.push(screen as any)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{meta.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: meta.color }]}>
                  {engine.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </Text>
                <Text style={styles.cardDesc}>{meta.desc}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </View>
            {engineTemplates.length > 0 && (
              <View style={styles.templateRow}>
                {engineTemplates.slice(0, 3).map(t => (
                  <View key={t.id} style={[styles.templateChip, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.templateText, { color: meta.color }]} numberOfLines={1}>{t.template_name}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  heading: { fontSize: 22, fontWeight: "800", color: "#1b5e20", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#888", marginBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 14, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardDesc: { fontSize: 12, color: "#888", marginTop: 2, lineHeight: 16 },
  arrow: { fontSize: 24, color: "#ccc", fontWeight: "300" },
  templateRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  templateChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  templateText: { fontSize: 11, fontWeight: "600" },
});
