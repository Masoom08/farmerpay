/**
 * Activity Poultry — Persona phase per-activity drill-in for POULTRY.
 *
 * Fetches flock counts from subscription notes (v1 workaround),
 * PoP progress from GET /farmer/pop/POULTRY/progress, and surfaces
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

interface FlockCounts {
  broilers: number;
  layers: number;
  native: number;
  total: number;
}

// Raw shapes from GET /farmer/pop/POULTRY/progress
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

export default function ActivityPoultry() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flock, setFlock] = useState<FlockCounts | null>(null);
  const [grouped, setGrouped] = useState<GroupedStage[]>([]);
  const [counts, setCounts] = useState({ done: 0, total: 0 });
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const parseNotes = (notes: string | null): FlockCounts | null => {
    if (!notes) return null;
    const m = (key: string) => {
      const match = notes.match(new RegExp(`${key}=(\\d+)`));
      return match ? parseInt(match[1], 10) : 0;
    };
    const broilers = m("broilers");
    const layers = m("layers");
    const native_ = m("native");
    return { broilers, layers, native: native_, total: broilers + layers + native_ };
  };

  const load = useCallback(async () => {
    try {
      const [subsRes, popRes] = await Promise.all([
        apiGet("/farmer/activity-subscriptions").catch(() => null),
        apiGet("/farmer/pop/POULTRY/progress").catch(() => null),
      ]);

      const items = subsRes?.data?.items || [];
      const poultry = items.find((s: any) => s.activityCode === "POULTRY");
      setFlock(poultry ? parseNotes(poultry.notes) : null);

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
      await apiPost("/farmer/pop/POULTRY/touchpoints", {
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
        <ActivityIndicator size="large" color="#e65100" />
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
          <Text style={styles.headerEmoji}>🐔</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Poultry</Text>
            <Text style={styles.headerSub}>
              {flock ? `${flock.total} birds` : "No flock data yet"}
              {totalCount > 0 && ` · ${completedCount}/${totalCount} practices`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push("/setup-poultry?mode=edit" as any)}
          >
            <Text style={styles.editBtnText}>✏️ Edit flock</Text>
          </TouchableOpacity>
        </View>

        {/* Flock stats */}
        {flock && flock.total > 0 && (
          <View style={styles.statsRow}>
            {flock.broilers > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{flock.broilers}</Text>
                <Text style={styles.statLabel}>Broilers</Text>
              </View>
            )}
            {flock.layers > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{flock.layers}</Text>
                <Text style={styles.statLabel}>Layers</Text>
              </View>
            )}
            {flock.native > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{flock.native}</Text>
                <Text style={styles.statLabel}>Native</Text>
              </View>
            )}
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{flock.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.quickRow}>
          {[
            { label: "Egg log", emoji: "🥚", route: "/setup-poultry?mode=edit" },
            { label: "Vaccination", emoji: "💉", route: "/setup-poultry?mode=edit" },
            { label: "Feed log", emoji: "🌾", route: "/setup-poultry?mode=edit" },
            { label: "Sale", emoji: "💰", route: "/setup-poultry?mode=edit" },
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
        <ActivityMoneySection activityCode="POULTRY" />

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
                        <View key={tp.touchpointNumber} style={[styles.tpCard, isCurrent && { borderLeftColor: "#e65100" }]}>
                          <View style={styles.tpHeader}>
                            <Text
                              style={[
                                styles.tpDot,
                                { color: isDone ? "#2e7d32" : isCurrent ? "#e65100" : "#bbb" },
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
                                <Text style={[styles.tpDesc, { color: "#e65100" }]}>
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
              Detailed per-flock tracking (vaccination, feed, egg production,
              sales) will be available in a future release. For now, use the
              quick actions above or edit your flock counts.
            </Text>
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={styles.stickyBottom}>
        <TouchableOpacity
          style={[styles.stickyBtn, { backgroundColor: "#e65100" }]}
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
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#e65100" },
  headerSub: { fontSize: 12, color: "#666", marginTop: 2 },
  editBtn: {
    backgroundColor: "#fff3e0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editBtnText: { fontSize: 11, fontWeight: "800", color: "#e65100" },

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
  statNum: { fontSize: 20, fontWeight: "800", color: "#e65100" },
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
    backgroundColor: "#e65100",
    borderRadius: 4,
  },
  progressText: { fontSize: 12, fontWeight: "700", color: "#e65100" },

  stageCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#e65100",
  },
  stageCardDone: { opacity: 0.65, borderLeftColor: "#2e7d32" },
  stageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stageName: { fontSize: 14, fontWeight: "800", color: "#333", flex: 1 },
  stageCount: { fontSize: 12, fontWeight: "700", color: "#e65100" },
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
    backgroundColor: "#fff3e0",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    marginTop: 8,
  },
  infoEmoji: { fontSize: 36, marginBottom: 8 },
  infoTitle: { fontSize: 15, fontWeight: "800", color: "#bf360c", marginBottom: 6 },
  infoText: { fontSize: 13, color: "#e65100", textAlign: "center", lineHeight: 19 },

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
