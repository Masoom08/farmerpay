/**
 * AA Consent Mission — Full 4-step flow (F2 — Spec §4.1).
 *
 * Step 1 (Intro): shield-over-rupee illustration, "+38 points · ~3 min", "Connect safely"
 * Step 2 (Action): ConsentHandoff — invokes AA SDK, shows 45s progress
 * Step 3 (Confirm): "We're reading your statements…" progress view
 * Step 4 (Result): before/after score via /trust/farmer/:id/recompute
 *
 * Error states: denied, bank_unavailable, timeout — each with spec copy.
 * NEVER persists AA credentials locally.
 */

import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useMissionRouter } from "../_framework/useMissionRouter";
import { MissionIntro } from "../_framework/MissionIntro";
import { MissionProgress } from "../_framework/MissionProgress";
import { MissionResult } from "../_framework/MissionResult";
import { ConsentHandoff, type AaSdk } from "./ConsentHandoff";
import { neutral } from "../../theme";

// ─── Types ──────────────────────────────────────────────────────

export interface AaMissionProps {
  farmerId: string;
  currentScore?: number;
  aaSdk: AaSdk;
  locale?: "en" | "hi";
  /** Called to recompute trust score; returns new score */
  recomputeScore: (farmerId: string) => Promise<{ score: number }>;
  /** Called when mission exits (back/done/later) */
  onExit: () => void;
}

// ─── Illustration stub (replaced by design asset) ──────────────

function ShieldRupeeIllustration() {
  return (
    <View testID="aa-illustration" style={illustrationStyles.wrap}>
      <Text style={illustrationStyles.icon}>🛡️₹</Text>
    </View>
  );
}

const illustrationStyles = StyleSheet.create({
  wrap: { width: 120, height: 120, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 48 },
});

// ─── Component ──────────────────────────────────────────────────

export function AaMission({
  farmerId,
  currentScore,
  aaSdk,
  locale = "en",
  recomputeScore,
  onExit,
}: AaMissionProps) {
  const isHi = locale === "hi";
  const router = useMissionRouter({ missionId: `aa-${farmerId}`, onExit });
  const [consentId, setConsentId] = useState<string | null>(null);
  const [beforeScore] = useState(currentScore);
  const [afterScore, setAfterScore] = useState<number | undefined>(undefined);

  // ─── Consent success → move to reading step ──────────────
  const handleConsentSuccess = useCallback(
    (id: string) => {
      setConsentId(id);
      router.next(); // ACTION → CONFIRM (reading statements)
    },
    [router],
  );

  // ─── Reading done → recompute + show result ──────────────
  const handleReadingDone = useCallback(async () => {
    try {
      const result = await recomputeScore(farmerId);
      setAfterScore(result.score);
    } catch {
      // If recompute fails, show result without after score
    }
    router.next(); // CONFIRM → RESULT
  }, [farmerId, recomputeScore, router]);

  // ─── Render per step ─────────────────────────────────────

  switch (router.step) {
    case "INTRO":
      return (
        <View testID="aa-mission" style={styles.container}>
          <MissionIntro
            title={{
              en: "Connect your bank account",
              hi: "अपना बैंक खाता जोड़ें",
            }}
            body={{
              en: "Securely share your bank statements via Account Aggregator. Your data stays safe with RBI's framework.",
              hi: "अकाउंट एग्रीगेटर के माध्यम से सुरक्षित रूप से बैंक स्टेटमेंट साझा करें। RBI के ढांचे से आपका डेटा सुरक्षित रहता है।",
            }}
            illustration={ShieldRupeeIllustration}
            pointLift={38}
            estimatedMinutes={3}
            primaryCta={{
              en: "Connect safely",
              hi: "सुरक्षित जोड़ें",
            }}
            onPrimary={() => router.next()}
            onLater={onExit}
            locale={locale}
            hasResumableProgress={router.hasResumableProgress}
            onResume={() => router.resume()}
          />
        </View>
      );

    case "ACTION":
      return (
        <View testID="aa-mission" style={styles.container}>
          <ConsentHandoff
            aaSdk={aaSdk}
            locale={locale}
            onSuccess={handleConsentSuccess}
            onRetry={() => router.goTo("INTRO")}
            onBack={() => router.back()}
          />
        </View>
      );

    case "CONFIRM":
      return (
        <View testID="aa-mission" style={styles.container}>
          <MissionProgress
            title={{
              en: "Reading your statements…",
              hi: "आपके स्टेटमेंट पढ़ रहे हैं…",
            }}
            currentStep={3}
            totalSteps={4}
            locale={locale}
            onBack={() => router.back()}
          >
            <View testID="aa-reading" style={styles.readingContent}>
              <Text style={[styles.readingText, isHi && styles.readingTextHi]}>
                {isHi
                  ? "हम आपके बैंक स्टेटमेंट का विश्लेषण कर रहे हैं। इसमें एक मिनट लग सकता है।"
                  : "We're analysing your bank statements. This may take a minute."}
              </Text>

              <View testID="aa-reading-done-slot">
                {/* Auto-advance after reading completes */}
                <ReadingTimer
                  onComplete={handleReadingDone}
                  locale={locale}
                />
              </View>
            </View>
          </MissionProgress>
        </View>
      );

    case "RESULT":
      return (
        <View testID="aa-mission" style={styles.container}>
          <MissionResult
            beforeScore={beforeScore}
            afterScore={afterScore}
            estimatedLift={38}
            actualLift={
              beforeScore != null && afterScore != null
                ? afterScore - beforeScore
                : undefined
            }
            onDone={async () => {
              await router.clearProgress();
              onExit();
            }}
            locale={locale}
          />
        </View>
      );

    default:
      return null;
  }
}

// ─── ReadingTimer sub-component ─────────────────────────────────

interface ReadingTimerProps {
  onComplete: () => void;
  locale: "en" | "hi";
  /** Duration in ms before auto-completing (default 2000 for real; tests can override) */
  durationMs?: number;
}

function ReadingTimer({
  onComplete,
  locale,
  durationMs = 2000,
}: ReadingTimerProps) {
  const isHi = locale === "hi";

  React.useEffect(() => {
    const timer = setTimeout(onComplete, durationMs);
    return () => clearTimeout(timer);
  }, [onComplete, durationMs]);

  return (
    <Text testID="aa-reading-status" style={styles.readingStatus}>
      {isHi ? "कृपया प्रतीक्षा करें…" : "Please wait…"}
    </Text>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  readingContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 24,
  },
  readingText: {
    fontSize: 14,
    lineHeight: 21,
    color: neutral[500],
    textAlign: "center",
  },
  readingTextHi: {
    lineHeight: 22.4,
  },
  readingStatus: {
    fontSize: 13,
    color: neutral[500],
    fontStyle: "italic",
  },
});

export { ConsentHandoff } from "./ConsentHandoff";
export type { AaSdk, AaSdkResult, ConsentStatus } from "./ConsentHandoff";

export default AaMission;
