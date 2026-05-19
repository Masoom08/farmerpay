/**
 * PMFBY Upload Mission — Full 4-step flow (F3 — Spec §4.2).
 *
 * Step 1 (Intro): certificate illustration, "+22 points · ~4 min"
 * Step 2 (Action): CameraCapture with outline guide
 * Step 3 (Confirm): OCRConfirm with 4 editable fields
 * Step 4 (Result): before/after score
 *
 * OCR via POST /trust/pmfby/ocr → parsed fields + confidence.
 * Offline: queue photo locally; show offline copy.
 * NEVER submit without user confirmation. NEVER silently lose the photo.
 */

import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useMissionRouter } from "../_framework/useMissionRouter";
import { MissionIntro } from "../_framework/MissionIntro";
import { MissionResult } from "../_framework/MissionResult";
import { CameraCapture } from "./CameraCapture";
import { OCRConfirm, type OcrField, type SaveStatus } from "./OCRConfirm";
import { neutral } from "../../theme";

// ─── Types ──────────────────────────────────────────────────────

export interface OcrResponse {
  fields: OcrField[];
}

export interface PmfbyMissionProps {
  farmerId: string;
  currentScore?: number;
  locale?: "en" | "hi";
  /** POST /trust/pmfby/ocr → parsed fields */
  submitOcr: (imageBase64: string) => Promise<OcrResponse>;
  /** POST /trust/pmfby/save → save confirmed fields */
  saveFields: (farmerId: string, fields: OcrField[]) => Promise<void>;
  /** Recompute trust score; returns new score */
  recomputeScore: (farmerId: string) => Promise<{ score: number }>;
  /** Queue photo locally when offline */
  queueOffline?: (imageBase64: string) => Promise<void>;
  isOffline?: boolean;
  onExit: () => void;
}

// ─── Default OCR fields ─────────────────────────────────────────

const DEFAULT_OCR_FIELDS: OcrField[] = [
  { key: "policyNo", label: { en: "Policy No", hi: "पॉलिसी नंबर" }, value: "", confidence: 0 },
  { key: "crop", label: { en: "Crop", hi: "फसल" }, value: "", confidence: 0 },
  { key: "insuredAmount", label: { en: "Insured amount", hi: "बीमित राशि" }, value: "", confidence: 0 },
  { key: "validTill", label: { en: "Valid till", hi: "वैध तक" }, value: "", confidence: 0 },
];

// ─── Illustration stub ──────────────────────────────────────────

function CertificateIllustration() {
  return (
    <View testID="pmfby-illustration" style={illustrationStyles.wrap}>
      <Text style={illustrationStyles.icon}>📄🌾</Text>
    </View>
  );
}

const illustrationStyles = StyleSheet.create({
  wrap: { width: 120, height: 120, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 48 },
});

// ─── Component ──────────────────────────────────────────────────

export function PmfbyMission({
  farmerId,
  currentScore,
  locale = "en",
  submitOcr,
  saveFields,
  recomputeScore,
  queueOffline,
  isOffline = false,
  onExit,
}: PmfbyMissionProps) {
  const router = useMissionRouter({ missionId: `pmfby-${farmerId}`, onExit });
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrFields, setOcrFields] = useState<OcrField[]>(DEFAULT_OCR_FIELDS);
  const [beforeScore] = useState(currentScore);
  const [afterScore, setAfterScore] = useState<number | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("IDLE");

  // ─── Camera capture → OCR ────────────────────────────────
  const handleCapture = useCallback(
    async (imageBase64: string) => {
      setCapturedImage(imageBase64);

      if (isOffline) {
        // Queue locally and move to confirm with empty fields for manual entry
        queueOffline?.(imageBase64);
        setOcrFields(DEFAULT_OCR_FIELDS);
        router.next(); // ACTION → CONFIRM
        return;
      }

      try {
        const result = await submitOcr(imageBase64);
        setOcrFields(result.fields);
      } catch {
        // OCR failed — let user manually fill fields
        setOcrFields(DEFAULT_OCR_FIELDS);
      }
      router.next(); // ACTION → CONFIRM
    },
    [isOffline, queueOffline, submitOcr, router],
  );

  // ─── Confirm → Save → Result ─────────────────────────────
  const handleConfirm = useCallback(
    async (editedFields: OcrField[]) => {
      setSaveStatus("SAVING");

      try {
        await saveFields(farmerId, editedFields);
        setSaveStatus("SUCCESS");

        // Recompute score
        try {
          const result = await recomputeScore(farmerId);
          setAfterScore(result.score);
        } catch {
          // Score recompute failed — show result without after
        }

        router.next(); // CONFIRM → RESULT
      } catch {
        // Save failed — photo preserved locally, show error
        setSaveStatus("FAILED");
        // Do NOT advance — user sees the error and can retry
      }
    },
    [farmerId, saveFields, recomputeScore, router],
  );

  // ─── Render per step ─────────────────────────────────────

  switch (router.step) {
    case "INTRO":
      return (
        <View testID="pmfby-mission" style={styles.container}>
          <MissionIntro
            title={{
              en: "Upload crop insurance",
              hi: "फसल बीमा अपलोड करें",
            }}
            body={{
              en: "Take a photo of your PMFBY certificate. We'll read the details automatically.",
              hi: "अपने PMFBY प्रमाणपत्र की फोटो लें। हम विवरण स्वचालित रूप से पढ़ लेंगे।",
            }}
            illustration={CertificateIllustration}
            pointLift={22}
            estimatedMinutes={4}
            primaryCta={{
              en: "Take photo",
              hi: "फोटो लें",
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
        <View testID="pmfby-mission" style={styles.container}>
          <CameraCapture
            locale={locale}
            onCapture={handleCapture}
            onBack={() => router.back()}
            isOffline={isOffline}
          />
        </View>
      );

    case "CONFIRM":
      return (
        <View testID="pmfby-mission" style={styles.container}>
          <OCRConfirm
            fields={ocrFields}
            locale={locale}
            isOffline={isOffline}
            onConfirm={handleConfirm}
            onCancel={() => router.back()}
            saveStatus={saveStatus}
          />
        </View>
      );

    case "RESULT":
      return (
        <View testID="pmfby-mission" style={styles.container}>
          <MissionResult
            beforeScore={beforeScore}
            afterScore={afterScore}
            estimatedLift={22}
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

// ─── Re-exports ─────────────────────────────────────────────────

export { CameraCapture } from "./CameraCapture";
export { OCRConfirm } from "./OCRConfirm";
export type { OcrField, SaveStatus } from "./OCRConfirm";
export type { CaptureError, CaptureStatus } from "./CameraCapture";

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default PmfbyMission;
