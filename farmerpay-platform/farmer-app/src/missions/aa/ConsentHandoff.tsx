/**
 * ConsentHandoff — AA SDK handoff wrapper (F2 — Spec §4.1).
 *
 * Invokes the RBI FIP/FIU consent flow via AA SDK.
 * Shows 45s estimated progress while in flight.
 * Handles three error states: denied, bank_unavailable, timeout.
 *
 * NEVER persists AA credentials locally — SDK uses RBI handoff.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { brand, neutral } from "../../theme";

// ─── Types ──────────────────────────────────────────────────────

export type ConsentStatus =
  | "IDLE"
  | "IN_FLIGHT"
  | "SUCCESS"
  | "DENIED"
  | "BANK_UNAVAILABLE"
  | "TIMEOUT"
  | "ERROR";

export interface AaSdkResult {
  status: "SUCCESS" | "DENIED" | "BANK_UNAVAILABLE" | "TIMEOUT" | "ERROR";
  consentId?: string;
}

export interface AaSdk {
  initiateConsent: () => Promise<AaSdkResult>;
}

export interface ConsentHandoffProps {
  aaSdk: AaSdk;
  locale?: "en" | "hi";
  /** Called on successful consent with the consentId */
  onSuccess: (consentId: string) => void;
  /** Called when user needs to retry or go back */
  onRetry: () => void;
  /** Called when user wants to skip / go back */
  onBack: () => void;
  /** Timeout threshold in ms (default 45000) */
  timeoutMs?: number;
}

// ─── Error copy (spec §4.1) ────────────────────────────────────

interface ErrorCopy {
  title: { en: string; hi: string };
  body: { en: string; hi: string };
}

const ERROR_COPY: Record<string, ErrorCopy> = {
  DENIED: {
    title: { en: "Consent not given", hi: "सहमति नहीं दी गई" },
    body: {
      en: "You didn't share. You can try again any time.",
      hi: "आपने साझा नहीं किया। आप कभी भी पुनः प्रयास कर सकते हैं।",
    },
  },
  BANK_UNAVAILABLE: {
    title: { en: "Bank not available", hi: "बैंक उपलब्ध नहीं" },
    body: {
      en: "Your bank is currently unavailable. Please try again later.",
      hi: "आपका बैंक अभी उपलब्ध नहीं है। कृपया बाद में पुनः प्रयास करें।",
    },
  },
  TIMEOUT: {
    title: { en: "Taking longer than expected", hi: "उम्मीद से अधिक समय लग रहा है" },
    body: {
      en: "We'll notify you when it's done.",
      hi: "जब यह पूरा होगा तो हम आपको सूचित करेंगे।",
    },
  },
  ERROR: {
    title: { en: "Something went wrong", hi: "कुछ गलत हो गया" },
    body: {
      en: "Please try again. If this keeps happening, contact support.",
      hi: "कृपया पुनः प्रयास करें। यदि यह जारी रहे तो सहायता से संपर्क करें।",
    },
  },
};

// ─── Component ──────────────────────────────────────────────────

export function ConsentHandoff({
  aaSdk,
  locale = "en",
  onSuccess,
  onRetry,
  onBack,
  timeoutMs = 45000,
}: ConsentHandoffProps) {
  const isHi = locale === "hi";
  const [status, setStatus] = useState<ConsentStatus>("IDLE");
  const [progress, setProgress] = useState(0);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Progress timer (estimated 45s) ──────────────────────
  const startProgressTimer = useCallback(() => {
    setProgress(0);
    const intervalMs = 500;
    const totalSteps = timeoutMs / intervalMs;
    let step = 0;

    timerRef.current = setInterval(() => {
      step++;
      if (!mountedRef.current) return;
      const pct = Math.min(Math.round((step / totalSteps) * 100), 95);
      setProgress(pct);
      if (step >= totalSteps) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, intervalMs);
  }, [timeoutMs]);

  // ─── Initiate consent ────────────────────────────────────
  const handleInitiate = useCallback(async () => {
    setStatus("IN_FLIGHT");
    startProgressTimer();

    try {
      const result = await aaSdk.initiateConsent();

      if (timerRef.current) clearInterval(timerRef.current);
      if (!mountedRef.current) return;

      if (result.status === "SUCCESS" && result.consentId) {
        setStatus("SUCCESS");
        setProgress(100);
        onSuccess(result.consentId);
      } else {
        setStatus(result.status as ConsentStatus);
      }
    } catch {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mountedRef.current) setStatus("ERROR");
    }
  }, [aaSdk, onSuccess, startProgressTimer]);

  // ─── Auto-initiate on mount ──────────────────────────────
  useEffect(() => {
    handleInitiate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render: In-flight ───────────────────────────────────
  if (status === "IN_FLIGHT") {
    return (
      <View testID="consent-in-flight" style={styles.container}>
        <Text testID="consent-progress-title" style={[styles.title, isHi && styles.titleHi]}>
          {isHi
            ? "आपके बैंक से जुड़ रहे हैं…"
            : "Connecting to your bank…"}
        </Text>

        {/* Progress bar */}
        <View testID="consent-progress-bar" style={styles.progressTrack}>
          <View
            testID="consent-progress-fill"
            style={[styles.progressFill, { width: `${progress}%` }]}
          />
        </View>

        <Text testID="consent-progress-pct" style={styles.progressText}>
          {isHi ? `लगभग ${progress}%` : `~${progress}%`}
        </Text>

        <Text style={[styles.body, isHi && styles.bodyHi]}>
          {isHi
            ? "यह आमतौर पर 45 सेकंड लेता है।"
            : "This usually takes about 45 seconds."}
        </Text>
      </View>
    );
  }

  // ─── Render: Error states ────────────────────────────────
  if (
    status === "DENIED" ||
    status === "BANK_UNAVAILABLE" ||
    status === "TIMEOUT" ||
    status === "ERROR"
  ) {
    const copy = ERROR_COPY[status] ?? ERROR_COPY.ERROR;

    return (
      <View testID={`consent-error-${status.toLowerCase()}`} style={styles.container}>
        <Text
          testID="consent-error-icon"
          style={styles.errorIcon}
        >
          {status === "TIMEOUT" ? "⏳" : "⚠"}
        </Text>

        <Text
          testID="consent-error-title"
          style={[styles.title, isHi && styles.titleHi]}
        >
          {isHi ? copy.title.hi : copy.title.en}
        </Text>

        <Text
          testID="consent-error-body"
          style={[styles.body, isHi && styles.bodyHi]}
        >
          {isHi ? copy.body.hi : copy.body.en}
        </Text>

        {/* Retry CTA (not for timeout — user is told they'll be notified) */}
        {status !== "TIMEOUT" && (
          <Pressable
            testID="consent-retry-btn"
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={isHi ? "पुनः प्रयास करें" : "Try again"}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.retryText}>
              {isHi ? "पुनः प्रयास करें" : "Try again"}
            </Text>
          </Pressable>
        )}

        <Pressable
          testID="consent-back-btn"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={isHi ? "वापस जाएं" : "Go back"}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>
            {isHi ? "वापस जाएं" : "Go back"}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ─── Render: Success (brief — parent transitions to next step) ──
  if (status === "SUCCESS") {
    return (
      <View testID="consent-success" style={styles.container}>
        <Text style={styles.successIcon}>✓</Text>
        <Text
          testID="consent-success-title"
          style={[styles.title, isHi && styles.titleHi]}
        >
          {isHi ? "बैंक सफलतापूर्वक जुड़ गया!" : "Bank connected successfully!"}
        </Text>
      </View>
    );
  }

  // ─── Render: IDLE (shouldn't stay here) ──────────────────
  return null;
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: neutral[900],
    textAlign: "center",
    lineHeight: 26,
  },
  titleHi: {
    lineHeight: 28.8, // 18 * 1.6
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: neutral[500],
    textAlign: "center",
  },
  bodyHi: {
    lineHeight: 22.4, // 14 * 1.6
  },
  // ─── Progress ────────────────────────────────────────────
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: neutral[200],
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: brand.primary[500],
  },
  progressText: {
    fontSize: 13,
    color: neutral[500],
  },
  // ─── Error ───────────────────────────────────────────────
  errorIcon: {
    fontSize: 40,
  },
  retryBtn: {
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
  retryText: {
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
  // ─── Success ─────────────────────────────────────────────
  successIcon: {
    fontSize: 48,
    color: brand.primary[500],
  },
});

export default ConsentHandoff;
