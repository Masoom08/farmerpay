/**
 * OCRConfirm — Editable OCR preview for PMFBY certificate (F3 — Spec §4.2).
 *
 * Shows 4 parsed fields: Policy No, Crop, Insured amount, Valid till.
 * Each field is editable (tap → TextInput). Low-confidence fields auto-highlighted.
 * User must confirm before submission — NEVER submit without user confirmation.
 * On server save failure, photo is preserved locally — NEVER silently lost.
 */

import React, { useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { brand, neutral } from "../../theme";

// ─── Types ──────────────────────────────────────────────────────

export interface OcrField {
  key: string;
  label: { en: string; hi: string };
  value: string;
  confidence: number; // 0..1
}

export type SaveStatus = "IDLE" | "SAVING" | "SUCCESS" | "FAILED";

export interface OCRConfirmProps {
  fields: OcrField[];
  locale?: "en" | "hi";
  isOffline?: boolean;
  onConfirm: (editedFields: OcrField[]) => void;
  onCancel: () => void;
  /** Externally controlled save status */
  saveStatus?: SaveStatus;
}

// ─── Constants ──────────────────────────────────────────────────

const LOW_CONFIDENCE_THRESHOLD = 0.7;

// ─── Error copy ─────────────────────────────────────────────────

const SAVE_ERROR_COPY = {
  en: "Could not save to server. Your photo is saved locally and will be uploaded when you're back online.",
  hi: "सर्वर पर सेव नहीं हो सका। आपकी फोटो स्थानीय रूप से सेव है और ऑनलाइन होने पर अपलोड होगी।",
} as const;

// ─── Component ──────────────────────────────────────────────────

export function OCRConfirm({
  fields: initialFields,
  locale = "en",
  isOffline = false,
  onConfirm,
  onCancel,
  saveStatus = "IDLE",
}: OCRConfirmProps) {
  const isHi = locale === "hi";
  const [fields, setFields] = useState<OcrField[]>(initialFields);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // ─── Field edit handlers ──────────────────────────────────
  const handleFieldTap = useCallback((key: string) => {
    setEditingKey(key);
  }, []);

  const handleFieldChange = useCallback(
    (key: string, newValue: string) => {
      setFields((prev) =>
        prev.map((f) =>
          f.key === key ? { ...f, value: newValue, confidence: 1 } : f,
        ),
      );
    },
    [],
  );

  const handleFieldBlur = useCallback(() => {
    setEditingKey(null);
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(fields);
  }, [fields, onConfirm]);

  return (
    <View testID="ocr-confirm" style={styles.container}>
      {/* ─── Title ──────────────────────────────────── */}
      <Text
        testID="ocr-confirm-title"
        style={[styles.title, isHi && styles.titleHi]}
        accessibilityRole="header"
      >
        {isHi ? "विवरण की जाँच करें" : "Review the details"}
      </Text>

      <Text style={[styles.subtitle, isHi && styles.subtitleHi]}>
        {isHi
          ? "किसी भी फील्ड को ठीक करने के लिए टैप करें"
          : "Tap any field to correct it"}
      </Text>

      {/* ─── Fields list ────────────────────────────── */}
      <View testID="ocr-fields" style={styles.fieldsList}>
        {fields.map((field) => {
          const isEditing = editingKey === field.key;
          const isLowConf = field.confidence < LOW_CONFIDENCE_THRESHOLD;
          const label = isHi ? field.label.hi : field.label.en;

          return (
            <View
              key={field.key}
              testID={`ocr-field-${field.key}`}
              style={[
                styles.fieldRow,
                isLowConf && styles.fieldRowLowConf,
              ]}
            >
              <Text
                testID={`ocr-label-${field.key}`}
                style={styles.fieldLabel}
              >
                {label}
                {isLowConf && (
                  <Text style={styles.lowConfBadge}>
                    {" "}
                    {isHi ? "(जाँचें)" : "(check)"}
                  </Text>
                )}
              </Text>

              {isEditing ? (
                <TextInput
                  testID={`ocr-input-${field.key}`}
                  style={styles.fieldInput}
                  value={field.value}
                  onChangeText={(text) => handleFieldChange(field.key, text)}
                  onBlur={handleFieldBlur}
                  autoFocus
                  accessibilityLabel={`${label} input`}
                />
              ) : (
                <Pressable
                  testID={`ocr-value-${field.key}`}
                  onPress={() => handleFieldTap(field.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}: ${field.value}. Tap to edit`}
                  accessibilityHint={isHi ? "संपादित करने के लिए टैप करें" : "Tap to edit"}
                >
                  <Text
                    style={[
                      styles.fieldValue,
                      isLowConf && styles.fieldValueLowConf,
                    ]}
                  >
                    {field.value}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      {/* ─── Offline indicator ──────────────────────── */}
      {isOffline && (
        <View testID="ocr-offline-badge" style={styles.offlineBadge}>
          <Text style={styles.offlineText}>
            {isHi
              ? "ऑफ़लाइन — डेटा स्थानीय रूप से सेव होगा"
              : "Offline — data will be saved locally"}
          </Text>
        </View>
      )}

      {/* ─── Save error ─────────────────────────────── */}
      {saveStatus === "FAILED" && (
        <View testID="ocr-save-error" style={styles.saveError}>
          <Text testID="ocr-save-error-text" style={[styles.saveErrorText, isHi && styles.saveErrorTextHi]}>
            {isHi ? SAVE_ERROR_COPY.hi : SAVE_ERROR_COPY.en}
          </Text>
        </View>
      )}

      {/* ─── Buttons ───────────────────────────────── */}
      <View style={styles.buttons}>
        <Pressable
          testID="ocr-confirm-btn"
          onPress={handleConfirm}
          accessibilityRole="button"
          accessibilityLabel={isHi ? "पुष्टि करें और सबमिट करें" : "Confirm and submit"}
          disabled={saveStatus === "SAVING"}
          style={({ pressed }) => [
            styles.confirmBtn,
            pressed && styles.btnPressed,
            saveStatus === "SAVING" && styles.btnDisabled,
          ]}
        >
          <Text style={styles.confirmText}>
            {saveStatus === "SAVING"
              ? isHi
                ? "सेव हो रहा है…"
                : "Saving…"
              : isHi
                ? "पुष्टि करें"
                : "Confirm"}
          </Text>
        </Pressable>

        <Pressable
          testID="ocr-cancel-btn"
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={isHi ? "रद्द करें" : "Cancel"}
          style={styles.cancelBtn}
        >
          <Text style={styles.cancelText}>
            {isHi ? "रद्द करें" : "Cancel"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: neutral[900],
    textAlign: "center",
  },
  titleHi: {
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 13,
    color: neutral[500],
    textAlign: "center",
  },
  subtitleHi: {
    lineHeight: 20.8,
  },
  fieldsList: {
    gap: 12,
  },
  fieldRow: {
    backgroundColor: neutral[50],
    borderRadius: 8,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: neutral[200],
  },
  fieldRowLowConf: {
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: neutral[500],
  },
  lowConfBadge: {
    color: "#B45309",
    fontWeight: "600",
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: "600",
    color: neutral[900],
    paddingVertical: 4,
    minHeight: 32,
  },
  fieldValueLowConf: {
    color: "#92400E",
  },
  fieldInput: {
    fontSize: 15,
    fontWeight: "600",
    color: neutral[900],
    borderBottomWidth: 2,
    borderBottomColor: brand.primary[500],
    paddingVertical: 4,
    minHeight: 32,
  },
  offlineBadge: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  offlineText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
  },
  saveError: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
  },
  saveErrorText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#991B1B",
  },
  saveErrorTextHi: {
    lineHeight: 20.8,
  },
  buttons: {
    gap: 12,
    marginTop: 8,
  },
  confirmBtn: {
    backgroundColor: brand.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cancelBtn: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    color: neutral[500],
  },
});

export default OCRConfirm;
