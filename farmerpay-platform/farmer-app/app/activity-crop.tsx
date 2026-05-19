/**
 * Activity Crop — Persona phase per-activity drill-in for CROP.
 *
 * Lists all of the farmer's cultivation cycles from GET /roots/cycles/me.
 * Each cycle card shows variety, stage (if derived), sowing date, and
 * any pending SAGE advisories. Tapping a cycle → /cycle-detail?id=N.
 *
 * Bottom: "+ Plant a new crop" → /roots-crop-card (the existing simplified
 * variety picker from Phase 1). Fall-through bottom CTAs (loan / insurance).
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

interface Cycle {
  cycleId: number;
  cycleUuid: string;
  cropName: string | null;
  cropCode: string | null;
  varietyName: string | null;
  season: string;
  year: number;
  sowingDate: string;
  status: string;
  fieldName: string | null;
  fieldSizeHectares: number | null;
}

export default function ActivityCrop() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cycles, setCycles] = useState<Cycle[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await apiGet("/roots/cycles/me");
      setCycles(r?.data?.cycles || []);
    } catch {
      setCycles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const running = cycles.filter((c) => c.status !== "closed" && c.status !== "post_harvest");
  const harvested = cycles.filter((c) => c.status === "post_harvest" || c.status === "closed");

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  const renderCycleCard = (cycle: Cycle) => {
    const daysSinceSowing = cycle.sowingDate
      ? Math.floor((Date.now() - new Date(cycle.sowingDate).getTime()) / (24 * 60 * 60 * 1000))
      : null;
    return (
      <TouchableOpacity
        key={cycle.cycleId}
        style={styles.card}
        onPress={() => router.push(`/cycle-detail?id=${cycle.cycleId}` as any)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>🌾</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {cycle.varietyName || cycle.cropName || "Unnamed cycle"}
            </Text>
            <Text style={styles.cardSub}>
              {cycle.cropName || ""}{" "}
              {daysSinceSowing != null && `· day ${daysSinceSowing}`}
            </Text>
          </View>
          <Text style={styles.cardArrow}>→</Text>
        </View>
        <Text style={styles.cardMeta}>
          {cycle.fieldSizeHectares ? `${cycle.fieldSizeHectares} ha · ` : ""}
          Sown {cycle.sowingDate} · {cycle.season}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🌾</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Crop farming</Text>
            <Text style={styles.headerSub}>
              {running.length} running · {harvested.length} harvested
            </Text>
          </View>
        </View>

        {/* PULSE Phase 1 — Sell-or-Store wizard banner. Only renders
            when the farmer has at least one cycle in 'post_harvest'
            state, so the prompt is contextual ("decide what to do
            with THIS specific harvest"). Routes to /sell-or-store
            with the most-recent post-harvest cycle pre-picked via
            ?cycleId. The wizard auto-loads cost + harvest data from
            ROOTS and shows a SELL NOW / STORE FOR X DAYS recommendation. */}
        {harvested.length > 0 && (() => {
          const latestHarvest = harvested[0];
          const variety = latestHarvest.varietyName || latestHarvest.cropName || "harvest";
          return (
            <TouchableOpacity
              style={styles.harvestBanner}
              onPress={() =>
                router.push({
                  pathname: "/sell-or-store" as any,
                  params: { cycleId: latestHarvest.cycleUuid },
                })
              }
              activeOpacity={0.85}
            >
              <Text style={styles.harvestBannerEmoji}>📊</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.harvestBannerTitle}>
                  Decide what to do with your {variety} harvest
                </Text>
                <Text style={styles.harvestBannerSub}>
                  Run the sell-or-store calculator with auto-pulled cost + EMI
                </Text>
              </View>
              <Text style={styles.harvestBannerArrow}>→</Text>
            </TouchableOpacity>
          );
        })()}

        {/* Contextual money discovery — surfaces bank loans tagged to
            CROP (loan_type in {kcc, crop_loan, input_loan, kcc_gold,
            agri_gold}) and a link to the bookmarks list. Lives inline
            above the cycle list so a farmer browsing her crop doesn't
            need to bounce to the Loans tab. */}
        <ActivityMoneySection activityCode="CROP" />

        {cycles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>No cycles yet</Text>
            <Text style={styles.emptySub}>
              Plant your first crop to start tracking stages, tasks, and harvest.
            </Text>
          </View>
        ) : (
          <>
            {running.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Running cycles</Text>
                {running.map(renderCycleCard)}
              </>
            )}
            {harvested.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Harvested</Text>
                {harvested.map(renderCycleCard)}
              </>
            )}
          </>
        )}

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/roots-crop-card" as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>+ Plant a new crop</Text>
        </TouchableOpacity>

        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={styles.stickyBottom}>
        <TouchableOpacity
          style={[styles.stickyBtn, { backgroundColor: "#2e7d32" }]}
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },

  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  headerEmoji: { fontSize: 34 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1b5e20" },
  headerSub: { fontSize: 12, color: "#666", marginTop: 2 },

  sectionHeader: { fontSize: 12, fontWeight: "700", color: "#666", marginBottom: 8, marginLeft: 4, marginTop: 8 },

  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: "#2e7d32",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardEmoji: { fontSize: 26 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#1b5e20" },
  cardSub: { fontSize: 12, color: "#666", marginTop: 2 },
  cardMeta: { fontSize: 11, color: "#888", marginTop: 8 },
  cardArrow: { fontSize: 18, color: "#999" },

  emptyCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 28, alignItems: "center", marginBottom: 16,
  },
  emptyEmoji: { fontSize: 42, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#333", marginBottom: 4 },
  emptySub: { fontSize: 13, color: "#666", textAlign: "center", lineHeight: 18 },

  addBtn: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, alignItems: "center",
    borderWidth: 1.5, borderColor: "#2e7d32", marginTop: 6,
  },
  addBtnText: { color: "#2e7d32", fontSize: 14, fontWeight: "800" },

  // PULSE Phase 1 — sell-or-store banner styles. Amber palette (matches
  // the persona-home Quick action colour scheme) so it reads as a
  // "next action" prompt rather than an alert.
  harvestBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff8e1",
    borderLeftWidth: 4,
    borderLeftColor: "#7c5800",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  harvestBannerEmoji: { fontSize: 28 },
  harvestBannerTitle: {
    fontSize: 14, fontWeight: "900", color: "#7c5800",
  },
  harvestBannerSub: {
    fontSize: 11, color: "#5d4037", marginTop: 3, lineHeight: 15,
  },
  harvestBannerArrow: {
    fontSize: 22, color: "#7c5800", fontWeight: "900",
  },

  stickyBottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", gap: 8, padding: 12,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e8e8e8",
  },
  stickyBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  stickyBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
