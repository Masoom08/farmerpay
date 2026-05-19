/**
 * Warehouse List — browse eNWR-enabled warehouses near the farmer.
 *
 * Reads GET /dice/warehouses (public endpoint, returns the seeded
 * DiceWarehouseRegistry rows filtered to active + eNWR-enabled by
 * default). Activates the dice_warehouse_registries table which was
 * previously dark — backend service shipped but no farmer-app call.
 *
 * Doubles as a PICKER inside the post-harvest apply wizard: if the
 * route is opened with ?mode=picker, tapping a warehouse card
 * routes back to /postharvest-apply with the warehouseId + name
 * attached as query params (expo-router merges them into the
 * wizard's useLocalSearchParams on resume).
 *
 * Plain-browse mode (no ?mode=picker) just renders an info card on
 * tap — v1 doesn't need a warehouse detail screen.
 */

import React, { useCallback, useState } from "react";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
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
import { setWarehousePick } from "../lib/pickerStore";

// ─── Types ───────────────────────────────────────────────────────

interface Warehouse {
  warehouseId: number;
  name: string;
  type: string;
  distanceKm: number | null;
  storageRate: number;
  capacityAvailable: number;
  enwr: boolean;
  coldStorage: boolean;
  gradingAvailable: boolean;
  insuranceAvailable: boolean;
}

// ─── Component ────────────────────────────────────────────────────

export default function WarehouseListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isPicker = params.mode === "picker";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const load = useCallback(async () => {
    try {
      // Default to eNWR-only so farmers only see warehouses that can
      // collateralize a post-harvest loan.
      const res = await apiGet("/dice/warehouses?enwr=true");
      const list: Warehouse[] = Array.isArray(res?.data) ? res.data : [];
      setWarehouses(list);
    } catch {
      setWarehouses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const onPickWarehouse = (wh: Warehouse) => {
    if (isPicker) {
      // Write the pick to the module-level store and pop this screen
      // off the stack. router.back() preserves the wizard's existing
      // form state (router.replace with params would remount it and
      // reset state back to Step 1).
      setWarehousePick(wh.warehouseId, wh.name);
      router.back();
    }
    // Non-picker mode: no-op for v1 (future: open a warehouse detail)
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {isPicker && (
        <View style={styles.pickerBanner}>
          <Text style={styles.pickerBannerText}>
            Tap a warehouse to use it for your loan application
          </Text>
        </View>
      )}

      {warehouses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🏚️</Text>
          <Text style={styles.emptyTitle}>No warehouses available</Text>
          <Text style={styles.emptySub}>
            No eNWR-enabled warehouses are listed in your district yet.
            Check back as we onboard more storage partners.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.countHeader}>
            {warehouses.length} warehouse{warehouses.length === 1 ? "" : "s"} available
          </Text>
          {warehouses.map((wh) => (
            <TouchableOpacity
              key={wh.warehouseId}
              style={styles.card}
              onPress={() => onPickWarehouse(wh)}
              activeOpacity={0.85}
              disabled={!isPicker}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>🏢</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{wh.name}</Text>
                  <Text style={styles.cardSub}>
                    {wh.type.toUpperCase()} · ₹{wh.storageRate}/qtl/day
                  </Text>
                </View>
                {isPicker && <Text style={styles.cardArrow}>→</Text>}
              </View>

              {/* Capacity row */}
              <View style={styles.capacityRow}>
                <Text style={styles.capacityLabel}>Capacity available</Text>
                <Text style={styles.capacityValue}>{wh.capacityAvailable} tonnes</Text>
              </View>

              {/* Badge row */}
              <View style={styles.badgeRow}>
                {wh.enwr && (
                  <View style={[styles.badge, { backgroundColor: "#e8f5e9", borderColor: "#2e7d32" }]}>
                    <Text style={[styles.badgeText, { color: "#2e7d32" }]}>eNWR</Text>
                  </View>
                )}
                {wh.coldStorage && (
                  <View style={[styles.badge, { backgroundColor: "#e3f2fd", borderColor: "#1565c0" }]}>
                    <Text style={[styles.badgeText, { color: "#1565c0" }]}>❄️ Cold storage</Text>
                  </View>
                )}
                {wh.gradingAvailable && (
                  <View style={[styles.badge, { backgroundColor: "#fff8e1", borderColor: "#7c5800" }]}>
                    <Text style={[styles.badgeText, { color: "#7c5800" }]}>🎖️ Grading</Text>
                  </View>
                )}
                {wh.insuranceAvailable && (
                  <View style={[styles.badge, { backgroundColor: "#f3e5f5", borderColor: "#6a1b9a" }]}>
                    <Text style={[styles.badgeText, { color: "#6a1b9a" }]}>🛡️ Insured</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },

  pickerBanner: {
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#1565c0",
  },
  pickerBannerText: { fontSize: 13, color: "#1565c0", fontWeight: "700" },

  countHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#555",
    marginBottom: 10,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  cardEmoji: { fontSize: 26 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#1b5e20" },
  cardSub: { fontSize: 11, color: "#666", marginTop: 2, fontWeight: "600" },
  cardArrow: { fontSize: 18, color: "#1565c0", marginLeft: 4, fontWeight: "900" },

  capacityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  capacityLabel: { fontSize: 12, color: "#555", fontWeight: "600" },
  capacityValue: { fontSize: 13, color: "#222", fontWeight: "800" },

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.2 },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    marginTop: 20,
  },
  emptyEmoji: { fontSize: 42, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#333" },
  emptySub: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
});
