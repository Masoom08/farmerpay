import { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { apiGet, formatRupees } from "../lib/api";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export default function FisheryLogbook() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [ponds, setPonds] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [pnl, setPnl] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pRes = await apiGet("/roots/fishery/v2/profile");
      if (pRes.success) setProfile(pRes.data);

      const [pondsRes, vesselsRes] = await Promise.all([
        apiGet("/roots/fishery/v2/ponds"),
        apiGet("/roots/fishery/v2/vessels"),
      ]);
      if (pondsRes.success) setPonds(pondsRes.data || []);
      if (vesselsRes.success) setVessels(vesselsRes.data || []);

      const start = daysAgo(14);
      const end = daysAgo(0);
      const pnlRes = await apiGet(`/roots/fishery/v2/pnl/farm?startDate=${start}&endDate=${end}`);
      if (pnlRes.success) setPnl(pnlRes.data);
    } catch (e) {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#00695c" /></View>;
  }

  if (!profile) {
    return (
      <View style={s.center}>
        <Text style={s.emptyEmoji}>🐟</Text>
        <Text style={s.emptyTitle}>Set up your fishery first</Text>
        <Text style={s.emptySub}>पहले अपनी मत्स्य पालन सेट करें</Text>
        <TouchableOpacity style={s.emptyBtn} onPress={() => router.push("/fishery-onboarding" as any)}>
          <Text style={s.emptyBtnText}>Start Setup / शुरू करें</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const opType = profile.operation_type || "INLAND";
  const showInland = opType === "INLAND" || opType === "BOTH";
  const showSea = opType === "SEA" || opType === "BOTH";

  const totalCost = Number(pnl?.totalCost || 0);
  const totalRev = Number(pnl?.totalRevenue || 0);
  const net = totalRev - totalCost;
  const netColor = net >= 0 ? "#00695c" : "#c62828";

  const actions: any[] = [
    { icon: "💰", label: "Log Expense",   labelHi: "खर्च",     route: "/fishery-log-cost" },
    { icon: "💵", label: "Log Sale",      labelHi: "बिक्री",    route: "/fishery-log-revenue" },
    { icon: "📊", label: "P&L Report",    labelHi: "लाभ-हानि",  route: "/fishery-pnl" },
  ];
  if (showInland) {
    actions.push({ icon: "🏞️", label: "My Ponds",    labelHi: "तालाब",    route: "/fishery-ponds" });
  }
  if (showSea) {
    actions.push({ icon: "⛵", label: "My Vessels",  labelHi: "नौकाएँ",   route: "/fishery-vessels" });
    actions.push({ icon: "🎣", label: "Log Trip",    labelHi: "यात्रा",    route: "/fishery-trip" });
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.headerEmoji}>🐟</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Fishery Logbook</Text>
          <Text style={s.headerSub}>
            {opType} · {profile.tier} · {profile.entry_mode === "WEEKLY_BULK" ? "Weekly" : "Daily"} entry
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/fishery-onboarding" as any)}>
          <Text style={s.headerGear}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* P&L snapshot */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Last 14 days / पिछले 14 दिन</Text>
        <View style={s.pnlRow}>
          <View style={s.pnlBox}>
            <Text style={s.pnlBoxLabel}>Revenue</Text>
            <Text style={[s.pnlBoxValue, { color: "#00695c" }]}>{formatRupees(totalRev)}</Text>
          </View>
          <View style={s.pnlBox}>
            <Text style={s.pnlBoxLabel}>Cost</Text>
            <Text style={[s.pnlBoxValue, { color: "#c62828" }]}>{formatRupees(totalCost)}</Text>
          </View>
          <View style={s.pnlBox}>
            <Text style={s.pnlBoxLabel}>Net</Text>
            <Text style={[s.pnlBoxValue, { color: netColor }]}>{formatRupees(net)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push("/fishery-pnl" as any)} style={s.pnlLink}>
          <Text style={s.pnlLinkText}>View full P&L →</Text>
        </TouchableOpacity>
      </View>

      {/* Assets cards */}
      {showInland && (
        <TouchableOpacity style={s.card} onPress={() => router.push("/fishery-ponds" as any)} activeOpacity={0.7}>
          <Text style={s.cardLabel}>Inland Ponds / अंतर्देशीय तालाब</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={s.assetCount}>{ponds.length}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.assetLabel}>ponds active</Text>
              <Text style={s.assetSub}>
                {ponds.reduce((a, p) => a + parseFloat(p.pond_area_hectares || 0), 0).toFixed(2)} ha total
              </Text>
            </View>
            <Text style={s.arrow}>›</Text>
          </View>
        </TouchableOpacity>
      )}

      {showSea && (
        <TouchableOpacity style={s.card} onPress={() => router.push("/fishery-vessels" as any)} activeOpacity={0.7}>
          <Text style={s.cardLabel}>Sea Vessels / समुद्री नौकाएँ</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={s.assetCount}>{vessels.length}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.assetLabel}>vessels active</Text>
              <Text style={s.assetSub}>
                {vessels.filter((v) => v.vessel_type === "MECHANIZED_BOAT").length} mechanized
              </Text>
            </View>
            <Text style={s.arrow}>›</Text>
          </View>
        </TouchableOpacity>
      )}

      <Text style={s.sectionTitle}>Quick Actions / त्वरित क्रियाएँ</Text>
      <View style={s.grid}>
        {actions.map((a, i) => (
          <TouchableOpacity
            key={i}
            style={s.actionCard}
            onPress={() => router.push(a.route as any)}
            activeOpacity={0.7}
          >
            <Text style={s.actionIcon}>{a.icon}</Text>
            <Text style={s.actionLabel}>{a.label}</Text>
            <Text style={s.actionLabelHi}>{a.labelHi}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5", padding: 20 },
  emptyEmoji: { fontSize: 64, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  emptySub: { fontSize: 13, color: "#888", marginTop: 4, marginBottom: 20 },
  emptyBtn: { backgroundColor: "#00695c", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  emptyBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  header: { backgroundColor: "#004d40", borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  headerEmoji: { fontSize: 32 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  headerSub: { color: "#80cbc4", fontSize: 12, marginTop: 2 },
  headerGear: { fontSize: 22 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardLabel: { fontSize: 12, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  pnlRow: { flexDirection: "row", gap: 8 },
  pnlBox: { flex: 1, backgroundColor: "#fafafa", borderRadius: 10, padding: 12, alignItems: "center" },
  pnlBoxLabel: { fontSize: 11, color: "#888", marginBottom: 4 },
  pnlBoxValue: { fontSize: 15, fontWeight: "800" },
  pnlLink: { marginTop: 12, alignSelf: "flex-end" },
  pnlLinkText: { color: "#00695c", fontSize: 13, fontWeight: "700" },
  assetCount: { fontSize: 36, fontWeight: "900", color: "#004d40" },
  assetLabel: { fontSize: 14, fontWeight: "700", color: "#333" },
  assetSub: { fontSize: 11, color: "#888", marginTop: 2 },
  arrow: { fontSize: 28, color: "#00695c" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 10, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: { width: "31%", backgroundColor: "#fff", borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#e0f2f1", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  actionIcon: { fontSize: 26, marginBottom: 6 },
  actionLabel: { fontSize: 11, fontWeight: "700", color: "#333", textAlign: "center" },
  actionLabelHi: { fontSize: 9, color: "#888", marginTop: 1, textAlign: "center" },
});
