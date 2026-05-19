/**
 * Activity Fishery — Persona phase per-activity drill-in for FISHERY.
 *
 * Fetches pond + vessel data from GET /roots/fishery/v2/ponds and
 * /vessels, shows farm-level P&L from GET /roots/fishery/v2/pnl/farm,
 * quick actions for stocking, harvesting, and logging.
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

interface Pond {
  pondId: number;
  pondUuid: string;
  pondName: string | null;
  areaAcres: number | null;
  waterSource: string | null;
  status: string;
  species: string | null;
  currentStockCount: number | null;
}

interface Vessel {
  vesselId: number;
  vesselUuid: string;
  vesselName: string | null;
  vesselType: string | null;
  registrationNumber: string | null;
  status: string;
}

interface FarmPnl {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  periodLabel: string;
}

interface FisheryProfile {
  ponds: number;
  vessels: number;
  species: string | null;
  waterSource: string | null;
}

export default function ActivityFishery() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<FisheryProfile | null>(null);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [pnl, setPnl] = useState<FarmPnl | null>(null);

  const load = useCallback(async () => {
    try {
      const [profileRes, pondsRes, vesselsRes, pnlRes] = await Promise.all([
        apiGet("/roots/fishery/v2/profile").catch(() => null),
        apiGet("/roots/fishery/v2/ponds").catch(() => null),
        apiGet("/roots/fishery/v2/vessels").catch(() => null),
        apiGet("/roots/fishery/v2/pnl/farm").catch(() => null),
      ]);
      setProfile(profileRes?.data || null);
      setPonds(pondsRes?.data?.ponds || pondsRes?.data || []);
      setVessels(vesselsRes?.data?.vessels || vesselsRes?.data || []);
      setPnl(pnlRes?.data || null);
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
        <ActivityIndicator size="large" color="#0d47a1" />
      </View>
    );
  }

  const fmtRupees = (v: number) =>
    `₹${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}`;

  const totalPonds = profile?.ponds || ponds.length;
  const totalVessels = profile?.vessels || vessels.length;

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
          <Text style={styles.headerEmoji}>🐟</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Fisheries</Text>
            <Text style={styles.headerSub}>
              {totalPonds} ponds · {totalVessels} vessels
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push("/setup-fishery?mode=edit" as any)}
          >
            <Text style={styles.editBtnText}>✏️ Edit units</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{totalPonds}</Text>
            <Text style={styles.statLabel}>Ponds</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{totalVessels}</Text>
            <Text style={styles.statLabel}>Vessels</Text>
          </View>
          {profile?.species && (
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { fontSize: 14 }]}>
                {profile.species}
              </Text>
              <Text style={styles.statLabel}>Species</Text>
            </View>
          )}
          {profile?.waterSource && (
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { fontSize: 14 }]}>
                {profile.waterSource}
              </Text>
              <Text style={styles.statLabel}>Water</Text>
            </View>
          )}
        </View>

        {/* P&L summary */}
        {pnl && (
          <View style={styles.pnlCard}>
            <Text style={styles.pnlTitle}>
              P&L — {pnl.periodLabel || "This month"}
            </Text>
            <View style={styles.pnlRow}>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={[styles.pnlNum, { color: "#2e7d32" }]}>
                  {fmtRupees(pnl.totalRevenue)}
                </Text>
                <Text style={styles.pnlLabel}>Revenue</Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={[styles.pnlNum, { color: "#c62828" }]}>
                  {fmtRupees(pnl.totalCost)}
                </Text>
                <Text style={styles.pnlLabel}>Cost</Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={[
                    styles.pnlNum,
                    { color: pnl.netProfit >= 0 ? "#2e7d32" : "#c62828" },
                  ]}
                >
                  {fmtRupees(pnl.netProfit)}
                </Text>
                <Text style={styles.pnlLabel}>Profit</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.quickRow}>
          {[
            { label: "Stock", emoji: "🐠", route: "/fishery-ponds" },
            { label: "Harvest", emoji: "🎣", route: "/fishery-ponds" },
            { label: "Log sale", emoji: "💰", route: "/fishery-pnl" },
            { label: "Log cost", emoji: "📝", route: "/fishery-pnl" },
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

        {/* Contextual money discovery — surfaces loans tagged to FISHERY */}
        <ActivityMoneySection activityCode="FISHERY" />

        {/* Ponds list */}
        {ponds.length === 0 && vessels.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🏞️</Text>
            <Text style={styles.emptyTitle}>No ponds or vessels yet</Text>
            <Text style={styles.emptySub}>
              Add your first pond or vessel to start tracking stocking, harvest,
              and costs.
            </Text>
          </View>
        ) : (
          <>
            {ponds.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Ponds</Text>
                {ponds.map((pond) => (
                  <TouchableOpacity
                    key={pond.pondId}
                    style={styles.card}
                    onPress={() =>
                      router.push(`/fishery-ponds?id=${pond.pondId}` as any)
                    }
                    activeOpacity={0.85}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardEmoji}>🏞️</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>
                          {pond.pondName || `Pond #${pond.pondId}`}
                        </Text>
                        <Text style={styles.cardSub}>
                          {pond.areaAcres ? `${pond.areaAcres} acres` : ""}
                          {pond.species ? ` · ${pond.species}` : ""}
                          {pond.currentStockCount
                            ? ` · ${pond.currentStockCount} fish`
                            : ""}
                        </Text>
                      </View>
                      <Text style={styles.cardArrow}>→</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {vessels.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Vessels</Text>
                {vessels.map((vessel) => (
                  <TouchableOpacity
                    key={vessel.vesselId}
                    style={[styles.card, { borderLeftColor: "#1565c0" }]}
                    onPress={() =>
                      router.push(
                        `/fishery-vessels?id=${vessel.vesselId}` as any,
                      )
                    }
                    activeOpacity={0.85}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardEmoji}>⛵</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>
                          {vessel.vesselName || `Vessel #${vessel.vesselId}`}
                        </Text>
                        <Text style={styles.cardSub}>
                          {vessel.vesselType || ""}
                          {vessel.registrationNumber
                            ? ` · ${vessel.registrationNumber}`
                            : ""}
                        </Text>
                      </View>
                      <Text style={styles.cardArrow}>→</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}

        <View style={styles.addRow}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/fishery-ponds" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.addBtnText}>+ Add pond</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: "#1565c0" }]}
            onPress={() => router.push("/fishery-vessels" as any)}
            activeOpacity={0.85}
          >
            <Text style={[styles.addBtnText, { color: "#1565c0" }]}>
              + Add vessel
            </Text>
          </TouchableOpacity>
        </View>

        {/* Trip log shortcut */}
        <TouchableOpacity
          style={styles.tripCard}
          onPress={() => router.push("/fishery-trip" as any)}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 26 }}>🎣</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.tripTitle}>Trip log</Text>
            <Text style={styles.tripSub}>
              Record sea-fishing trips, catch, and revenue
            </Text>
          </View>
          <Text style={styles.cardArrow}>→</Text>
        </TouchableOpacity>

        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={styles.stickyBottom}>
        <TouchableOpacity
          style={[styles.stickyBtn, { backgroundColor: "#0d47a1" }]}
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
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0d47a1" },
  headerSub: { fontSize: 12, color: "#666", marginTop: 2 },
  editBtn: {
    backgroundColor: "#e3f2fd",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editBtnText: { fontSize: 11, fontWeight: "800", color: "#0d47a1" },

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
  statNum: { fontSize: 20, fontWeight: "800", color: "#0d47a1" },
  statLabel: { fontSize: 11, color: "#888", marginTop: 2 },

  pnlCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pnlTitle: { fontSize: 13, fontWeight: "700", color: "#333", marginBottom: 10 },
  pnlRow: { flexDirection: "row" },
  pnlNum: { fontSize: 16, fontWeight: "800" },
  pnlLabel: { fontSize: 11, color: "#888", marginTop: 2 },

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
    borderLeftColor: "#0d47a1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardEmoji: { fontSize: 26 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#0d47a1" },
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

  addRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  addBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#0d47a1",
  },
  addBtnText: { color: "#0d47a1", fontSize: 14, fontWeight: "800" },

  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#e3f2fd",
    borderLeftWidth: 4,
    borderLeftColor: "#0d47a1",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  tripTitle: { fontSize: 14, fontWeight: "800", color: "#0d47a1" },
  tripSub: { fontSize: 11, color: "#555", marginTop: 2 },

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
