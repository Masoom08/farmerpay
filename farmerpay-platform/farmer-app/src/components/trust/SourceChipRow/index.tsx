/**
 * SourceChipRow — Horizontal chip row showing data-source connectivity (E5).
 *
 * Spec §3.1: Bank (AA), Credit (CIBIL), Land (ROOTS), Crop Insurance (PMFBY), Farm practice (POP).
 * Tap connected → shows last sync + "Refresh now" in an inline detail.
 * Tap not-connected → fires onSourceTap to start the relevant mission.
 * This row is about connectivity only — no money shown.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { brand, neutral } from "../../../theme";

// ─── Types ─────────────────────────────────────────────────────

export type SourceType = "AA" | "CIBIL" | "ROOTS" | "PMFBY" | "POP";
export type SourceStatus = "CONNECTED" | "PENDING" | "MISSING";

export interface Source {
  type: SourceType;
  status: SourceStatus;
  lastSync?: string;
}

export interface SourceChipRowProps {
  sources: Source[];
  locale?: "en" | "hi";
  onSourceTap: (source: Source) => void;
  /** Called when user taps "Refresh now" on a connected source */
  onRefresh?: (source: Source) => void;
}

// ─── Display labels ────────────────────────────────────────────

const SOURCE_LABELS: Record<SourceType, { en: string; hi: string }> = {
  AA: { en: "Bank", hi: "बैंक" },
  CIBIL: { en: "Credit", hi: "क्रेडिट" },
  ROOTS: { en: "Land", hi: "भूमि" },
  PMFBY: { en: "Crop Insurance", hi: "फसल बीमा" },
  POP: { en: "Farm Practice", hi: "कृषि अभ्यास" },
};

const STATUS_ICONS: Record<SourceStatus, string> = {
  CONNECTED: "✓",
  PENDING: "◌",
  MISSING: "✕",
};

const STATUS_COLORS: Record<SourceStatus, { bg: string; border: string; text: string; icon: string }> = {
  CONNECTED: {
    bg: brand.primary[50],
    border: brand.primary[500],
    text: neutral[900],
    icon: brand.primary[700],
  },
  PENDING: {
    bg: "#FFFBEB", // amber-50
    border: "#F59E0B", // amber-500
    text: neutral[900],
    icon: "#B45309", // amber-700
  },
  MISSING: {
    bg: neutral[100],
    border: neutral[200],
    text: neutral[500],
    icon: neutral[500],
  },
};

// ─── Component ──────────────────────────────────────────────────

export function SourceChipRow({
  sources,
  locale = "en",
  onSourceTap,
  onRefresh,
}: SourceChipRowProps) {
  const [expandedType, setExpandedType] = useState<SourceType | null>(null);
  const isHi = locale === "hi";

  const handleChipPress = useCallback(
    (source: Source) => {
      if (source.status === "CONNECTED") {
        // Toggle inline detail
        setExpandedType((prev) =>
          prev === source.type ? null : source.type,
        );
      } else {
        // Missing/Pending → start mission
        onSourceTap(source);
      }
    },
    [onSourceTap],
  );

  const handleRefresh = useCallback(
    (source: Source) => {
      onRefresh?.(source);
    },
    [onRefresh],
  );

  return (
    <View testID="source-chip-row" style={styles.wrapper}>
      <ScrollView
        testID="source-chip-scroll"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sources.map((source) => {
          const label = isHi
            ? SOURCE_LABELS[source.type]?.hi ?? source.type
            : SOURCE_LABELS[source.type]?.en ?? source.type;
          const colors = STATUS_COLORS[source.status] ?? STATUS_COLORS.MISSING;
          const icon = STATUS_ICONS[source.status] ?? "?";
          const isExpanded = expandedType === source.type;

          return (
            <Pressable
              key={source.type}
              testID={`chip-${source.type}`}
              onPress={() => handleChipPress(source)}
              accessibilityRole="button"
              accessibilityLabel={
                isHi
                  ? `${label}, ${source.status === "CONNECTED" ? "जुड़ा" : source.status === "PENDING" ? "प्रतीक्षा" : "जोड़ें"}`
                  : `${label}, ${source.status === "CONNECTED" ? "connected" : source.status === "PENDING" ? "pending" : "not connected"}`
              }
              accessibilityState={{ expanded: isExpanded }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                },
                pressed && styles.chipPressed,
              ]}
            >
              <Text
                testID={`chip-icon-${source.type}`}
                style={[styles.chipIcon, { color: colors.icon }]}
              >
                {icon}
              </Text>
              <Text
                testID={`chip-label-${source.type}`}
                style={[styles.chipLabel, { color: colors.text }]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ─── Expanded detail (connected source) ──── */}
      {expandedType != null && (
        <ExpandedDetail
          source={sources.find((s) => s.type === expandedType)!}
          locale={locale}
          onRefresh={handleRefresh}
          onClose={() => setExpandedType(null)}
        />
      )}
    </View>
  );
}

// ─── Expanded detail sub-component ─────────────────────────────

interface ExpandedDetailProps {
  source: Source;
  locale: "en" | "hi";
  onRefresh: (source: Source) => void;
  onClose: () => void;
}

function ExpandedDetail({ source, locale, onRefresh, onClose }: ExpandedDetailProps) {
  const isHi = locale === "hi";
  const label = isHi
    ? SOURCE_LABELS[source.type]?.hi ?? source.type
    : SOURCE_LABELS[source.type]?.en ?? source.type;

  let syncText: string;
  if (source.lastSync) {
    try {
      const d = new Date(source.lastSync);
      const formatted = d.toLocaleDateString(isHi ? "hi-IN" : "en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      syncText = isHi ? `अंतिम सिंक: ${formatted}` : `Last sync: ${formatted}`;
    } catch {
      syncText = isHi ? "सिंक जानकारी उपलब्ध नहीं" : "Sync info unavailable";
    }
  } else {
    syncText = isHi ? "सिंक जानकारी उपलब्ध नहीं" : "Sync info unavailable";
  }

  return (
    <View testID={`detail-${source.type}`} style={styles.detail}>
      <View style={styles.detailHeader}>
        <Text testID={`detail-label-${source.type}`} style={styles.detailTitle}>
          {label}
        </Text>
        <Pressable
          testID={`detail-close-${source.type}`}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={isHi ? "बंद करें" : "Close"}
          hitSlop={12}
        >
          <Text style={styles.detailClose}>✕</Text>
        </Pressable>
      </View>

      <Text testID={`detail-sync-${source.type}`} style={styles.detailSync}>
        {syncText}
      </Text>

      <Pressable
        testID={`detail-refresh-${source.type}`}
        onPress={() => onRefresh(source)}
        accessibilityRole="button"
        accessibilityLabel={isHi ? "अभी रिफ्रेश करें" : "Refresh now"}
        style={({ pressed }) => [
          styles.refreshBtn,
          pressed && styles.refreshPressed,
        ]}
      >
        <Text style={styles.refreshText}>
          {isHi ? "अभी रिफ्रेश करें" : "Refresh now"}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  scrollContent: {
    gap: 8,
    paddingHorizontal: 0,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    minHeight: 36,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipIcon: {
    fontSize: 12,
    fontWeight: "700",
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  detail: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: neutral[200],
    padding: 12,
    gap: 8,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: neutral[900],
  },
  detailClose: {
    fontSize: 14,
    color: neutral[500],
  },
  detailSync: {
    fontSize: 12,
    color: neutral[500],
  },
  refreshBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: brand.primary[500],
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshPressed: {
    opacity: 0.85,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default SourceChipRow;
