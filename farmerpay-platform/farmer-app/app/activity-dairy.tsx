/**
 * Activity Dairy — Persona phase per-activity drill-in for DAIRY.
 *
 * Fetches herd data from GET /roots/dairy/v2/profile + /animals,
 * shows herd-level P&L from GET /roots/dairy/v2/pnl/herd,
 * quick actions for daily logging, and individual animal cards.
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

interface Animal {
  animalId: number;
  animalUuid: string;
  tagNumber: string | null;
  species: string;
  breed: string | null;
  status: string;
  lactationStatus: string | null;
  avgDailyMilkLiters: number | null;
}

interface HerdPnl {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  periodLabel: string;
}

interface DairyProfile {
  cows: number;
  buffaloes: number;
  mixed: number;
  avgDailyMilkLiters: number;
}

export default function ActivityDairy() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [profile, setProfile] = useState<DairyProfile | null>(null);
  const [pnl, setPnl] = useState<HerdPnl | null>(null);

  const load = useCallback(async () => {
    try {
      const [profileRes, animalsRes, pnlRes] = await Promise.all([
        apiGet("/roots/dairy/v2/profile").catch(() => null),
        apiGet("/roots/dairy/v2/animals").catch(() => null),
        apiGet("/roots/dairy/v2/pnl/herd").catch(() => null),
      ]);
      setProfile(profileRes?.data || null);
      setAnimals(animalsRes?.data?.animals || animalsRes?.data || []);
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

  const milking = animals.filter(
    (a) => a.lactationStatus === "milking" || a.lactationStatus === "MILKING",
  );
  const totalAnimals = profile
    ? profile.cows + profile.buffaloes + profile.mixed
    : animals.length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4e342e" />
      </View>
    );
  }

  const fmtRupees = (v: number) =>
    `₹${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}`;

  const renderAnimalCard = (animal: Animal) => {
    const isMilking =
      animal.lactationStatus === "milking" || animal.lactationStatus === "MILKING";
    return (
      <TouchableOpacity
        key={animal.animalId}
        style={styles.card}
        onPress={() => router.push(`/dairy-animals?id=${animal.animalId}` as any)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>
            {animal.species === "buffalo" ? "🐃" : "🐄"}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {animal.tagNumber || `${animal.species} #${animal.animalId}`}
            </Text>
            <Text style={styles.cardSub}>
              {animal.breed || animal.species}
              {animal.avgDailyMilkLiters ? ` · ${animal.avgDailyMilkLiters}L/day` : ""}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isMilking ? "#e8f5e9" : "#f5f5f5" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isMilking ? "#2e7d32" : "#888" },
              ]}
            >
              {animal.lactationStatus || animal.status || "—"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
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
          <Text style={styles.headerEmoji}>🐄</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Dairy</Text>
            <Text style={styles.headerSub}>
              {totalAnimals} animals · {milking.length} milking
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push("/setup-dairy?mode=edit" as any)}
          >
            <Text style={styles.editBtnText}>✏️ Edit herd</Text>
          </TouchableOpacity>
        </View>

        {/* Herd stats */}
        {profile && (
          <View style={styles.statsRow}>
            {profile.cows > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{profile.cows}</Text>
                <Text style={styles.statLabel}>Cows</Text>
              </View>
            )}
            {profile.buffaloes > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{profile.buffaloes}</Text>
                <Text style={styles.statLabel}>Buffaloes</Text>
              </View>
            )}
            {profile.mixed > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{profile.mixed}</Text>
                <Text style={styles.statLabel}>Mixed</Text>
              </View>
            )}
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{profile.avgDailyMilkLiters || 0}L</Text>
              <Text style={styles.statLabel}>Avg/day</Text>
            </View>
          </View>
        )}

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
            { label: "Log milk", emoji: "🥛", route: "/dairy-logbook" },
            { label: "Log sale", emoji: "💰", route: "/dairy-logbook" },
            { label: "Log cost", emoji: "📝", route: "/dairy-logbook" },
            { label: "Health", emoji: "💊", route: "/dairy-treatment" },
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

        {/* Contextual money discovery — surfaces bank loans tagged to DAIRY */}
        <ActivityMoneySection activityCode="DAIRY" />

        {/* Animal list */}
        {animals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🐮</Text>
            <Text style={styles.emptyTitle}>No animals registered</Text>
            <Text style={styles.emptySub}>
              Add your first animal to start tracking milk, health, and costs.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionHeader}>Your herd</Text>
            {animals.map(renderAnimalCard)}
          </>
        )}

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/dairy-animals" as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>+ Add an animal</Text>
        </TouchableOpacity>

        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={styles.stickyBottom}>
        <TouchableOpacity
          style={[styles.stickyBtn, { backgroundColor: "#4e342e" }]}
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
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#4e342e" },
  headerSub: { fontSize: 12, color: "#666", marginTop: 2 },
  editBtn: {
    backgroundColor: "#efebe9",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editBtnText: { fontSize: 11, fontWeight: "800", color: "#4e342e" },

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
  statNum: { fontSize: 20, fontWeight: "800", color: "#4e342e" },
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
    borderLeftColor: "#4e342e",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardEmoji: { fontSize: 26 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#4e342e" },
  cardSub: { fontSize: 12, color: "#666", marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize" as any,
  },

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
    borderColor: "#4e342e",
    marginTop: 6,
  },
  addBtnText: { color: "#4e342e", fontSize: 14, fontWeight: "800" },

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
