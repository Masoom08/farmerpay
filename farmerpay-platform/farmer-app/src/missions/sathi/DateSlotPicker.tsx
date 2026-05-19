/**
 * DateSlotPicker — Next-7-days date + morning/afternoon slot picker (F5 — Spec §4.4).
 *
 * Shows: horizontal date strip (next 7 days), slot toggles (morning/afternoon),
 * optional note TextInput, confirm CTA.
 * Error states: sathi_not_assigned, slot_full, visit_cancelled.
 */

import React, { useState, useMemo, useCallback } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { brand, neutral } from "../../theme";

// ─── Types ──────────────────────────────────────────────────────

export type Slot = "morning" | "afternoon";

export type BookingError = "SATHI_NOT_ASSIGNED" | "SLOT_FULL" | "VISIT_CANCELLED";

export interface DateSlotPickerProps {
  locale?: "en" | "hi";
  /** Starting date for the 7-day range (default: today). Injected for testability. */
  startDate?: Date;
  onConfirm: (date: Date, slot: Slot, note: string) => void;
  onBack: () => void;
  /** External error state */
  error?: BookingError | null;
  /** Slots that are full: "YYYY-MM-DD:morning" / "YYYY-MM-DD:afternoon" */
  fullSlots?: Set<string>;
}

// ─── Error copy ─────────────────────────────────────────────────

interface ErrorCopy {
  title: { en: string; hi: string };
  body: { en: string; hi: string };
}

const ERROR_COPY: Record<BookingError, ErrorCopy> = {
  SATHI_NOT_ASSIGNED: {
    title: { en: "No Sathi assigned yet", hi: "अभी कोई साथी असाइन नहीं है" },
    body: {
      en: "A Sathi has not been assigned to your area yet. We'll notify you when one is available.",
      hi: "आपके क्षेत्र में अभी कोई साथी असाइन नहीं है। उपलब्ध होने पर हम आपको सूचित करेंगे।",
    },
  },
  SLOT_FULL: {
    title: { en: "This slot is full", hi: "यह स्लॉट भरा हुआ है" },
    body: {
      en: "Please choose a different date or time slot.",
      hi: "कृपया कोई अन्य तारीख या समय चुनें।",
    },
  },
  VISIT_CANCELLED: {
    title: { en: "Visit cancelled", hi: "विज़िट रद्द हो गई" },
    body: {
      en: "Your Sathi visit has been cancelled. You can book again.",
      hi: "आपकी साथी विज़िट रद्द हो गई है। आप फिर से बुक कर सकते हैं।",
    },
  },
};

// ─── Helpers ────────────────────────────────────────────────────

const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_HI = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];
const MONTH_NAMES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES_HI = ["जन", "फर", "मार्च", "अप्रैल", "मई", "जून", "जुला", "अग", "सित", "अक्टू", "नव", "दिस"];

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildNext7Days(start: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

// ─── Component ──────────────────────────────────────────────────

export function DateSlotPicker({
  locale = "en",
  startDate,
  onConfirm,
  onBack,
  error = null,
  fullSlots = new Set(),
}: DateSlotPickerProps) {
  const isHi = locale === "hi";
  const days = useMemo(() => buildNext7Days(startDate ?? new Date()), [startDate]);
  const [selectedDate, setSelectedDate] = useState<Date>(days[0]);
  const [selectedSlot, setSelectedSlot] = useState<Slot>("morning");
  const [note, setNote] = useState("");

  const dayNames = isHi ? DAY_NAMES_HI : DAY_NAMES_EN;
  const monthNames = isHi ? MONTH_NAMES_HI : MONTH_NAMES_EN;

  const isSlotFull = useCallback(
    (date: Date, slot: Slot): boolean => {
      return fullSlots.has(`${formatDateKey(date)}:${slot}`);
    },
    [fullSlots],
  );

  const currentSlotFull = isSlotFull(selectedDate, selectedSlot);

  const handleConfirm = useCallback(() => {
    if (currentSlotFull) return;
    onConfirm(selectedDate, selectedSlot, note);
  }, [selectedDate, selectedSlot, note, onConfirm, currentSlotFull]);

  // ─── Error state ─────────────────────────────────────────
  if (error) {
    const copy = ERROR_COPY[error];
    return (
      <View testID={`sathi-error-${error.toLowerCase()}`} style={styles.container}>
        <Text testID="sathi-error-icon" style={styles.errorIcon}>⚠</Text>
        <Text testID="sathi-error-title" style={[styles.errorTitle, isHi && styles.errorTitleHi]}>
          {isHi ? copy.title.hi : copy.title.en}
        </Text>
        <Text testID="sathi-error-body" style={[styles.errorBody, isHi && styles.errorBodyHi]}>
          {isHi ? copy.body.hi : copy.body.en}
        </Text>
        <Pressable
          testID="sathi-error-back-btn"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={isHi ? "वापस जाएं" : "Go back"}
          style={({ pressed }) => [styles.backBtnPrimary, pressed && styles.btnPressed]}
        >
          <Text style={styles.backBtnText}>{isHi ? "वापस जाएं" : "Go back"}</Text>
        </Pressable>
      </View>
    );
  }

  // ─── Normal picker ───────────────────────────────────────
  return (
    <View testID="date-slot-picker" style={styles.container}>
      {/* ─── Title ──────────────────────────────────── */}
      <Text testID="picker-title" style={[styles.title, isHi && styles.titleHi]} accessibilityRole="header">
        {isHi ? "तारीख और समय चुनें" : "Pick a date and time"}
      </Text>

      {/* ─── Date strip ─────────────────────────────── */}
      <ScrollView
        testID="date-strip"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStrip}
      >
        {days.map((day, idx) => {
          const isSelected = formatDateKey(day) === formatDateKey(selectedDate);
          return (
            <Pressable
              key={idx}
              testID={`date-cell-${idx}`}
              onPress={() => setSelectedDate(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${dayNames[day.getDay()]} ${day.getDate()} ${monthNames[day.getMonth()]}`}
              style={[styles.dateCell, isSelected && styles.dateCellSelected]}
            >
              <Text style={[styles.dateDayName, isSelected && styles.dateDayNameSelected]}>
                {dayNames[day.getDay()]}
              </Text>
              <Text
                testID={`date-num-${idx}`}
                style={[styles.dateNum, isSelected && styles.dateNumSelected]}
              >
                {day.getDate()}
              </Text>
              <Text style={[styles.dateMonth, isSelected && styles.dateMonthSelected]}>
                {monthNames[day.getMonth()]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ─── Slot toggles ───────────────────────────── */}
      <View testID="slot-toggles" style={styles.slotRow}>
        {(["morning", "afternoon"] as Slot[]).map((slot) => {
          const isActive = selectedSlot === slot;
          const isFull = isSlotFull(selectedDate, slot);
          const label = slot === "morning"
            ? isHi ? "सुबह" : "Morning"
            : isHi ? "दोपहर" : "Afternoon";

          return (
            <Pressable
              key={slot}
              testID={`slot-${slot}`}
              onPress={() => !isFull && setSelectedSlot(slot)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive, disabled: isFull }}
              accessibilityLabel={`${label}${isFull ? (isHi ? " — भरा हुआ" : " — full") : ""}`}
              disabled={isFull}
              style={[
                styles.slotBtn,
                isActive && styles.slotBtnActive,
                isFull && styles.slotBtnFull,
              ]}
            >
              <Text style={[
                styles.slotText,
                isActive && styles.slotTextActive,
                isFull && styles.slotTextFull,
              ]}>
                {label}
              </Text>
              {isFull && (
                <Text testID={`slot-full-${slot}`} style={styles.slotFullBadge}>
                  {isHi ? "भरा" : "Full"}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ─── Slot-full inline warning ───────────────── */}
      {currentSlotFull && (
        <Text testID="slot-full-warning" style={styles.slotFullWarning}>
          {isHi ? "यह स्लॉट भरा है। कृपया अन्य समय चुनें।" : "This slot is full. Please choose another time."}
        </Text>
      )}

      {/* ─── Optional note ──────────────────────────── */}
      <TextInput
        testID="booking-note"
        style={[styles.noteInput, isHi && styles.noteInputHi]}
        placeholder={isHi ? "वैकल्पिक नोट (जैसे: खेत का पता)" : "Optional note (e.g. farm address)"}
        placeholderTextColor={neutral[500]}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={200}
        accessibilityLabel={isHi ? "नोट" : "Note"}
      />

      {/* ─── Confirm ────────────────────────────────── */}
      <Pressable
        testID="booking-confirm-btn"
        onPress={handleConfirm}
        accessibilityRole="button"
        accessibilityLabel={isHi ? "बुकिंग पुष्टि करें" : "Confirm booking"}
        disabled={currentSlotFull}
        style={({ pressed }) => [
          styles.confirmBtn,
          pressed && styles.btnPressed,
          currentSlotFull && styles.confirmBtnDisabled,
        ]}
      >
        <Text style={styles.confirmText}>
          {isHi ? "बुक करें" : "Book visit"}
        </Text>
      </Pressable>

      {/* ─── Back ───────────────────────────────────── */}
      <Pressable
        testID="picker-back-btn"
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={isHi ? "वापस जाएं" : "Go back"}
        style={styles.backLink}
      >
        <Text style={styles.backLinkText}>{isHi ? "वापस जाएं" : "Go back"}</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: neutral[900],
    textAlign: "center",
  },
  titleHi: { lineHeight: 32 },
  // ─── Date strip ──────────────────────────────────────────
  dateStrip: {
    gap: 8,
    paddingHorizontal: 4,
  },
  dateCell: {
    width: 64,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: "#FFFFFF",
  },
  dateCellSelected: {
    backgroundColor: brand.primary[500],
    borderColor: brand.primary[500],
  },
  dateDayName: { fontSize: 11, color: neutral[500], fontWeight: "500" },
  dateDayNameSelected: { color: "#FFFFFF" },
  dateNum: { fontSize: 20, fontWeight: "700", color: neutral[900] },
  dateNumSelected: { color: "#FFFFFF" },
  dateMonth: { fontSize: 11, color: neutral[500] },
  dateMonthSelected: { color: "rgba(255,255,255,0.8)" },
  // ─── Slot toggles ───────────────────────────────────────
  slotRow: {
    flexDirection: "row",
    gap: 12,
    alignSelf: "stretch",
  },
  slotBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: "#FFFFFF",
    minHeight: 48,
    justifyContent: "center",
  },
  slotBtnActive: {
    backgroundColor: brand.primary[50],
    borderColor: brand.primary[500],
  },
  slotBtnFull: {
    backgroundColor: neutral[100],
    borderColor: neutral[200],
    opacity: 0.6,
  },
  slotText: { fontSize: 15, fontWeight: "600", color: neutral[800] },
  slotTextActive: { color: brand.primary[700] },
  slotTextFull: { color: neutral[500] },
  slotFullBadge: { fontSize: 11, color: "#B45309", fontWeight: "600", marginTop: 2 },
  slotFullWarning: { fontSize: 13, color: "#B45309", textAlign: "center" },
  // ─── Note ────────────────────────────────────────────────
  noteInput: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    lineHeight: 21,
    color: neutral[900],
    minHeight: 56,
    textAlignVertical: "top",
  },
  noteInputHi: { lineHeight: 22.4 },
  // ─── Buttons ─────────────────────────────────────────────
  confirmBtn: {
    backgroundColor: brand.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  confirmBtnDisabled: { opacity: 0.4 },
  btnPressed: { opacity: 0.85 },
  confirmText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  backLink: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  backLinkText: { fontSize: 14, color: neutral[500] },
  // ─── Error ───────────────────────────────────────────────
  errorIcon: { fontSize: 40 },
  errorTitle: { fontSize: 18, fontWeight: "700", color: neutral[900], textAlign: "center" },
  errorTitleHi: { lineHeight: 28.8 },
  errorBody: { fontSize: 14, lineHeight: 21, color: neutral[500], textAlign: "center", paddingHorizontal: 24 },
  errorBodyHi: { lineHeight: 22.4 },
  backBtnPrimary: {
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
  backBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});

export default DateSlotPicker;
