/**
 * EmptyState — Mobile empty-state library (H2 — Spec §6.2).
 *
 * 5 pre-composed variants:
 *   1. NO_TASKS        — "No tasks for today. Great job!"
 *   2. NO_FARMERS       — "No farmers assigned yet."
 *   3. NO_DATA          — "No data collected yet."
 *   4. NO_NOTIFICATIONS — "No notifications right now."
 *   5. NO_RESULTS       — "No results found."
 *
 * Each renders: illustration area, title, description, optional CTA slot.
 * Bilingual (en/hi) support via locale prop.
 *
 * PRIVACY: No score-adjacent strings.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { neutral, brand } from "../../theme";

// ─── Types ────────────────────────────────────────────────

export type EmptyVariant =
  | "NO_TASKS"
  | "NO_FARMERS"
  | "NO_DATA"
  | "NO_NOTIFICATIONS"
  | "NO_RESULTS";

export interface EmptyStateProps {
  variant: EmptyVariant;
  locale?: "en" | "hi";
  /** Override the default title. */
  title?: string;
  /** Override the default description. */
  description?: string;
  /** Optional CTA rendered below the description. */
  cta?: React.ReactNode;
}

// ─── Variant config ───────────────────────────────────────

interface VariantConfig {
  title: { en: string; hi: string };
  description: { en: string; hi: string };
  /** Emoji illustration (lightweight, universal) */
  emoji: string;
  accentColor: string;
}

export const VARIANTS: Record<EmptyVariant, VariantConfig> = {
  NO_TASKS: {
    title: {
      en: "No tasks for today",
      hi: "\u0906\u091C \u0915\u094B\u0908 \u0915\u093E\u0930\u094D\u092F \u0928\u0939\u0940\u0902",
    },
    description: {
      en: "Great job! Check back later for new tasks.",
      hi: "\u092C\u0939\u0941\u0924 \u0905\u091A\u094D\u091B\u093E! \u0928\u090F \u0915\u093E\u0930\u094D\u092F\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u092C\u093E\u0926 \u092E\u0947\u0902 \u0926\u0947\u0916\u0947\u0902\u0964",
    },
    emoji: "\u2705",
    accentColor: brand.primary[500],
  },
  NO_FARMERS: {
    title: {
      en: "No farmers assigned yet",
      hi: "\u0905\u092D\u0940 \u0915\u094B\u0908 \u0915\u093F\u0938\u093E\u0928 \u0928\u0939\u0940\u0902",
    },
    description: {
      en: "Farmers will appear here once they are assigned to you.",
      hi: "\u0915\u093F\u0938\u093E\u0928 \u0906\u092A\u0915\u094B \u0938\u094C\u0902\u092A\u0947 \u091C\u093E\u0928\u0947 \u092A\u0930 \u092F\u0939\u093E\u0901 \u0926\u093F\u0916\u0947\u0902\u0917\u0947\u0964",
    },
    emoji: "\u{1F465}",
    accentColor: "#3B82F6",
  },
  NO_DATA: {
    title: {
      en: "No data collected yet",
      hi: "\u0905\u092D\u0940 \u0915\u094B\u0908 \u0921\u093E\u091F\u093E \u0928\u0939\u0940\u0902",
    },
    description: {
      en: "Start collecting data by visiting farmers in your queue.",
      hi: "\u0905\u092A\u0928\u0940 \u0915\u0924\u093E\u0930 \u092E\u0947\u0902 \u0915\u093F\u0938\u093E\u0928\u094B\u0902 \u0938\u0947 \u092E\u093F\u0932\u0915\u0930 \u0921\u093E\u091F\u093E \u0907\u0915\u0920\u094D\u0920\u093E \u0915\u0930\u0947\u0902\u0964",
    },
    emoji: "\u{1F4CB}",
    accentColor: brand.accent.amber,
  },
  NO_NOTIFICATIONS: {
    title: {
      en: "No notifications right now",
      hi: "\u0905\u092D\u0940 \u0915\u094B\u0908 \u0938\u0942\u091A\u0928\u093E \u0928\u0939\u0940\u0902",
    },
    description: {
      en: "You're all caught up. We'll notify you when something needs attention.",
      hi: "\u0938\u092C \u0905\u092A\u0921\u0947\u091F! \u091C\u0930\u0942\u0930\u0924 \u0939\u094B\u0928\u0947 \u092A\u0930 \u0939\u092E \u0906\u092A\u0915\u094B \u0938\u0942\u091A\u093F\u0924 \u0915\u0930\u0947\u0902\u0917\u0947\u0964",
    },
    emoji: "\u{1F514}",
    accentColor: "#8B5CF6",
  },
  NO_RESULTS: {
    title: {
      en: "No results found",
      hi: "\u0915\u094B\u0908 \u092A\u0930\u093F\u0923\u093E\u092E \u0928\u0939\u0940\u0902",
    },
    description: {
      en: "Try adjusting your search or filters.",
      hi: "\u0905\u092A\u0928\u0940 \u0916\u094B\u091C \u092F\u093E \u092B\u093C\u093F\u0932\u094D\u091F\u0930 \u092C\u0926\u0932\u0915\u0930 \u0926\u0947\u0916\u0947\u0902\u0964",
    },
    emoji: "\u{1F50D}",
    accentColor: neutral[500],
  },
};

// ─── Component ────────────────────────────────────────────

export default function EmptyState({
  variant,
  locale = "en",
  title,
  description,
  cta,
}: EmptyStateProps) {
  const config = VARIANTS[variant];

  return (
    <View style={styles.container} testID="empty-state" accessibilityLabel={config.title[locale]}>
      {/* Illustration */}
      <View style={styles.illustrationWrap} testID="empty-illustration">
        <Text style={styles.emoji}>{config.emoji}</Text>
      </View>

      {/* Title */}
      <Text
        style={[styles.title, locale === "hi" && styles.titleHi]}
        testID="empty-title"
      >
        {title ?? config.title[locale]}
      </Text>

      {/* Description */}
      <Text
        style={[styles.description, locale === "hi" && styles.descriptionHi]}
        testID="empty-description"
      >
        {description ?? config.description[locale]}
      </Text>

      {/* CTA slot */}
      {cta && (
        <View style={styles.ctaWrap} testID="empty-cta">
          {cta}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  illustrationWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: neutral[900],
    textAlign: "center",
    marginBottom: 8,
  },
  titleHi: {
    lineHeight: 18 * 1.55,
  },
  description: {
    fontSize: 14,
    color: neutral[500],
    textAlign: "center",
    maxWidth: 280,
  },
  descriptionHi: {
    lineHeight: 14 * 1.55,
  },
  ctaWrap: {
    marginTop: 16,
  },
});
