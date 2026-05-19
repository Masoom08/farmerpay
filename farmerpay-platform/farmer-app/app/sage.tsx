/**
 * SAGE Advisory Feed (Phase 1)
 *
 * Renders ₹-framed mock advisories from GET /sage/feed/me. Each card shows
 * an icon, title, body, and a ₹-impact pill. "Mark as done" hits
 * /sage/feed/acknowledge and the card disappears from the feed.
 *
 * SHC chip in the header tells the farmer whether the feed is personalised
 * to her soil card or not. Empty state is honest about Phase 2 ("come back
 * at 5 AM tomorrow").
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { apiGet, apiPost } from "../lib/api";

// ─── Types ─────────────────────────────────────────────────────────

interface FeedAdvisory {
  advisoryId: number;
  title: string | null;
  body: string;
  icon: string | null;
  rupeeImpact: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  urgency: "low" | "medium" | "high" | "critical";
  source: string | null;
  acknowledged: boolean;
  advisoryClass: string | null;
  // Phase 2A — stage-aware engine cards
  varietyName?: string | null;
  stageName?: string | null;
}

interface GoogleConfirmation {
  detectedCropCode: string | null;
  sowingDate: string | null;
  harvestDate: string | null;
  daysSinceSowing: number | null;
  confidence: number | null;
  latestNdvi: number | null;
  areaHectares: number | null;
  source: string | null;
}

interface FeedResponse {
  success: boolean;
  data: {
    advisories: FeedAdvisory[];
    shcStatus: "captured" | "skipped" | null;
    nextEmi: { dueDate: string; dueAmount: number; applicationId: number } | null;
    googleConfirmation: GoogleConfirmation | null;
  };
}

// ─── Helpers ───────────────────────────────────────────────────────

function urgencyColor(u: string): string {
  if (u === "critical") return "#c62828";
  if (u === "high") return "#e65100";
  if (u === "medium") return "#1565c0";
  return "#2e7d32";
}

// ─── Component ─────────────────────────────────────────────────────

export default function SageFeedScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [advisories, setAdvisories] = useState<FeedAdvisory[]>([]);
  const [shcStatus, setShcStatus] = useState<"captured" | "skipped" | null>(null);
  const [nextEmi, setNextEmi] = useState<FeedResponse["data"]["nextEmi"]>(null);
  const [googleConfirmation, setGoogleConfirmation] = useState<GoogleConfirmation | null>(null);

  const load = useCallback(async () => {
    try {
      const r: FeedResponse = await apiGet("/sage/feed/me");
      if (r?.success && r.data) {
        setAdvisories((r.data.advisories || []).filter((a) => !a.acknowledged));
        setShcStatus(r.data.shcStatus);
        setNextEmi(r.data.nextEmi);
        setGoogleConfirmation(r.data.googleConfirmation || null);
      }
    } catch {
      /* swallow — empty state will render */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  // Phase 2A — explicit "Refresh advisories" button. Triggers the engine
  // for all the auth'd farmer's active cycles, then reloads the feed.
  // Useful when the cron is off (default) and the farmer just created a
  // cycle and wants to see the engine output immediately.
  const [enginePending, setEnginePending] = useState(false);
  const refreshAdvisories = async () => {
    setEnginePending(true);
    try {
      await apiPost("/sage/engine/run-farmer/me", {});
    } catch {
      /* engine errors are not user-facing — we just reload */
    }
    await load();
    setEnginePending(false);
  };

  const acknowledge = async (advisoryId: number, ctaUrl?: string | null) => {
    setAdvisories((prev) => prev.filter((a) => a.advisoryId !== advisoryId));
    try {
      await apiPost("/sage/feed/acknowledge", { advisoryId, actionTaken: true });
    } catch {
      /* optimistic — leave removed even if the network call fails */
    }
    if (ctaUrl) {
      Linking.openURL(ctaUrl).catch(() => {});
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Advice for your field</Text>
          <Text style={styles.headerSub}>आपके खेत की सलाह</Text>
        </View>
        <View
          style={[
            styles.shcChip,
            shcStatus === "captured" ? styles.shcChipOk : styles.shcChipMissing,
          ]}
        >
          <Text
            style={[
              styles.shcChipText,
              shcStatus === "captured" ? styles.shcChipTextOk : styles.shcChipTextMissing,
            ]}
          >
            {shcStatus === "captured" ? "Based on your soil card" : "Add soil card to improve"}
          </Text>
        </View>
      </View>

      {googleConfirmation && googleConfirmation.detectedCropCode && (
        <View style={styles.satBanner}>
          <Text style={styles.satBannerEmoji}>🛰️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.satBannerTitle}>
              Crop confirmed: {googleConfirmation.detectedCropCode}
              {googleConfirmation.confidence != null && ` (${Math.round(googleConfirmation.confidence * 100)}%)`}
            </Text>
            <Text style={styles.satBannerSub}>
              {googleConfirmation.sowingDate ? `Sown ${googleConfirmation.sowingDate}` : ""}
              {googleConfirmation.daysSinceSowing != null ? ` • Day ${googleConfirmation.daysSinceSowing}` : ""}
              {googleConfirmation.areaHectares != null ? ` • ${googleConfirmation.areaHectares} ha` : ""}
              {googleConfirmation.latestNdvi != null ? ` • NDVI ${googleConfirmation.latestNdvi}` : ""}
            </Text>
          </View>
        </View>
      )}

      {nextEmi && (
        <View style={styles.emiBanner}>
          <Text style={styles.emiBannerLabel}>Next EMI</Text>
          <Text style={styles.emiBannerValue}>
            ₹{nextEmi.dueAmount.toLocaleString("en-IN")} due {nextEmi.dueDate}
          </Text>
        </View>
      )}

      {/* Phase 2A — refresh button always visible above the cards.
          Triggers the engine for the auth'd farmer's active cycles. */}
      <TouchableOpacity
        style={[styles.refreshBtn, enginePending && { opacity: 0.6 }]}
        onPress={refreshAdvisories}
        disabled={enginePending}
        activeOpacity={0.85}
      >
        {enginePending ? (
          <ActivityIndicator color="#2e7d32" size="small" />
        ) : (
          <Text style={styles.refreshBtnText}>🔄 Refresh advisories</Text>
        )}
      </TouchableOpacity>

      {loading ? (
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator color="#2e7d32" />
        </View>
      ) : advisories.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🌾</Text>
          <Text style={styles.emptyTitle}>No advice right now</Text>
          <Text style={styles.emptySub}>
            Tap "Refresh advisories" above to check the latest stage triggers
            for your crops, or come back later when conditions change.
          </Text>
          {shcStatus !== "captured" && (
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => router.push("/soil-health" as any)}
            >
              <Text style={styles.emptyCtaText}>Add my soil card</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        advisories.map((a) => (
          <View key={a.advisoryId} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{a.icon || "🌾"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{a.title || "Advisory"}</Text>
                {a.stageName && a.varietyName && (
                  <Text style={styles.stageSubLine}>
                    🌾 {a.stageName} • {a.varietyName}
                  </Text>
                )}
                <Text style={[styles.urgencyTag, { color: urgencyColor(a.urgency) }]}>
                  {a.urgency.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.cardBody}>{a.body}</Text>
            {a.rupeeImpact && (
              <View style={styles.rupeePill}>
                <Text style={styles.rupeePillText}>{a.rupeeImpact}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => acknowledge(a.advisoryId, a.ctaUrl)}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>{a.ctaLabel || "Mark as done"}</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 48 },

  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1b5e20" },
  headerSub: { fontSize: 12, color: "#888", marginTop: 2 },
  shcChip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  shcChipOk: { backgroundColor: "#e8f5e9" },
  shcChipMissing: { backgroundColor: "#fff3e0" },
  shcChipText: { fontSize: 11, fontWeight: "700" },
  shcChipTextOk: { color: "#2e7d32" },
  shcChipTextMissing: { color: "#e65100" },

  satBanner: { backgroundColor: "#e3f2fd", borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10, borderLeftWidth: 4, borderLeftColor: "#1565c0" },
  satBannerEmoji: { fontSize: 22 },
  satBannerTitle: { fontSize: 13, fontWeight: "800", color: "#0d47a1" },
  satBannerSub: { fontSize: 11, color: "#1565c0", marginTop: 2 },

  refreshBtn: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12, alignItems: "center", borderWidth: 1.5, borderColor: "#2e7d32" },
  refreshBtnText: { color: "#2e7d32", fontSize: 13, fontWeight: "800" },

  emiBanner: { backgroundColor: "#fff8e1", borderRadius: 12, padding: 12, marginBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  emiBannerLabel: { fontSize: 12, fontWeight: "700", color: "#7c5800" },
  emiBannerValue: { fontSize: 14, fontWeight: "800", color: "#7c5800" },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  cardIcon: { fontSize: 26 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#222", marginBottom: 2 },
  stageSubLine: { fontSize: 11, color: "#888", marginBottom: 4 },
  urgencyTag: { fontSize: 10, fontWeight: "800" },
  cardBody: { fontSize: 13, color: "#444", lineHeight: 19, marginBottom: 10 },
  rupeePill: { alignSelf: "flex-start", backgroundColor: "#e8f5e9", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10 },
  rupeePillText: { color: "#1b5e20", fontSize: 12, fontWeight: "800" },
  actionBtn: { backgroundColor: "#2e7d32", borderRadius: 10, padding: 10, alignItems: "center" },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  emptyCard: { backgroundColor: "#fff", borderRadius: 14, padding: 24, alignItems: "center" },
  emptyEmoji: { fontSize: 36, marginBottom: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#333", marginBottom: 4 },
  emptySub: { fontSize: 13, color: "#666", textAlign: "center", lineHeight: 19 },
  emptyCta: { marginTop: 14, backgroundColor: "#2e7d32", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  emptyCtaText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
