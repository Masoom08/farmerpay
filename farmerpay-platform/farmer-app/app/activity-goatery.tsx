/**
 * Activity Goatery — Persona phase per-activity drill-in for GOATERY.
 *
 * Fetches herd counts from subscription notes (v1 workaround),
 * PoP progress from GET /farmer/pop/GOATERY/progress, and surfaces
 * practice tracking touchpoints the farmer can complete.
 *
 * Bottom: sticky CTAs for loan + insurance.
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
  Alert,
  Platform,
} from "react-native";
import { apiGet, apiPost } from "../lib/api";
import ActivityMoneySection from "../components/ActivityMoneySection";

interface HerdCounts {
  stallFed: number;
  grazing: number;
  sheep: number;
  total: number;
}

// Raw shapes from GET /farmer/pop/GOATERY/progress
interface RawPopStage {
  id: number;
  activityCode: string;
  stageKey: string;
  stageOrder: number;
  labelEn: string;
  labelHi: string | null;
  icon: string | null;
  descriptionEn: string | null;
}

interface RawPopTouchpoint {
  touchpointNumber: number;
  stageKey: string;
  cadence: string;
  nameEn: string;
  nameHi: string | null;
  descriptionEn: string | null;
  status: "PENDING" | "CURRENT" | "DONE" | "SKIPPED";
  completedAt: string | null;
  score: number | null;
  expectedCostInr: number | null;
}

// Grouped for UI
interface GroupedStage {
  stageKey: string;
  label: string;
  icon: string | null;
  order: number;
  description: string | null;
  touchpoints: RawPopTouchpoint[];
}

const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") window.alert(`${title}\n${message}`);
  else Alert.alert(title, message);
};

export default function ActivityGoatery() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [herd, setHerd] = useState<HerdCounts | null>(null);
  const [grouped, setGrouped] = useState<GroupedStage[]>([]);
  const [counts, setCounts] = useState({ done: 0, total: 0 });
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const parseNotes = (notes: string | null): HerdCounts | null => {
    if (!notes) return null;
    const m = (key: string) => {
      const match = notes.match(new RegExp(`${key}=(\\d+)`));
      return match ? parseInt(match[1], 10) : 0;
    };
    const stallFed = m("stall_fed");
    const grazing = m("grazing");
    const sheep = m("sheep");
    return { stallFed, grazing, sheep, total: stallFed + grazing + sheep };
  };

  const load = useCallback(async () => {
    try {
      const [subsRes, popRes] = await Promise.all([
        apiGet("/farmer/activity-subscriptions").catch(() => null),
        apiGet("/farmer/pop/GOATERY/progress").catch(() => null),
      ]);

      // Parse herd counts from subscription notes
      const items = subsRes?.data?.items || [];
      const goatery = items.find((s: any) => s.activityCode === "GOATERY");
      setHerd(goatery ? parseNotes(goatery.notes) : null);

      // Build grouped stages from flat stages[] + touchpoints[]
      const rawStages: RawPopStage[] = popRes?.data?.stages || [];
      const rawTps: RawPopTouchpoint[] = popRes?.data?.touchpoints || [];
      const tpsByStage = new Map<string, RawPopTouchpoint[]>();
      for (const tp of rawTps) {
        const arr = tpsByStage.get(tp.stageKey) || [];
        arr.push(tp);
        tpsByStage.set(tp.stageKey, arr);
      }
      const g: GroupedStage[] = rawStages
        .sort((a, b) => a.stageOrder - b.stageOrder)
        .map((s) => ({
          stageKey: s.stageKey,
          label: s.labelEn,
          icon: s.icon,
          order: s.stageOrder,
          description: s.descriptionEn,
          touchpoints: tpsByStage.get(s.stageKey) || [],
        }));
      setGrouped(g);
      setCounts(popRes?.data?.counts || { done: 0, total: rawTps.length });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const completeTouchpoint = async (touchpointNumber: number) => {
    try {
      await apiPost("/farmer/pop/GOATERY/touchpoints", {
        touchpointNumber,
        status: "DONE",
      });
      showAlert("Done", "Practice marked as complete");
      load();
    } catch {
      showAlert("Error", "Could not update practice");
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6a1b9a" />
      </View>
    );
  }

  const completedCount = counts.done;
  const totalCount = counts.total;

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🐐</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Goatery</Text>
            <Text style={styles.headerSub}>
              {herd ? `${herd.total} animals` : "No herd data yet"}
              {totalCount > 0 && ` · ${completedCount}/${totalCount} practices`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push("/setup-goatery?mode=edit" as any)}
          >
            <Text style={styles.editBtnText}>✏️ Edit herd</Text>
          </TouchableOpacity>
        </View>

        {/* Herd stats */}
        {herd && herd.total > 0 && (
          <View style={styles.statsRow}>
            {herd.stallFed > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{herd.stallFed}</Text>
                <Text style={styles.statLabel}>Stall-fed</Text>
              </View>
            )}
            {herd.grazing > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{herd.grazing}</Text>
                <Text style={styles.statLabel}>Grazing</Text>
              </View>
            )}
            {herd.sheep > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{herd.sheep}</Text>
                <Text style={styles.statLabel}>Sheep</Text>
              </View>
            )}
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{herd.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.quickRow}>
          {[
            { label: "Kidding", emoji: "🐣", route: "/setup-goatery?mode=edit" },
            { label: "Vaccination", emoji: "💉", route: "/setup-goatery?mode=edit" },
            { label: "Sale", emoji: "💰", route: "/setup-goatery?mode=edit" },
            { label: "Feed log", emoji: "🌿", route: "/setup-goatery?mode=edit" },
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.quickBtn}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contextual money discovery */}
        <ActivityMoneySection activityCode="GOATERY" />

        {/* PoP Practice Tracking */}
        {grouped.length > 0 ? (
          <>
            <Text style={styles.sectionHeader}>📋 Recommended practices</Text>
            {totalCount > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {completedCount}/{totalCount} done
                </Text>
              </View>
            )}

            {grouped.map((stage) => {
              const isExpanded = expandedStage === stage.stageKey;
              const done = stage.touchpoints.filter((t) => t.status === "DONE").length;
              const stageTotal = stage.touchpoints.length;

              return (
                <View key={stage.stageKey}>
                  <TouchableOpacity
                    style={[
                      styles.stageCard,
                      done === stageTotal && stageTotal > 0 && styles.stageCardDone,
                    ]}
                    onPress={() =>
                      setExpandedStage(isExpanded ? null : stage.stageKey)
                    }
                    activeOpacity={0.85}
                  >
                    <View style={styles.stageHeader}>
                      <Text style={styles.stageName}>{stage.icon ? `${stage.icon} ` : ""}{stage.label}</Text>
                      <Text style={styles.stageCount}>
                        {done}/{stageTotal}
                      </Text>
                    </View>
                    {stage.description && (
                      <Text style={styles.stageDesc}>{stage.description}</Text>
                    )}
                  </TouchableOpacity>

                  {isExpanded &&
                    stage.touchpoints.map((tp) => {
                      const isDone = tp.status === "DONE";
                      const isCurrent = tp.status === "CURRENT";
                      return (
                        <View key={tp.touchpointNumber} style={[styles.tpCard, isCurrent && { borderLeftColor: "#6a1b9a" }]}>
                          <View style={styles.tpHeader}>
                            <Text
                              style={[
                                styles.tpDot,
                                { color: isDone ? "#2e7d32" : isCurrent ? "#6a1b9a" : "#bbb" },
                              ]}
                            >
                              {isDone ? "✓" : isCurrent ? "●" : "○"}
                            </Text>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.tpName,
                                  isDone && styles.tpNameDone,
                                ]}
                              >
                                {tp.nameEn}
                              </Text>
                              {tp.descriptionEn && (
                                <Text style={styles.tpDesc}>
                                  {tp.descriptionEn}
                                </Text>
                              )}
                              {tp.cadence && (
                                <Text style={[styles.tpDesc, { color: "#6a1b9a" }]}>
                                  {tp.cadence.toLowerCase().replace("_", " ")}
                                </Text>
                              )}
                            </View>
                            {!isDone && (
                              <TouchableOpacity
                                style={styles.tpDoneBtn}
                                onPress={() =>
                                  completeTouchpoint(tp.touchpointNumber)
                                }
                              >
                                <Text style={styles.tpDoneText}>✓ Done</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}
                </View>
              );
            })}
          </>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.infoEmoji}>📋</Text>
            <Text style={styles.infoTitle}>
              Practice tracking coming soon
            </Text>
            <Text style={styles.infoText}>
              Detailed per-animal tracking (kidding, sales, treatment, feeding)
              will be available in a future release. For now, use the quick
              actions above or edit your herd counts.
            </Text>
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={styles.stickyBottom}>
        <TouchableOpacity
          style={[styles.stickyBtn, { backgroundColor: "#6a1b9a" }]}
          onPress={() => router.push("/loan-apply" as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.stickyBtnText}>🏦 Need a loan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.stickyBtn, { backgroundColor: "#1565c0" }]}
          onPress={() => router.push("/insurance" as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.stickyBtnText}>🛡️ Insurance</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  headerEmoji: { fontSize: 34 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#6a1b9a" },
  headerSub: { fontSize: 12, color: "#666", marginTop: 2 },
  editBtn: {
    backgroundColor: "#f3e5f5",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editBtnText: { fontSize: 11, fontWeight: "800", color: "#6a1b9a" },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statNum: { fontSize: 20, fontWeight: "800", color: "#6a1b9a" },
  statLabel: { fontSize: 11, color: "#888", marginTop: 2 },

  quickRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  quickBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickLabel: { fontSize: 11, fontWeight: "700", color: "#555", marginTop: 4 },

  sectionHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: "#333",
    marginTop: 8,
    marginBottom: 10,
  },

  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    backgroundColor: "#6a1b9a",
    borderRadius: 4,
  },
  progressText: { fontSize: 12, fontWeight: "700", color: "#6a1b9a" },

  stageCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#6a1b9a",
  },
  stageCardDone: { opacity: 0.65, borderLeftColor: "#2e7d32" },
  stageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stageName: { fontSize: 14, fontWeight: "800", color: "#333", flex: 1 },
  stageCount: { fontSize: 12, fontWeight: "700", color: "#6a1b9a" },
  stageDesc: { fontSize: 12, color: "#666", marginTop: 4 },

  tpCard: {
    marginLeft: 20,
    backgroundColor: "#fafafa",
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#e0e0e0",
  },
  tpHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  tpDot: { fontSize: 16, fontWeight: "800", width: 20 },
  tpName: { fontSize: 13, fontWeight: "700", color: "#333" },
  tpNameDone: { color: "#999", textDecorationLine: "line-through" },
  tpDesc: { fontSize: 11, color: "#888", marginTop: 2 },
  tpDoneBtn: {
    backgroundColor: "#e8f5e9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tpDoneText: { fontSize: 11, fontWeight: "800", color: "#2e7d32" },

  infoCard: {
    backgroundColor: "#f3e5f5",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    marginTop: 8,
  },
  infoEmoji: { fontSize: 36, marginBottom: 8 },
  infoTitle: { fontSize: 15, fontWeight: "800", color: "#4a148c", marginBottom: 6 },
  infoText: { fontSize: 13, color: "#6a1b9a", textAlign: "center", lineHeight: 19 },

  stickyBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e8e8e8",
  },
  stickyBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  stickyBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
