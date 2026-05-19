/**
 * Activity Horticulture — Persona phase per-activity drill-in for HORTI.
 *
 * Fetches orchards from GET /roots/horticulture/orchards and renders
 * them with crop-specific emojis. Quick actions for planting, harvest,
 * irrigation, and inputs. Also pulls horticulture cycles from
 * /roots/cycles/me filtered by HORTI crop codes.
 *
 * Bottom: sticky CTAs for loan + insurance (same pattern as crop).
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
import { apiGet } from "../lib/api";
import ActivityMoneySection from "../components/ActivityMoneySection";

// Known horticulture crop codes (v1 seed subset)
const HORTI_CROPS = new Set([
  "TOMATO", "MARIGOLD", "MANGO", "BANANA", "PAPAYA", "CHILLI",
  "BRINJAL", "OKRA", "ONION", "POTATO", "GRAPES", "POMEGRANATE",
  "GUAVA", "COCONUT", "CASHEW", "ARECANUT", "TURMERIC", "GINGER",
]);

const CROP_EMOJI: Record<string, string> = {
  MANGO: "🥭", BANANA: "🍌", PAPAYA: "🍈", TOMATO: "🍅",
  CHILLI: "🌶️", COCONUT: "🥥", GRAPES: "🍇", POMEGRANATE: "🍎",
  GUAVA: "🍐", ONION: "🧅", POTATO: "🥔", MARIGOLD: "🌼",
};

interface Orchard {
  orchardId: number;
  orchardUuid: string;
  orchardName: string | null;
  cropName: string | null;
  variety: string | null;
  areaHectares: number | null;
  plantCount: number | null;
  infrastructureType: string | null;
}

interface Cycle {
  cycleId: number;
  cropName: string | null;
  cropCode: string | null;
  varietyName: string | null;
  season: string;
  sowingDate: string;
  status: string;
  fieldSizeHectares: number | null;
}

export default function ActivityHorti() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orchards, setOrchards] = useState<Orchard[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);

  const load = useCallback(async () => {
    try {
      const [orchardRes, cycleRes] = await Promise.all([
        apiGet("/roots/horticulture/orchards").catch(() => null),
        apiGet("/roots/cycles/me").catch(() => null),
      ]);
      setOrchards(orchardRes?.data?.orchards || orchardRes?.data || []);
      const allCycles: Cycle[] = cycleRes?.data?.cycles || [];
      setCycles(
        allCycles.filter(
          (c) => c.cropCode && HORTI_CROPS.has(c.cropCode.toUpperCase()),
        ),
      );
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#bf360c" />
      </View>
    );
  }

  const emojiFor = (name: string | null) => {
    if (!name) return "🌿";
    // Try to match crop name against known emoji map
    const upper = name.toUpperCase().trim();
    for (const [key, emoji] of Object.entries(CROP_EMOJI)) {
      if (upper.includes(key)) return emoji;
    }
    return "🌿";
  };

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
          <Text style={styles.headerEmoji}>🥭</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Horticulture</Text>
            <Text style={styles.headerSub}>
              {orchards.length} orchards · {cycles.length} cycles
            </Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          {[
            { label: "Planting", emoji: "🌱", route: "/roots-crop-card?mode=horti" },
            { label: "Harvest", emoji: "🧺", route: "/roots-crop-card?mode=horti" },
            { label: "Irrigation", emoji: "💧", route: "/roots-crop-card?mode=horti" },
            { label: "Inputs", emoji: "🧪", route: "/roots-crop-card?mode=horti" },
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

        {/* Contextual money discovery — surfaces loans tagged to HORTI */}
        <ActivityMoneySection activityCode="HORTI" />

        {/* Orchards */}
        {orchards.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Orchards</Text>
            {orchards.map((orchard) => (
              <TouchableOpacity
                key={orchard.orchardId}
                style={styles.card}
                onPress={() =>
                  router.push(
                    `/cycle-detail?orchardId=${orchard.orchardId}` as any,
                  )
                }
                activeOpacity={0.85}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>
                    {emojiFor(orchard.cropName)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {orchard.orchardName ||
                        orchard.cropName ||
                        `Orchard #${orchard.orchardId}`}
                    </Text>
                    <Text style={styles.cardSub}>
                      {orchard.cropName || ""}
                      {orchard.variety ? ` · ${orchard.variety}` : ""}
                      {orchard.areaHectares ? ` · ${orchard.areaHectares} ha` : ""}
                      {orchard.plantCount
                        ? ` · ${orchard.plantCount} plants`
                        : ""}
                      {orchard.infrastructureType
                        ? ` · ${orchard.infrastructureType.replace(/_/g, " ")}`
                        : ""}
                    </Text>
                  </View>
                  <Text style={styles.cardArrow}>→</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Horti cycles */}
        {cycles.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Cycles</Text>
            {cycles.map((cycle) => (
              <TouchableOpacity
                key={cycle.cycleId}
                style={[styles.card, { borderLeftColor: "#e65100" }]}
                onPress={() =>
                  router.push(`/cycle-detail?id=${cycle.cycleId}` as any)
                }
                activeOpacity={0.85}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>
                    {emojiFor(cycle.cropCode)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {cycle.varietyName || cycle.cropName || "Unnamed"}
                    </Text>
                    <Text style={styles.cardSub}>
                      {cycle.cropName || ""}
                      {cycle.sowingDate ? ` · sown ${cycle.sowingDate}` : ""}
                      {cycle.fieldSizeHectares
                        ? ` · ${cycle.fieldSizeHectares} ha`
                        : ""}
                    </Text>
                  </View>
                  <Text style={styles.cardArrow}>→</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Empty state */}
        {orchards.length === 0 && cycles.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌿</Text>
            <Text style={styles.emptyTitle}>No horti activity yet</Text>
            <Text style={styles.emptySub}>
              Start a new mango, tomato, marigold, or other horti cycle below.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/roots-crop-card?mode=horti" as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>+ Plant a new horti crop</Text>
        </TouchableOpacity>

        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={styles.stickyBottom}>
        <TouchableOpacity
          style={[styles.stickyBtn, { backgroundColor: "#bf360c" }]}
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
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#bf360c" },
  headerSub: { fontSize: 12, color: "#666", marginTop: 2 },

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
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 8,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#bf360c",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardEmoji: { fontSize: 26 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#bf360c" },
  cardSub: { fontSize: 12, color: "#666", marginTop: 2 },
  cardArrow: { fontSize: 18, color: "#999" },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    marginBottom: 16,
  },
  emptyEmoji: { fontSize: 42, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#333", marginBottom: 4 },
  emptySub: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 18,
  },

  addBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#bf360c",
    marginTop: 6,
  },
  addBtnText: { color: "#bf360c", fontSize: 14, fontWeight: "800" },

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
