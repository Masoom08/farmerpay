/**
 * useTts — Text-to-Speech hook wrapping expo-speech (E6 — Spec §3.7).
 *
 * Provides play/stop toggle. Picks voice by locale:
 *   - "hi" → language "hi-IN", falls back to default + dev warning
 *   - "en" → language "en-IN"
 *
 * User must tap to initiate; NEVER auto-plays (§3.7 accessibility).
 */

import { useState, useCallback, useEffect, useRef } from "react";
import * as Speech from "expo-speech";

export type TtsLocale = "en" | "hi";

export interface UseTtsOptions {
  locale?: TtsLocale;
}

export interface UseTtsResult {
  /** true while speech is playing */
  isSpeaking: boolean;
  /** Toggle: if idle → speak text; if speaking → stop */
  toggle: (text: string) => void;
  /** Force stop any in-progress speech */
  stop: () => void;
}

/**
 * Map locale to BCP-47 language tag for expo-speech.
 */
function resolveLanguage(locale: TtsLocale): string {
  return locale === "hi" ? "hi-IN" : "en-IN";
}

export function useTts(options: UseTtsOptions = {}): UseTtsResult {
  const { locale = "en" } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Stop speech on unmount
      Speech.stop();
    };
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
    if (mountedRef.current) setIsSpeaking(false);
  }, []);

  const toggle = useCallback(
    (text: string) => {
      if (isSpeaking) {
        stop();
        return;
      }

      const language = resolveLanguage(locale);

      // Dev-time check for Hindi voice availability
      if (__DEV__ && locale === "hi") {
        Speech.getAvailableVoicesAsync().then((voices) => {
          const hasHindi = voices.some(
            (v) =>
              v.language.startsWith("hi") ||
              v.language.toLowerCase().includes("hindi"),
          );
          if (!hasHindi) {
            console.warn(
              "[useTts] No Hindi voice found on device — falling back to default voice.",
            );
          }
        });
      }

      setIsSpeaking(true);

      Speech.speak(text, {
        language,
        onDone: () => {
          if (mountedRef.current) setIsSpeaking(false);
        },
        onStopped: () => {
          if (mountedRef.current) setIsSpeaking(false);
        },
        onError: () => {
          if (mountedRef.current) setIsSpeaking(false);
        },
      });
    },
    [isSpeaking, locale, stop],
  );

  return { isSpeaking, toggle, stop };
}

export default useTts;
