/**
 * ReadinessWhyScreen — Drill-down: "Why you are / aren't ready"
 *
 * Shows TRUST row (band + optional number), FHS row (band + optional number),
 * and "What will help" action list. Honors showNumericScores preference.
 *
 * Design source: DESIGN-SYSTEM-SCORE-DISPLAY.md § Pattern 1 → Drill-down
 */

import React, { useCallback, useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Switch,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getReadinessWhy,
  getReadinessFlags,
  getShowNumericScores,
  setShowNumericScores,
  type ReadinessWhyData,
} from "../lib/readiness";
import { getReadinessLabel, t, bandLabel, type LangCode } from "../lib/readinessStrings";
import LoanReadinessBadge from "../components/readiness/LoanReadinessBadge";
import { mapState } from "../lib/readiness";

// ─── Color config (same tokens as badge) ───────────────────────────

const BAND_COLORS: Record<string, { fg: string; bg: string }> = {
  strong:   { fg: "#15803D", bg: "#e8f5e9" },
  building: { fg: "#B45309", bg: "#fff8e1" },
  low:      { fg: "#6B7280", bg: "#f5f5f5" },
};

const STATUS_ICON: Record<string, { name: string; color: string }> = {
  met:     { name: "checkmark-circle", color: "#15803D" },
  below:   { name: "alert-circle",     color: "#B45309" },
  missing: { name: "help-circle",      color: "#6B7280" },
};

// ─── Screen ────────────────────────────────────────────────────────

export default function ReadinessWhyScreen() {
  const router = useRouter();
  const lang: LangCode = "en"; // TODO: read from user preference when i18n system is wired

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [data, setData] = useState<ReadinessWhyData | null>(null);
  const [showScores, setShowScores] = useState(false);

  // Load preference
  useEffect(() => {
    getShowNumericScores().then(setShowScores);
  }, []);

  // Fetch data on focus
  useFocusEffect(useCallback(() => {
    loadData();
  }, []));

  const loadData = async () => {
    setError(false);
    try {
      // Gate: redirect back if farmer badge flag is off
      const flags = await getReadinessFlags();
      if (!flags.farmerBadge) {
        router.replace("/" as any);
        return;
      }
      const result = await getReadinessWhy();
      setData(result);
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleScores = async (value: boolean) => {
    setShowScores(value);
    await setShowNumericScores(value);
  };

  // ─── Loading state ───────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.loadingText}>{t("why.loading", lang)}</Text>
      </View>
    );
  }

  // ─── Error state ─────────────────────────────────────────

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="warning-outline" size={48} color="#ccc" />
        <Text style={styles.emptyTitle}>
          {error ? t("why.error", lang) : t("why.noData", lang)}
        </Text>
        <Text style={styles.emptyDesc}>
          {error ? "" : t("why.noDataDesc", lang)}
        </Text>
        {error && (
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>{t("why.retry", lang)}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ─── Success state ───────────────────────────────────────

  const badgeState = mapState(data.state);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2e7d32" />}
    >
      {/* Title */}
      <Text style={styles.title}>{t("why.title", lang)}</Text>
      <Text style={styles.subtitle}>{t("why.subtitle", lang)}</Text>

      {/* Badge */}
      <View style={styles.badgeWrap}>
        <LoanReadinessBadge state={badgeState} lang={lang} />
      </View>

      {/* Score toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {showScores ? t("why.hideScores", lang) : t("why.showScores", lang)}
        </Text>
        <Switch
          value={showScores}
          onValueChange={handleToggleScores}
          trackColor={{ false: "#ddd", true: "#a5d6a7" }}
          thumbColor={showScores ? "#2e7d32" : "#f4f3f4"}
          accessibilityLabel={showScores ? t("why.hideScores", lang) : t("why.showScores", lang)}
        />
      </View>

      {/* TRUST row */}
      <ScoreRow
        label={t("why.trust", lang)}
        icon="people"
        component={data.components.trust}
        reason={data.reasons.find(r => r.field === "trust")}
        showScore={showScores}
        stale={data.components.trust && false} // trust staleness: would come from parent readiness data
        lang={lang}
      />

      {/* FHS row — present for farmer, absent for sathi */}
      {data.components.financialHealth && (
        <ScoreRow
          label={t("why.financialHealth", lang)}
          icon="wallet"
          component={data.components.financialHealth}
          reason={data.reasons.find(r => r.field === "fhs")}
          showScore={showScores}
          stale={false}
          lang={lang}
        />
      )}

      {/* FHS missing: show connect bank CTA */}
      {!data.components.financialHealth && data.reasons.some(r => r.field === "fhs" && r.status === "missing") && (
        <TouchableOpacity style={styles.ctaCard} onPress={() => router.push("/aa-consent" as any)}>
          <Ionicons name="link-outline" size={20} color="#1D4ED8" />
          <View style={styles.ctaText}>
            <Text style={styles.ctaTitle}>Connect your bank</Text>
            <Text style={styles.ctaDesc}>Link via Account Aggregator to complete your readiness</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#1D4ED8" />
        </TouchableOpacity>
      )}

      {/* What will help */}
      {data.nextSteps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("why.whatWillHelp", lang)}</Text>
          {data.nextSteps.map((step, i) => (
            <NextStepRow key={i} step={step} router={router} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Score Row Component ───────────────────────────────────────────

interface ScoreRowProps {
  label: string;
  icon: string;
  component?: { band: string; met: boolean; threshold: number; score?: number } | null;
  reason?: { field: string; status: string; band?: string };
  showScore: boolean;
  stale: boolean;
  lang: LangCode;
}

function ScoreRow({ label, icon, component, reason, showScore, stale, lang }: ScoreRowProps) {
  if (!component && !reason) return null;

  const band = component?.band ?? reason?.band ?? null;
  const colors = band ? BAND_COLORS[band] ?? BAND_COLORS.low : BAND_COLORS.low;
  const statusInfo = reason ? STATUS_ICON[reason.status] ?? STATUS_ICON.missing : STATUS_ICON.missing;

  return (
    <View style={[styles.scoreCard, { borderLeftColor: colors.fg, borderLeftWidth: 4 }]}>
      <View style={styles.scoreHeader}>
        <Ionicons name={icon as any} size={20} color={colors.fg} />
        <Text style={styles.scoreLabel}>{label}</Text>
        <Ionicons name={statusInfo.name as any} size={18} color={statusInfo.color} />
      </View>

      <View style={styles.scoreBody}>
        {/* Band badge */}
        <View style={[styles.bandBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.bandText, { color: colors.fg }]}>
            {bandLabel(band, lang)}
          </Text>
        </View>

        {/* Numeric score (if toggled on and available) */}
        {showScore && component?.score != null && (
          <Text style={[styles.numericScore, { color: colors.fg }]}>
            {Math.round(component.score)}
          </Text>
        )}
      </View>

      {/* Status text */}
      <Text style={styles.statusText}>
        {reason?.status === "met" ? t("why.met", lang)
          : reason?.status === "below" ? t("why.below", lang)
          : t("why.missing", lang)}
      </Text>

      {/* Stale indicator */}
      {stale && (
        <View style={styles.staleRow}>
          <Ionicons name="time-outline" size={13} color="#B45309" />
          <Text style={styles.staleText}>{t("why.stale", lang)}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Next Step Row ─────────────────────────────────────────────────

function NextStepRow({ step, router }: { step: { labelKey: string; action: string }; router: any }) {
  // Route based on the step's label key
  const handlePress = () => {
    if (step.labelKey.includes("link_bank") || step.labelKey.includes("fhs_missing")) {
      router.push("/aa-consent");
    } else if (step.labelKey.includes("sathi") || step.labelKey.includes("improve_trust")) {
      router.push("/choice");
    } else if (step.labelKey.includes("apply")) {
      router.push("/loan-apply");
    }
    // Other steps: no navigation, just informational
  };

  const isActionable = step.labelKey.includes("link_bank") ||
    step.labelKey.includes("sathi") ||
    step.labelKey.includes("improve_trust") ||
    step.labelKey.includes("apply") ||
    step.labelKey.includes("fhs_missing");

  return (
    <TouchableOpacity
      style={styles.stepRow}
      onPress={isActionable ? handlePress : undefined}
      activeOpacity={isActionable ? 0.7 : 1}
      disabled={!isActionable}
      accessibilityRole={isActionable ? "button" : "text"}
      accessibilityLabel={step.action}
    >
      <Ionicons
        name={isActionable ? "arrow-forward-circle" : "information-circle-outline"}
        size={18}
        color={isActionable ? "#2e7d32" : "#888"}
      />
      <Text style={[styles.stepText, isActionable && styles.stepTextActionable]}>
        {step.action}
      </Text>
      {isActionable && (
        <Ionicons name="chevron-forward" size={16} color="#2e7d32" />
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30, backgroundColor: "#f5f5f5" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#666" },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a2e", marginTop: 12 },
  emptyDesc: { fontSize: 13, color: "#888", textAlign: "center", marginTop: 6 },
  retryBtn: { marginTop: 16, backgroundColor: "#2e7d32", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  title: { fontSize: 20, fontWeight: "800", color: "#1a1a2e" },
  subtitle: { fontSize: 13, color: "#888", marginTop: 2, marginBottom: 12 },

  badgeWrap: { marginBottom: 16 },

  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 12, padding: 14,
    marginBottom: 16,
    elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: "#1a1a2e" },

  scoreCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  scoreHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  scoreLabel: { flex: 1, fontSize: 15, fontWeight: "700", color: "#1a1a2e" },
  scoreBody: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  bandBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  bandText: { fontSize: 13, fontWeight: "700" },
  numericScore: { fontSize: 28, fontWeight: "800" },
  statusText: { fontSize: 12, color: "#888", fontWeight: "500" },
  staleRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  staleText: { fontSize: 11, color: "#B45309", fontWeight: "500" },

  ctaCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#e3f2fd", borderRadius: 12, padding: 14, marginBottom: 16,
  },
  ctaText: { flex: 1 },
  ctaTitle: { fontSize: 14, fontWeight: "700", color: "#1D4ED8" },
  ctaDesc: { fontSize: 11, color: "#666", marginTop: 2 },

  section: { marginTop: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a2e", marginBottom: 10 },

  stepRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 8,
    elevation: 1, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  stepText: { flex: 1, fontSize: 13, color: "#666" },
  stepTextActionable: { color: "#1a1a2e", fontWeight: "600" },
});
