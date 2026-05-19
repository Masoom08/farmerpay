/**
 * VYAPAR Sale Deep-Link Mission — Mission 3 (F4 — Spec §4.3).
 *
 * Step 1 (Intro): "+18 points · ~3 min", "Add sale / बिक्री जोड़ें"
 * Step 2 (Action): Deep-links to VYAPAR AddSaleForm with returnTo="Improve/Mission/3"
 * Step 3 (Confirm): "Your sale is saved. Score will update within a minute." + queue state
 * Step 4 (Result): before/after score, or queue-pending if delayed
 *
 * On re-entry (returnTo), checks VYAPAR module for new sale, calls recompute.
 * Queue-pending state: shows when recompute is delayed.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useMissionRouter } from "../_framework/useMissionRouter";
import { MissionIntro } from "../_framework/MissionIntro";
import { MissionProgress } from "../_framework/MissionProgress";
import { MissionResult } from "../_framework/MissionResult";
import { brand, neutral } from "../../theme";

// ─── Types ──────────────────────────────────────────────────────

export type RecomputeStatus = "IDLE" | "PENDING" | "DONE" | "FAILED";

export interface VyaparSaleMissionProps {
  farmerId: string;
  currentScore?: number;
  locale?: "en" | "hi";
  /** Navigate to VYAPAR AddSaleForm */
  navigateToAddSale: (returnTo: string) => void;
  /** Check if a new sale exists in VYAPAR module */
  checkNewSale: (farmerId: string) => Promise<{ saleId: string } | null>;
  /** Recompute trust score */
  recomputeScore: (farmerId: string) => Promise<{ score: number }>;
  /** Whether returning from deep-link (AddSale completed) */
  isReturning?: boolean;
  onExit: () => void;
}

// ─── Return route constant ──────────────────────────────────────

export const RETURN_TO = "Improve/Mission/3";

// ─── Illustration stub ──────────────────────────────────────────

function SaleIllustration() {
  return (
    <View testID="vyapar-illustration" style={illustrationStyles.wrap}>
      <Text style={illustrationStyles.icon}>🧾💰</Text>
    </View>
  );
}

const illustrationStyles = StyleSheet.create({
  wrap: { width: 120, height: 120, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 48 },
});

// ─── Component ──────────────────────────────────────────────────

export function VyaparSaleMission({
  farmerId,
  currentScore,
  locale = "en",
  navigateToAddSale,
  checkNewSale,
  recomputeScore,
  isReturning = false,
  onExit,
}: VyaparSaleMissionProps) {
  const isHi = locale === "hi";
  const router = useMissionRouter({ missionId: `vyapar-sale-${farmerId}`, onExit });
  const [beforeScore] = useState(currentScore);
  const [afterScore, setAfterScore] = useState<number | undefined>(undefined);
  const [recomputeStatus, setRecomputeStatus] = useState<RecomputeStatus>("IDLE");
  const [saleId, setSaleId] = useState<string | null>(null);
  const processedReturnRef = useRef(false);

  // ─── Handle return from deep-link ────────────────────────
  useEffect(() => {
    if (!isReturning || processedReturnRef.current) return;
    processedReturnRef.current = true;

    async function handleReturn() {
      // Jump to CONFIRM step
      router.goTo("CONFIRM");

      // Check for the new sale
      try {
        const sale = await checkNewSale(farmerId);
        if (sale) {
          setSaleId(sale.saleId);
          // Start recompute
          setRecomputeStatus("PENDING");
          try {
            const result = await recomputeScore(farmerId);
            setAfterScore(result.score);
            setRecomputeStatus("DONE");
          } catch {
            setRecomputeStatus("FAILED");
          }
        }
      } catch {
        // Sale check failed — stay in queue-pending state
        setRecomputeStatus("FAILED");
      }
    }

    handleReturn();
  }, [isReturning, farmerId, checkNewSale, recomputeScore, router]);

  // ─── Navigate to AddSale ─────────────────────────────────
  const handleNavigateToSale = useCallback(() => {
    // Save progress so we can resume on return
    router.saveProgress({ step: "ACTION", farmerId });
    navigateToAddSale(RETURN_TO);
  }, [navigateToAddSale, router, farmerId]);

  // ─── Move to result when recompute is done ───────────────
  const handleContinueToResult = useCallback(() => {
    router.next(); // CONFIRM → RESULT
  }, [router]);

  // ─── Render per step ─────────────────────────────────────

  switch (router.step) {
    case "INTRO":
      return (
        <View testID="vyapar-mission" style={styles.container}>
          <MissionIntro
            title={{
              en: "Record a sale",
              hi: "बिक्री दर्ज करें",
            }}
            body={{
              en: "Add your latest sale in VYAPAR to strengthen your TRUST score. It takes just a few minutes.",
              hi: "अपना TRUST स्कोर मजबूत करने के लिए VYAPAR में नवीनतम बिक्री जोड़ें। इसमें बस कुछ मिनट लगते हैं।",
            }}
            illustration={SaleIllustration}
            pointLift={18}
            estimatedMinutes={3}
            primaryCta={{
              en: "Add sale",
              hi: "बिक्री जोड़ें",
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
        <View testID="vyapar-mission" style={styles.container}>
          <View testID="vyapar-deep-link" style={styles.deepLinkContainer}>
            <Text
              testID="vyapar-redirect-text"
              style={[styles.redirectText, isHi && styles.redirectTextHi]}
            >
              {isHi
                ? "VYAPAR में बिक्री फॉर्म पर जा रहे हैं…"
                : "Taking you to the sale form in VYAPAR…"}
            </Text>

            <Pressable
              testID="vyapar-go-btn"
              onPress={handleNavigateToSale}
              accessibilityRole="button"
              accessibilityLabel={isHi ? "VYAPAR खोलें" : "Open VYAPAR"}
              style={({ pressed }) => [
                styles.goBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.goText}>
                {isHi ? "VYAPAR खोलें" : "Open VYAPAR"}
              </Text>
            </Pressable>

            <Pressable
              testID="vyapar-back-btn"
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={isHi ? "वापस जाएं" : "Go back"}
              style={styles.backBtn}
            >
              <Text style={styles.backText}>
                {isHi ? "वापस जाएं" : "Go back"}
              </Text>
            </Pressable>
          </View>
        </View>
      );

    case "CONFIRM":
      return (
        <View testID="vyapar-mission" style={styles.container}>
          <MissionProgress
            title={{
              en: "Processing your sale",
              hi: "आपकी बिक्री प्रोसेस हो रही है",
            }}
            currentStep={3}
            totalSteps={4}
            locale={locale}
            onBack={() => router.back()}
          >
            <View testID="vyapar-queue-state" style={styles.queueContent}>
              {/* Sale saved confirmation */}
              <Text
                testID="vyapar-sale-saved"
                style={[styles.savedText, isHi && styles.savedTextHi]}
              >
                {isHi
                  ? "आपकी बिक्री सेव हो गई है। स्कोर एक मिनट में अपडेट होगा।"
                  : "Your sale is saved. Score will update within a minute."}
              </Text>

              {/* Recompute status */}
              {recomputeStatus === "PENDING" && (
                <View testID="vyapar-recompute-pending" style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {isHi ? "स्कोर अपडेट हो रहा है…" : "Updating score…"}
                  </Text>
                </View>
              )}

              {recomputeStatus === "DONE" && (
                <View testID="vyapar-recompute-done">
                  <Pressable
                    testID="vyapar-continue-btn"
                    onPress={handleContinueToResult}
                    accessibilityRole="button"
                    accessibilityLabel={isHi ? "परिणाम देखें" : "See results"}
                    style={({ pressed }) => [
                      styles.continueBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.continueText}>
                      {isHi ? "परिणाम देखें" : "See results"}
                    </Text>
                  </Pressable>
                </View>
              )}

              {recomputeStatus === "FAILED" && (
                <View testID="vyapar-recompute-failed" style={styles.failedBox}>
                  <Text
                    testID="vyapar-queue-pending-text"
                    style={[styles.failedText, isHi && styles.failedTextHi]}
                  >
                    {isHi
                      ? "स्कोर अपडेट में देरी हो रही है। हम आपको सूचित करेंगे।"
                      : "Score update is taking longer. We'll notify you when it's ready."}
                  </Text>

                  <Pressable
                    testID="vyapar-done-anyway-btn"
                    onPress={async () => {
                      await router.clearProgress();
                      onExit();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={isHi ? "हो गया" : "Done for now"}
                    style={({ pressed }) => [
                      styles.doneAnywayBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.doneAnywayText}>
                      {isHi ? "हो गया" : "Done for now"}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* IDLE = waiting for return from deep-link */}
              {recomputeStatus === "IDLE" && !isReturning && (
                <Text testID="vyapar-waiting-return" style={styles.waitingText}>
                  {isHi
                    ? "VYAPAR से वापस आने की प्रतीक्षा है…"
                    : "Waiting for you to return from VYAPAR…"}
                </Text>
              )}
            </View>
          </MissionProgress>
        </View>
      );

    case "RESULT":
      return (
        <View testID="vyapar-mission" style={styles.container}>
          <MissionResult
            beforeScore={beforeScore}
            afterScore={afterScore}
            estimatedLift={18}
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

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  deepLinkContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  redirectText: {
    fontSize: 16,
    lineHeight: 24,
    color: neutral[800],
    textAlign: "center",
  },
  redirectTextHi: {
    lineHeight: 25.6, // 16 * 1.6
  },
  goBtn: {
    backgroundColor: brand.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  btnPressed: {
    opacity: 0.85,
  },
  goText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  backBtn: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 14,
    color: neutral[500],
  },
  queueContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 24,
  },
  savedText: {
    fontSize: 15,
    lineHeight: 22,
    color: neutral[800],
    textAlign: "center",
    fontWeight: "500",
  },
  savedTextHi: {
    lineHeight: 24, // 15 * 1.6
  },
  statusBadge: {
    backgroundColor: brand.primary[50],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brand.primary[500],
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: brand.primary[700],
  },
  continueBtn: {
    backgroundColor: brand.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  failedBox: {
    alignItems: "center",
    gap: 12,
  },
  failedText: {
    fontSize: 14,
    lineHeight: 21,
    color: neutral[500],
    textAlign: "center",
  },
  failedTextHi: {
    lineHeight: 22.4,
  },
  doneAnywayBtn: {
    backgroundColor: neutral[200],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  doneAnywayText: {
    fontSize: 14,
    fontWeight: "600",
    color: neutral[800],
  },
  waitingText: {
    fontSize: 13,
    color: neutral[500],
    fontStyle: "italic",
  },
});

export default VyaparSaleMission;
