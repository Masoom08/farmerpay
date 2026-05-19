/**
 * Verification Status — shows 5-level validation per data target.
 *
 * Each target (name, aadhaar, address, mobile, bank, farm GPS) shows
 * filled/empty dots for levels 1-5 plus next-action nudge cards.
 */

import React, { useCallback, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { apiGet } from "../lib/api";

const TARGET_META: Record<string, { emoji: string; label: string }> = {
  name:              { emoji: "👤", label: "Name" },
  aadhaar:           { emoji: "🪪", label: "Aadhaar" },
  address_permanent: { emoji: "🏠", label: "Address" },
  mobile:            { emoji: "📱", label: "Mobile" },
  bank_account:      { emoji: "🏦", label: "Bank Account" },
  farm_gps:          { emoji: "📍", label: "Farm GPS" },
};

const LEVEL_LABELS = ["", "Self-declared", "App validated", "Geo-tagged", "Field verified", "DPI confirmed"];

const GAP_ROUTES: Record<string, string> = {
  aadhaar: "/aadhaar-verify",
  bank_account: "/borrowing-sources",
  address_permanent: "/borrowing-sources",
  farm_gps: "/borrowing-sources",
};

interface ValidationTarget {
  level: number;
  confidence: number;
  levels: Record<number, { done: boolean; at: string | null }>;
}

export default function ValidationStatus() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<Record<string, ValidationTarget>>({});
  const [overallConfidence, setOverallConfidence] = useState(0);
  const [gaps, setGaps] = useState<Array<{ target: string; currentLevel: number; nextAction: string }>>([]);

  const load = useCallback(async () => {
    try {
      const [sumRes, gapRes] = await Promise.all([
        apiGet("/farmer/validation-summary").catch(() => null),
        apiGet("/farmer/validation-gaps").catch(() => null),
      ]);
      setSummary(sumRes?.data?.summary || {});
      setOverallConfidence(sumRes?.data?.overallConfidence || 0);
      setGaps(gapRes?.data?.gaps || []);
    } catch { /* tolerate */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2e7d32" /></View>;
  }

  const pct = Math.round(overallConfidence);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Overall progress */}
      <View style={styles.overallCard}>
        <Text style={styles.overallTitle}>Verification Status</Text>
        <Text style={styles.overallPct}>{pct}% verified</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { flex: Math.min(pct, 100) / 100 }]} />
        </View>
        <Text style={styles.overallHint}>
          Higher verification = better trust score = bigger loan eligibility
        </Text>
      </View>

      {/* Per-target rows */}
      <Text style={styles.sectionHeader}>Verification by category</Text>
      {Object.entries(TARGET_META).map(([key, meta]) => {
        const target = summary[key];
        const level = target?.level || 0;

        return (
          <View key={key} style={styles.targetRow}>
            <Text style={styles.targetEmoji}>{meta.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.targetLabel}>{meta.label}</Text>
              <Text style={styles.targetLevel}>
                {level === 0 ? "Not started" : `Level ${level} — ${LEVEL_LABELS[level]}`}
              </Text>
            </View>
            <View style={styles.dotsRow}>
              {[1, 2, 3, 4, 5].map(l => (
                <View key={l} style={[styles.dot, l <= level ? styles.dotFilled : styles.dotEmpty]} />
              ))}
            </View>
          </View>
        );
      })}

      {/* Gaps / next actions */}
      {gaps.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>What to do next</Text>
          {gaps.map((gap, i) => {
            const meta = TARGET_META[gap.target] || { emoji: "📋", label: gap.target };
            const route = GAP_ROUTES[gap.target];
            return (
              <TouchableOpacity
                key={i}
                style={styles.gapCard}
                onPress={() => route && router.push(route as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.gapEmoji}>{meta.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gapTitle}>Verify {meta.label}</Text>
                  <Text style={styles.gapAction}>{gap.nextAction}</Text>
                </View>
                {route && <Text style={styles.gapArrow}>→</Text>}
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* Level legend */}
      <Text style={styles.sectionHeader}>Verification levels</Text>
      <View style={styles.legendCard}>
        {[1, 2, 3, 4, 5].map(l => (
          <View key={l} style={styles.legendRow}>
            <View style={[styles.dot, styles.dotFilled, { marginRight: 10 }]} />
            <Text style={styles.legendText}>Level {l}: {LEVEL_LABELS[l]}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },

  overallCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 18, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  overallTitle: { fontSize: 16, fontWeight: "800", color: "#1b5e20" },
  overallPct: { fontSize: 28, fontWeight: "900", color: "#2e7d32", marginTop: 4 },
  progressBar: {
    height: 8, backgroundColor: "#e0e0e0", borderRadius: 4, marginTop: 10, flexDirection: "row",
  },
  progressFill: { height: 8, backgroundColor: "#2e7d32", borderRadius: 4 },
  overallHint: { fontSize: 11, color: "#888", marginTop: 8 },

  sectionHeader: { fontSize: 14, fontWeight: "700", color: "#333", marginBottom: 8, marginLeft: 4, marginTop: 12 },

  targetRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  targetEmoji: { fontSize: 22 },
  targetLabel: { fontSize: 14, fontWeight: "700", color: "#333" },
  targetLevel: { fontSize: 11, color: "#888", marginTop: 2 },
  dotsRow: { flexDirection: "row", gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotFilled: { backgroundColor: "#2e7d32" },
  dotEmpty: { backgroundColor: "#e0e0e0" },

  gapCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff8e1", borderRadius: 12, padding: 14, marginBottom: 8,
    borderLeftWidth: 4, borderLeftColor: "#7c5800",
  },
  gapEmoji: { fontSize: 22 },
  gapTitle: { fontSize: 14, fontWeight: "700", color: "#5d4037" },
  gapAction: { fontSize: 12, color: "#7c5800", marginTop: 2 },
  gapArrow: { fontSize: 18, color: "#7c5800" },

  legendCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  legendRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  legendText: { fontSize: 12, color: "#555" },
});
