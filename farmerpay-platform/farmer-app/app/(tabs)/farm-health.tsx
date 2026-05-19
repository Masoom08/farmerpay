/**
 * Farm Health Dashboard — "Am I on Track?"
 *
 * Single-screen visual dashboard showing compliance scores, stage timelines,
 * financials, and alerts across all active farming activities.
 */

import React, { useCallback, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { apiGet } from "../../lib/api";

// ─── Types ───────────────────────────────────────────────────────

interface NextAction {
  name: string;
  dueInDays: number;
}

interface Activity {
  type: string;
  name: string;
  cycleId: number;
  cycleUuid: string;
  overallScore: number | null;
  scoreColor: string;
  currentStage: number;
  totalStages: number;
  stageStatuses: string[];
  nextAction: NextAction | null;
  financials: { spent: number; expected: number; variancePct: number };
  soilHealthAvailable: boolean;
  alerts: string[];
}

interface HealthData {
  activities: Activity[];
  farmHealthScore: number | null;
  farmHealthColor: string;
  pendingActions: number;
  unreadAdvisories: number;
}

const EMOJI_MAP: Record<string, string> = {
  CROP: "🌾", DAIRY: "🐄", FISHERY: "🐟", HORTI: "🥭", POULTRY: "🐔", GOATERY: "🐐",
};

const COLOR_MAP: Record<string, string> = {
  green: "#2e7d32", amber: "#e65100", red: "#c62828", grey: "#999",
};

const BG_MAP: Record<string, string> = {
  green: "#e8f5e9", amber: "#fff3e0", red: "#ffebee", grey: "#f5f5f5",
};

const STATUS_DOT: Record<string, { color: string; symbol: string }> = {
  completed: { color: "#2e7d32", symbol: "●" },
  current: { color: "#1565c0", symbol: "●" },
  delayed: { color: "#e65100", symbol: "●" },
  missed: { color: "#c62828", symbol: "●" },
  skipped: { color: "#999", symbol: "○" },
  upcoming: { color: "#ccc", symbol: "○" },
};

const fmtRupees = (v: number) =>
  `₹${v >= 100000 ? (v / 100000).toFixed(1) + "L" : v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}`;

// ─── Component ───────────────────────────────────────────────────

export default function FarmHealthScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<HealthData | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiGet("/roots/farmer/me/health-summary");
      if (r?.data) setData(r.data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={st.centered}>
        <ActivityIndicator size="large" color="#1b5e20" />
        <Text style={st.loadingText}>Loading health data...</Text>
        <Text style={st.loadingHi}>स्वास्थ्य डेटा लोड हो रहा है...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={st.centered}>
        <Text style={{ fontSize: 40 }}>🌿</Text>
        <Text style={st.emptyTitle}>No active activities</Text>
        <Text style={st.emptyHi}>कोई सक्रिय गतिविधि नहीं</Text>
        <TouchableOpacity style={st.emptyBtn} onPress={() => router.push("/(tabs)" as any)}>
          <Text style={st.emptyBtnText}>Go to Home / होम जाएं →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const healthScore = data.farmHealthScore;
  const healthColor = COLOR_MAP[data.farmHealthColor] || "#999";
  const healthBg = BG_MAP[data.farmHealthColor] || "#f5f5f5";

  return (
    <ScrollView
      style={st.scroll}
      contentContainerStyle={st.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ── Overall Farm Health Score ── */}
      <View style={[st.heroCard, { backgroundColor: healthBg, borderColor: healthColor }]}>
        <View style={st.heroCircle}>
          <View style={[st.scoreCircle, { borderColor: healthColor }]}>
            <Text style={[st.scoreNum, { color: healthColor }]}>
              {healthScore !== null ? Math.round(healthScore) : "—"}
            </Text>
            <Text style={st.scoreMax}>/ 100</Text>
          </View>
        </View>
        <View style={st.heroText}>
          <Text style={st.heroTitle}>🌾 Your Farm Health</Text>
          <Text style={st.heroHi}>आपकी खेती की सेहत</Text>
          <View style={[st.heroBadge, { backgroundColor: healthColor }]}>
            <Text style={st.heroBadgeText}>
              {healthScore !== null && healthScore >= 80 ? "On Track ✓" : healthScore !== null && healthScore >= 60 ? "Needs Attention" : "At Risk ⚠️"}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Quick Stats Row ── */}
      <View style={st.statsRow}>
        <View style={st.statCard}>
          <Text style={st.statNum}>{data.activities.length}</Text>
          <Text style={st.statLabel}>Activities{"\n"}गतिविधियाँ</Text>
        </View>
        <View style={st.statCard}>
          <Text style={[st.statNum, data.pendingActions > 0 && { color: "#e65100" }]}>{data.pendingActions}</Text>
          <Text style={st.statLabel}>Pending{"\n"}बाकी कार्य</Text>
        </View>
        <View style={st.statCard}>
          <Text style={[st.statNum, data.unreadAdvisories > 0 && { color: "#1565c0" }]}>{data.unreadAdvisories}</Text>
          <Text style={st.statLabel}>Advisories{"\n"}सलाह</Text>
        </View>
      </View>

      {/* ── Activity Cards ── */}
      {data.activities.map((act) => {
        const emoji = EMOJI_MAP[act.type] || "🌿";
        const acColor = COLOR_MAP[act.scoreColor] || "#999";
        const acBg = BG_MAP[act.scoreColor] || "#f5f5f5";

        return (
          <TouchableOpacity
            key={`${act.type}-${act.cycleId}`}
            style={st.actCard}
            onPress={() => router.push(`/cycle-detail?id=${act.cycleId}` as any)}
            activeOpacity={0.85}
          >
            {/* Header */}
            <View style={st.actHeader}>
              <Text style={st.actEmoji}>{emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.actName} numberOfLines={1}>{act.name}</Text>
              </View>
              <View style={[st.actScoreBadge, { backgroundColor: acBg }]}>
                <Text style={[st.actScoreText, { color: acColor }]}>
                  {act.overallScore !== null ? Math.round(act.overallScore) : "—"}
                </Text>
              </View>
            </View>

            {/* Stage Timeline */}
            {act.stageStatuses.length > 0 && (
              <View style={st.timeline}>
                {act.stageStatuses.map((status, idx) => {
                  const dot = STATUS_DOT[status] || STATUS_DOT.upcoming;
                  return (
                    <View key={idx} style={st.timelineDotWrap}>
                      <Text style={[st.timelineDot, { color: dot.color }]}>{dot.symbol}</Text>
                      <Text style={st.timelineIdx}>{idx + 1}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Next Action */}
            {act.nextAction && (
              <View style={st.nextActionRow}>
                <Text style={st.nextActionLabel}>Next:</Text>
                <Text style={st.nextActionValue}>
                  {act.nextAction.name}
                  {act.nextAction.dueInDays > 0 ? ` in ${act.nextAction.dueInDays} days` : " — due now!"}
                </Text>
              </View>
            )}

            {/* Financials */}
            <View style={st.finRow}>
              <Text style={st.finText}>
                💰 Spent: {fmtRupees(act.financials.spent)}
                {act.financials.expected > 0 && (
                  ` (Expected: ${fmtRupees(act.financials.expected)})`
                )}
              </Text>
              {act.financials.variancePct > 15 && (
                <Text style={st.finWarn}>⚠️ +{act.financials.variancePct}%</Text>
              )}
            </View>

            {/* Alerts */}
            {act.alerts.length > 0 && (
              <View style={st.alertBox}>
                {act.alerts.map((a, idx) => (
                  <Text key={idx} style={st.alertText}>⚠️ {a}</Text>
                ))}
              </View>
            )}

            {/* Soil badge */}
            {act.soilHealthAvailable && (
              <Text style={st.soilBadge}>🧪 Soil data applied / मिट्टी जाँच लागू</Text>
            )}

            {/* CTA */}
            <Text style={st.actCta}>View Details →</Text>
          </TouchableOpacity>
        );
      })}

      {/* ── Quick Actions ── */}
      <Text style={st.sectionTitle}>Quick Actions / त्वरित कार्य</Text>
      <View style={st.quickRow}>
        <TouchableOpacity
          style={st.quickBtn}
          onPress={() => {
            const firstCycle = data.activities.find((a) => a.type === "CROP");
            if (firstCycle) router.push(`/cycle-detail?id=${firstCycle.cycleId}` as any);
          }}
          activeOpacity={0.7}
        >
          <Text style={st.quickEmoji}>📋</Text>
          <Text style={st.quickLabel}>Pending{"\n"}Entries</Text>
          <Text style={st.quickHi}>बाकी{"\n"}प्रविष्टियाँ</Text>
          {data.pendingActions > 0 && (
            <View style={st.quickBadge}>
              <Text style={st.quickBadgeText}>{data.pendingActions}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={st.quickBtn}
          onPress={() => router.push("/sage-advisories" as any)}
          activeOpacity={0.7}
        >
          <Text style={st.quickEmoji}>💡</Text>
          <Text style={st.quickLabel}>Advisories</Text>
          <Text style={st.quickHi}>सलाह</Text>
          {data.unreadAdvisories > 0 && (
            <View style={st.quickBadge}>
              <Text style={st.quickBadgeText}>{data.unreadAdvisories}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={st.quickBtn}
          onPress={() => router.push("/setup-season" as any)}
          activeOpacity={0.7}
        >
          <Text style={st.quickEmoji}>🌱</Text>
          <Text style={st.quickLabel}>New{"\n"}Season</Text>
          <Text style={st.quickHi}>नया{"\n"}सीज़न</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const st = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  loadingText: { marginTop: 12, color: "#555", fontSize: 14 },
  loadingHi: { color: "#999", fontSize: 12, marginTop: 2 },

  // Empty state
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#333", marginTop: 12 },
  emptyHi: { fontSize: 14, color: "#888", marginTop: 4 },
  emptyBtn: { backgroundColor: "#1b5e20", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 16 },
  emptyBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Hero card
  heroCard: {
    flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 2, gap: 16,
  },
  heroCircle: { alignItems: "center" },
  scoreCircle: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 4,
    justifyContent: "center", alignItems: "center", backgroundColor: "#fff",
  },
  scoreNum: { fontSize: 28, fontWeight: "800" },
  scoreMax: { fontSize: 10, color: "#999", fontWeight: "600" },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 16, fontWeight: "800", color: "#333" },
  heroHi: { fontSize: 12, color: "#666", marginTop: 1 },
  heroBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginTop: 8 },
  heroBadgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  // Stats row
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  statNum: { fontSize: 24, fontWeight: "800", color: "#333" },
  statLabel: { fontSize: 10, color: "#888", textAlign: "center", marginTop: 2 },

  // Activity cards
  actCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  actHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  actEmoji: { fontSize: 26 },
  actName: { fontSize: 14, fontWeight: "800", color: "#333" },
  actScoreBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  actScoreText: { fontSize: 16, fontWeight: "800" },

  // Timeline
  timeline: { flexDirection: "row", gap: 2, marginBottom: 10, flexWrap: "wrap" },
  timelineDotWrap: { alignItems: "center", minWidth: 22 },
  timelineDot: { fontSize: 14 },
  timelineIdx: { fontSize: 8, color: "#bbb" },

  // Next action
  nextActionRow: { flexDirection: "row", marginBottom: 8, gap: 4 },
  nextActionLabel: { fontSize: 12, fontWeight: "700", color: "#555" },
  nextActionValue: { fontSize: 12, color: "#1565c0", fontWeight: "600", flex: 1 },

  // Financials
  finRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  finText: { fontSize: 12, color: "#555" },
  finWarn: { fontSize: 11, color: "#c62828", fontWeight: "700" },

  // Alerts
  alertBox: { backgroundColor: "#ffebee", borderRadius: 8, padding: 8, marginBottom: 6 },
  alertText: { fontSize: 11, color: "#c62828", lineHeight: 16 },

  // Soil badge
  soilBadge: { fontSize: 11, color: "#2e7d32", fontWeight: "600", marginBottom: 4 },

  // CTA
  actCta: { fontSize: 12, color: "#1565c0", fontWeight: "700", textAlign: "right" },

  // Section title
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#333", marginTop: 8, marginBottom: 10 },

  // Quick actions
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  quickBtn: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingVertical: 14, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
    minHeight: 80,
  },
  quickEmoji: { fontSize: 24, marginBottom: 4 },
  quickLabel: { fontSize: 10, fontWeight: "700", color: "#555", textAlign: "center" },
  quickHi: { fontSize: 9, color: "#aaa", textAlign: "center" },
  quickBadge: {
    position: "absolute", top: 6, right: 6, backgroundColor: "#c62828",
    borderRadius: 10, width: 20, height: 20, justifyContent: "center", alignItems: "center",
  },
  quickBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});
