/**
 * useMissionRouter — 4-step mission state machine (F1 — Spec §4 / §4.1 / §4.5).
 *
 * Steps: INTRO → ACTION → CONFIRM → RESULT
 *
 * Rules:
 *   - Android back on Step 2+ returns to prior step without data loss (§4.1)
 *   - No mission exceeds 5 taps on happy path
 *   - Progress is saved per-mission; re-entry prompts resume (§4.5)
 *   - Point-lift shown on INTRO + RESULT only, NOT ACTION
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ──────────────────────────────────────────────────────

export type MissionStep = "INTRO" | "ACTION" | "CONFIRM" | "RESULT";

export const STEP_ORDER: MissionStep[] = ["INTRO", "ACTION", "CONFIRM", "RESULT"];

export interface MissionProgress {
  /** Arbitrary JSON-safe payload saved per-mission */
  [key: string]: unknown;
}

export interface UseMissionRouterOptions {
  /** Unique ID for this mission (used as persistence key) */
  missionId: string;
  /** Called when user exits the mission (back from INTRO or after RESULT done) */
  onExit: () => void;
}

export interface UseMissionRouterResult {
  /** Current step */
  step: MissionStep;
  /** Current step index (0-based) */
  stepIndex: number;
  /** Advance to next step */
  next: () => void;
  /** Go back to previous step (or exit if on INTRO) */
  back: () => void;
  /** Jump directly to a specific step */
  goTo: (step: MissionStep) => void;
  /** Whether there's saved progress to resume */
  hasResumableProgress: boolean;
  /** Save arbitrary progress data for this mission */
  saveProgress: (data: MissionProgress) => Promise<void>;
  /** Load previously saved progress data */
  loadProgress: () => Promise<MissionProgress | null>;
  /** Clear saved progress (call on RESULT / completion) */
  clearProgress: () => Promise<void>;
  /** Resume from saved progress (jumps to saved step) */
  resume: () => Promise<void>;
  /** Dismiss resume prompt and start fresh */
  startFresh: () => Promise<void>;
}

// ─── Persistence keys ───────────────────────────────────────────

const MISSION_PROGRESS_PREFIX = "farmerpay:mission:";

function storageKey(missionId: string): string {
  return `${MISSION_PROGRESS_PREFIX}${missionId}`;
}

interface SavedState {
  step: MissionStep;
  data: MissionProgress;
  savedAt: number;
}

// ─── Hook ───────────────────────────────────────────────────────

export function useMissionRouter({
  missionId,
  onExit,
}: UseMissionRouterOptions): UseMissionRouterResult {
  const [step, setStep] = useState<MissionStep>("INTRO");
  const [hasResumableProgress, setHasResumableProgress] = useState(false);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  // ─── Check for saved progress on mount ───────────────────
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const raw = await AsyncStorage.getItem(storageKey(missionId));
        if (!cancelled && raw) {
          const saved: SavedState = JSON.parse(raw);
          // Only resumable if we were past INTRO
          if (saved.step !== "INTRO" && saved.step !== "RESULT") {
            setHasResumableProgress(true);
          }
        }
      } catch {
        // Ignore
      }
    }
    check();
    return () => { cancelled = true; };
  }, [missionId]);

  // ─── Android back handler ────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      const idx = STEP_ORDER.indexOf(step);
      if (idx > 0) {
        setStep(STEP_ORDER[idx - 1]);
        return true; // consumed
      }
      // On INTRO, exit the mission
      onExitRef.current();
      return true;
    });

    return () => handler.remove();
  }, [step]);

  // ─── Navigation ──────────────────────────────────────────

  const next = useCallback(() => {
    setStep((current) => {
      const idx = STEP_ORDER.indexOf(current);
      if (idx < STEP_ORDER.length - 1) {
        return STEP_ORDER[idx + 1];
      }
      return current;
    });
  }, []);

  const back = useCallback(() => {
    setStep((current) => {
      const idx = STEP_ORDER.indexOf(current);
      if (idx > 0) {
        return STEP_ORDER[idx - 1];
      }
      // On INTRO → exit
      onExitRef.current();
      return current;
    });
  }, []);

  const goTo = useCallback((target: MissionStep) => {
    setStep(target);
  }, []);

  // ─── Progress persistence ────────────────────────────────

  const saveProgress = useCallback(
    async (data: MissionProgress) => {
      const state: SavedState = {
        step,
        data,
        savedAt: Date.now(),
      };
      await AsyncStorage.setItem(storageKey(missionId), JSON.stringify(state));
    },
    [missionId, step],
  );

  const loadProgress = useCallback(async (): Promise<MissionProgress | null> => {
    try {
      const raw = await AsyncStorage.getItem(storageKey(missionId));
      if (!raw) return null;
      const saved: SavedState = JSON.parse(raw);
      return saved.data;
    } catch {
      return null;
    }
  }, [missionId]);

  const clearProgress = useCallback(async () => {
    await AsyncStorage.removeItem(storageKey(missionId));
    setHasResumableProgress(false);
  }, [missionId]);

  const resume = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey(missionId));
      if (raw) {
        const saved: SavedState = JSON.parse(raw);
        setStep(saved.step);
        setHasResumableProgress(false);
      }
    } catch {
      // Fall through to INTRO
    }
  }, [missionId]);

  const startFresh = useCallback(async () => {
    await AsyncStorage.removeItem(storageKey(missionId));
    setStep("INTRO");
    setHasResumableProgress(false);
  }, [missionId]);

  return {
    step,
    stepIndex: STEP_ORDER.indexOf(step),
    next,
    back,
    goTo,
    hasResumableProgress,
    saveProgress,
    loadProgress,
    clearProgress,
    resume,
    startFresh,
  };
}

export default useMissionRouter;
