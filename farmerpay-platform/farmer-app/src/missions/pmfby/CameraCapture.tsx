/**
 * CameraCapture — Camera with outline guide for PMFBY certificate (F3 — Spec §4.2).
 *
 * Shows an on-screen overlay box with voice-guided framing instructions.
 * Captures photo, validates basic quality (blur detection delegated to backend).
 *
 * Error states: blurry image, not a PMFBY cert (from backend).
 * Offline: queues photo locally.
 */

import React, { useState, useRef, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { neutral, brand } from "../../theme";

// ─── Types ──────────────────────────────────────────────────────

export type CaptureStatus = "READY" | "CAPTURING" | "CAPTURED" | "ERROR";

export type CaptureError = "BLURRY" | "NOT_PMFBY" | "CAMERA_ERROR";

export interface CameraCaptureProps {
  locale?: "en" | "hi";
  /** Called with base64 image data on successful capture */
  onCapture: (imageBase64: string) => void;
  onBack: () => void;
  /** Injected camera module for testability */
  cameraRef?: {
    takePictureAsync: () => Promise<{ base64: string } | null>;
  };
  /** Simulate an error for testing */
  simulateError?: CaptureError | null;
  /** Whether device is offline */
  isOffline?: boolean;
}

// ─── Error copy ─────────────────────────────────────────────────

interface ErrorCopy {
  title: { en: string; hi: string };
  body: { en: string; hi: string };
}

const ERROR_COPY: Record<CaptureError, ErrorCopy> = {
  BLURRY: {
    title: { en: "Image is blurry", hi: "तस्वीर धुंधली है" },
    body: {
      en: "Please hold steady and try again. Make sure there is enough light.",
      hi: "कृपया स्थिर रहें और पुनः प्रयास करें। सुनिश्चित करें कि पर्याप्त रोशनी हो।",
    },
  },
  NOT_PMFBY: {
    title: { en: "Not a PMFBY certificate", hi: "यह PMFBY प्रमाणपत्र नहीं है" },
    body: {
      en: "The image doesn't look like a crop insurance certificate. Please try with the correct document.",
      hi: "यह तस्वीर फसल बीमा प्रमाणपत्र जैसी नहीं लगती। कृपया सही दस्तावेज़ से प्रयास करें।",
    },
  },
  CAMERA_ERROR: {
    title: { en: "Camera error", hi: "कैमरा त्रुटि" },
    body: {
      en: "Could not access the camera. Please check permissions and try again.",
      hi: "कैमरा एक्सेस नहीं हो सका। कृपया अनुमति जाँचें और पुनः प्रयास करें।",
    },
  },
};

// ─── Component ──────────────────────────────────────────────────

export function CameraCapture({
  locale = "en",
  onCapture,
  onBack,
  cameraRef,
  simulateError = null,
  isOffline = false,
}: CameraCaptureProps) {
  const isHi = locale === "hi";
  const [status, setStatus] = useState<CaptureStatus>(
    simulateError ? "ERROR" : "READY",
  );
  const [error, setError] = useState<CaptureError | null>(simulateError);

  const handleCapture = useCallback(async () => {
    if (status === "CAPTURING") return;
    setStatus("CAPTURING");

    try {
      if (!cameraRef) {
        // No camera ref = stub mode (tests or preview)
        setStatus("ERROR");
        setError("CAMERA_ERROR");
        return;
      }

      const result = await cameraRef.takePictureAsync();

      if (!result || !result.base64) {
        setStatus("ERROR");
        setError("CAMERA_ERROR");
        return;
      }

      setStatus("CAPTURED");
      onCapture(result.base64);
    } catch {
      setStatus("ERROR");
      setError("CAMERA_ERROR");
    }
  }, [cameraRef, onCapture, status]);

  const handleRetry = useCallback(() => {
    setStatus("READY");
    setError(null);
  }, []);

  // ─── Error state ─────────────────────────────────────────
  if (status === "ERROR" && error) {
    const copy = ERROR_COPY[error];

    return (
      <View testID={`camera-error-${error.toLowerCase()}`} style={styles.container}>
        <Text testID="camera-error-icon" style={styles.errorIcon}>⚠</Text>

        <Text testID="camera-error-title" style={[styles.errorTitle, isHi && styles.errorTitleHi]}>
          {isHi ? copy.title.hi : copy.title.en}
        </Text>

        <Text testID="camera-error-body" style={[styles.errorBody, isHi && styles.errorBodyHi]}>
          {isHi ? copy.body.hi : copy.body.en}
        </Text>

        <Pressable
          testID="camera-retry-btn"
          onPress={handleRetry}
          accessibilityRole="button"
          accessibilityLabel={isHi ? "पुनः प्रयास करें" : "Try again"}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.btnPressed]}
        >
          <Text style={styles.retryText}>{isHi ? "पुनः प्रयास करें" : "Try again"}</Text>
        </Pressable>

        <Pressable
          testID="camera-back-btn"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={isHi ? "वापस जाएं" : "Go back"}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>{isHi ? "वापस जाएं" : "Go back"}</Text>
        </Pressable>
      </View>
    );
  }

  // ─── Camera view (READY / CAPTURING) ─────────────────────
  return (
    <View testID="camera-capture" style={styles.container}>
      {/* Camera preview placeholder */}
      <View testID="camera-preview" style={styles.preview}>
        {/* Overlay guide box */}
        <View testID="camera-guide-box" style={styles.guideBox} />
      </View>

      {/* Voice-guided instruction */}
      <Text
        testID="camera-instruction"
        style={[styles.instruction, isHi && styles.instructionHi]}
        accessibilityLiveRegion="polite"
      >
        {isHi
          ? "प्रमाणपत्र को बॉक्स के अंदर रखें"
          : "Place the certificate inside the box"}
      </Text>

      {/* Offline indicator */}
      {isOffline && (
        <View testID="camera-offline-badge" style={styles.offlineBadge}>
          <Text style={styles.offlineText}>
            {isHi ? "ऑफ़लाइन — फोटो सेव होगी" : "Offline — photo will be saved locally"}
          </Text>
        </View>
      )}

      {/* Capture button */}
      <Pressable
        testID="camera-shutter-btn"
        onPress={handleCapture}
        accessibilityRole="button"
        accessibilityLabel={isHi ? "फोटो लें" : "Take photo"}
        disabled={status === "CAPTURING"}
        style={({ pressed }) => [
          styles.shutterBtn,
          pressed && styles.shutterPressed,
          status === "CAPTURING" && styles.shutterDisabled,
        ]}
      >
        <View style={styles.shutterInner} />
      </Pressable>

      {/* Back */}
      <Pressable
        testID="camera-nav-back"
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={isHi ? "वापस जाएं" : "Go back"}
        style={styles.navBack}
      >
        <Text style={styles.navBackText}>←</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#000",
  },
  preview: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  guideBox: {
    width: 280,
    height: 180,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 8,
    borderStyle: "dashed",
  },
  instruction: {
    fontSize: 14,
    lineHeight: 21,
    color: "#FFFFFF",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  instructionHi: {
    lineHeight: 22.4,
  },
  offlineBadge: {
    backgroundColor: "rgba(245,158,11,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  shutterPressed: {
    opacity: 0.7,
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
  },
  navBack: {
    position: "absolute",
    top: 16,
    left: 16,
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  navBackText: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  errorIcon: {
    fontSize: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: neutral[900],
    textAlign: "center",
  },
  errorTitleHi: {
    lineHeight: 28.8,
  },
  errorBody: {
    fontSize: 14,
    lineHeight: 21,
    color: neutral[500],
    textAlign: "center",
    paddingHorizontal: 24,
  },
  errorBodyHi: {
    lineHeight: 22.4,
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
    marginHorizontal: 24,
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
});

export default CameraCapture;
