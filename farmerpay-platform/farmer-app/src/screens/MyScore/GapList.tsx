/**
 * GapList — Renders top 3 ranked gap cards with dismiss support (E4).
 *
 * Spec §3.1: max 3 cards.
 * Spec §3.2: ranked by pointLift / effortMinutes ratio, descending.
 * Spec §3.6: swipe-left dismisses for 7 days via dismissStore.
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { GapCard, rankGaps, type GapItem } from "../../components/trust/GapCard";
import {
  loadDismissals,
  persistDismissal,
  getActiveDismissals,
  type DismissMap,
} from "./dismissStore";
import { neutral } from "../../theme";

// ─── Constants ─────────────────────────────────────────────────

const MAX_CARDS = 3;

// ─── Props ─────────────────────────────────────────────────────

export interface GapListProps {
  gaps: GapItem[];
  locale?: "en" | "hi";
  onCta: (gapId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────

export function GapList({ gaps, locale = "en", onCta }: GapListProps) {
  const [dismissMap, setDismissMap] = useState<DismissMap>({});
  const [loaded, setLoaded] = useState(false);
  const isHi = locale === "hi";

  // ─── Load persisted dismissals on mount ────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const map = await loadDismissals();
      if (!cancelled) {
        setDismissMap(map);
        setLoaded(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ─── Dismiss handler ───────────────────────────────────────
  const handleDismiss = useCallback(async (cardId: string) => {
    const now = Date.now();
    setDismissMap((prev) => ({ ...prev, [cardId]: now }));
    await persistDismissal(cardId);
  }, []);

  // ─── Filter + rank + slice ─────────────────────────────────
  const activeDismissals = getActiveDismissals(dismissMap);
  const available = gaps.filter((g) => !activeDismissals.has(g.id));
  const ranked = rankGaps(available);
  const visible = ranked.slice(0, MAX_CARDS);

  // ─── Render ────────────────────────────────────────────────

  if (!loaded) return null; // Don't flash cards before dismissals loaded

  if (visible.length === 0) {
    return (
      <View testID="gap-list-empty" style={styles.empty}>
        <Text style={styles.emptyText}>
          {isHi ? "अभी कोई सुझाव नहीं" : "No suggestions right now"}
        </Text>
      </View>
    );
  }

  return (
    <View
      testID="gap-list"
      role="list"
      accessibilityLabel={isHi ? "सुधार सुझाव" : "Improvement suggestions"}
      style={styles.container}
    >
      {visible.map((gap) => (
        <GapCard
          key={gap.id}
          id={gap.id}
          title={gap.title}
          pointLift={gap.pointLift}
          effortMinutes={gap.effortMinutes}
          ctaLabel={gap.ctaLabel}
          locale={locale}
          onCta={() => onCta(gap.id)}
          onDismiss={() => handleDismiss(gap.id)}
        />
      ))}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  empty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: neutral[500],
  },
});

export default GapList;
