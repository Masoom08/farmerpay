/**
 * Book Sathi Mission — Mission 4 (F5 — Spec §4.4).
 *
 * Step 1 (Intro): Sathi illustration, no "+X points" on intro (§4.4 note: no score delta)
 *   Actually spec says Intro shows pointLift but Result does NOT — so we show 0 / hide on result.
 *   Wait, re-reading: "DO NOT render a "+X points" chip on the MissionResult for this mission"
 *   So Intro can show context but Result must NOT show points. We'll set pointLift=0 on intro too
 *   since there's no score delta for this mission.
 * Step 2 (Action): DateSlotPicker — next 7 days, morning/afternoon
 * Step 3 (Confirm): "Sathi {name} will visit on {day} {date}, {slot}"
 * Step 4 (Result): Booking confirmed — NO score delta / NO "+X points"
 *
 * Privacy card on first booking: "Your Sathi will see only the tasks they need to do — not your score."
 * POST /sathi/tasks with task_type='FARMER_REQUESTED'
 */

import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMissionRouter } from "../_framework/useMissionRouter";
import { MissionIntro } from "../_framework/MissionIntro";
import { MissionConfirm } from "../_framework/MissionConfirm";
import { DateSlotPicker, type Slot, type BookingError } from "./DateSlotPicker";
import { brand, neutral } from "../../theme";

// ─── Types ──────────────────────────────────────────────────────

export interface SathiBookingPayload {
  farmerId: string;
  date: string;       // YYYY-MM-DD
  slot: Slot;
  note: string;
  task_type: "FARMER_REQUESTED";
}

export interface SathiMissionProps {
  farmerId: string;
  sathiName?: string;
  locale?: "en" | "hi";
  /** POST /sathi/tasks */
  bookSathi: (payload: SathiBookingPayload) => Promise<{ taskId: string }>;
  /** Slots already full */
  fullSlots?: Set<string>;
  /** External error from booking attempt */
  bookingError?: BookingError | null;
  onExit: () => void;
}

// ─── Constants ──────────────────────────────────────────────────

const PRIVACY_SHOWN_KEY = "farmerpay:sathi_privacy_shown";

const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_HI = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];
const MONTH_NAMES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES_HI = ["जन", "फर", "मार्च", "अप्रैल", "मई", "जून", "जुला", "अग", "सित", "अक्टू", "नव", "दिस"];

// ─── Illustration stub ──────────────────────────────────────────

function SathiIllustration() {
  return (
    <View testID="sathi-illustration" style={illustrationStyles.wrap}>
      <Text style={illustrationStyles.icon}>🤝🏡</Text>
    </View>
  );
}

const illustrationStyles = StyleSheet.create({
  wrap: { width: 120, height: 120, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 48 },
});

// ─── Helpers ────────────────────────────────────────────────────

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatConfirmDate(d: Date, locale: "en" | "hi"): string {
  const dayNames = locale === "hi" ? DAY_NAMES_HI : DAY_NAMES_EN;
  const monthNames = locale === "hi" ? MONTH_NAMES_HI : MONTH_NAMES_EN;
  return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
}

// ─── Component ──────────────────────────────────────────────────

export function SathiMission({
  farmerId,
  sathiName,
  locale = "en",
  bookSathi,
  fullSlots = new Set(),
  bookingError = null,
  onExit,
}: SathiMissionProps) {
  const isHi = locale === "hi";
  const router = useMissionRouter({ missionId: `sathi-${farmerId}`, onExit });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot>("morning");
  const [note, setNote] = useState("");
  const [bookingStatus, setBookingStatus] = useState<"IDLE" | "BOOKING" | "DONE" | "FAILED">("IDLE");
  const [showPrivacy, setShowPrivacy] = useState(false);

  const displayName = sathiName ?? (isHi ? "साथी" : "Sathi");

  // ─── Check if privacy card needs showing ─────────────────
  useEffect(() => {
    async function check() {
      try {
        const shown = await AsyncStorage.getItem(PRIVACY_SHOWN_KEY);
        if (!shown) setShowPrivacy(true);
      } catch { /* ignore */ }
    }
    check();
  }, []);

  const dismissPrivacy = useCallback(async () => {
    setShowPrivacy(false);
    try {
      await AsyncStorage.setItem(PRIVACY_SHOWN_KEY, "true");
    } catch { /* ignore */ }
  }, []);

  // ─── DateSlotPicker confirm handler ──────────────────────
  const handlePickerConfirm = useCallback(
    (date: Date, slot: Slot, noteText: string) => {
      setSelectedDate(date);
      setSelectedSlot(slot);
      setNote(noteText);
      router.next(); // ACTION → CONFIRM
    },
    [router],
  );

  // ─── Book the visit ──────────────────────────────────────
  const handleBookConfirm = useCallback(async () => {
    if (!selectedDate) return;
    setBookingStatus("BOOKING");

    try {
      await bookSathi({
        farmerId,
        date: formatDateKey(selectedDate),
        slot: selectedSlot,
        note,
        task_type: "FARMER_REQUESTED",
      });
      setBookingStatus("DONE");
      router.next(); // CONFIRM → RESULT
    } catch {
      setBookingStatus("FAILED");
    }
  }, [selectedDate, selectedSlot, note, farmerId, bookSathi, router]);

  // ─── Build confirm summary ───────────────────────────────
  const confirmSummary = selectedDate
    ? isHi
      ? `${displayName} ${formatConfirmDate(selectedDate, "hi")}, ${selectedSlot === "morning" ? "सुबह" : "दोपहर"} को आएंगे`
      : `${displayName} will visit on ${formatConfirmDate(selectedDate, "en")}, ${selectedSlot}`
    : "";

  // ─── Render per step ─────────────────────────────────────

  switch (router.step) {
    case "INTRO":
      return (
        <View testID="sathi-mission" style={styles.container}>
          {/* Privacy info card — first booking only */}
          {showPrivacy && (
            <View testID="sathi-privacy-card" style={styles.privacyCard}>
              <Text testID="sathi-privacy-text" style={[styles.privacyText, isHi && styles.privacyTextHi]}>
                {isHi
                  ? "आपका साथी केवल वही कार्य देखेगा जो उन्हें करने हैं — आपका स्कोर नहीं।"
                  : "Your Sathi will see only the tasks they need to do — not your score."}
              </Text>
              <Pressable
                testID="sathi-privacy-dismiss"
                onPress={dismissPrivacy}
                accessibilityRole="button"
                accessibilityLabel={isHi ? "समझ गया" : "Got it"}
                style={styles.privacyDismiss}
              >
                <Text style={styles.privacyDismissText}>{isHi ? "समझ गया" : "Got it"}</Text>
              </Pressable>
            </View>
          )}

          <MissionIntro
            title={{
              en: "Book a Sathi visit",
              hi: "साथी विज़िट बुक करें",
            }}
            body={{
              en: "A Sathi can help you complete tasks in person — link your bank, upload documents, or answer questions.",
              hi: "एक साथी व्यक्तिगत रूप से कार्य पूरा करने में मदद कर सकता है — बैंक जोड़ना, दस्तावेज़ अपलोड करना, या प्रश्नों का उत्तर देना।",
            }}
            illustration={SathiIllustration}
            pointLift={0}
            estimatedMinutes={2}
            primaryCta={{
              en: "Pick a date",
              hi: "तारीख चुनें",
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
        <View testID="sathi-mission" style={styles.container}>
          <DateSlotPicker
            locale={locale}
            onConfirm={handlePickerConfirm}
            onBack={() => router.back()}
            error={bookingError}
            fullSlots={fullSlots}
          />
        </View>
      );

    case "CONFIRM":
      return (
        <View testID="sathi-mission" style={styles.container}>
          <MissionConfirm
            title={{
              en: "Confirm your booking",
              hi: "बुकिंग पुष्टि करें",
            }}
            summary={{
              en: confirmSummary,
              hi: confirmSummary,
            }}
            confirmLabel={{
              en: bookingStatus === "BOOKING" ? "Booking…" : "Confirm booking",
              hi: bookingStatus === "BOOKING" ? "बुक हो रहा है…" : "बुकिंग पुष्टि करें",
            }}
            cancelLabel={{ en: "Change date", hi: "तारीख बदलें" }}
            onConfirm={handleBookConfirm}
            onCancel={() => router.back()}
            locale={locale}
            items={selectedDate ? [
              {
                label: isHi ? "तारीख" : "Date",
                value: formatConfirmDate(selectedDate, locale),
              },
              {
                label: isHi ? "समय" : "Time",
                value: selectedSlot === "morning"
                  ? isHi ? "सुबह" : "Morning"
                  : isHi ? "दोपहर" : "Afternoon",
              },
              ...(note ? [{
                label: isHi ? "नोट" : "Note",
                value: note,
              }] : []),
            ] : []}
          />

          {bookingStatus === "FAILED" && (
            <View testID="sathi-booking-failed" style={styles.failedBox}>
              <Text style={[styles.failedText, isHi && styles.failedTextHi]}>
                {isHi
                  ? "बुकिंग नहीं हो सकी। कृपया पुनः प्रयास करें।"
                  : "Booking failed. Please try again."}
              </Text>
            </View>
          )}
        </View>
      );

    case "RESULT":
      return (
        <View testID="sathi-mission" style={styles.container}>
          {/* Custom result — NO score delta, NO "+X points" (spec §4.4 note) */}
          <View testID="sathi-result" style={styles.resultContainer}>
            <Text testID="sathi-result-icon" style={styles.resultIcon}>✓</Text>

            <Text testID="sathi-result-title" style={[styles.resultTitle, isHi && styles.resultTitleHi]}>
              {isHi ? "विज़िट बुक हो गई!" : "Visit booked!"}
            </Text>

            <Text testID="sathi-result-summary" style={[styles.resultSummary, isHi && styles.resultSummaryHi]}>
              {confirmSummary}
            </Text>

            {/* NO point-lift badge — spec §4.4 note */}

            <Pressable
              testID="sathi-result-done"
              onPress={async () => {
                await router.clearProgress();
                onExit();
              }}
              accessibilityRole="button"
              accessibilityLabel={isHi ? "हो गया" : "Done"}
              style={({ pressed }) => [styles.doneBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.doneText}>{isHi ? "हो गया" : "Done"}</Text>
            </Pressable>
          </View>
        </View>
      );

    default:
      return null;
  }
}

// ─── Re-exports ─────────────────────────────────────────────────

export { DateSlotPicker } from "./DateSlotPicker";
export type { Slot, BookingError } from "./DateSlotPicker";

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  // ─── Privacy card ────────────────────────────────────────
  privacyCard: {
    backgroundColor: brand.primary[50],
    borderWidth: 1,
    borderColor: brand.primary[500],
    borderRadius: 8,
    padding: 12,
    margin: 16,
    gap: 8,
  },
  privacyText: {
    fontSize: 13,
    lineHeight: 19,
    color: neutral[800],
  },
  privacyTextHi: { lineHeight: 20.8 },
  privacyDismiss: {
    alignSelf: "flex-end",
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyDismissText: {
    fontSize: 13,
    fontWeight: "600",
    color: brand.primary[700],
  },
  // ─── Failed ──────────────────────────────────────────────
  failedBox: {
    margin: 16,
    padding: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  failedText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#991B1B",
    textAlign: "center",
  },
  failedTextHi: { lineHeight: 20.8 },
  // ─── Result ──────────────────────────────────────────────
  resultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  resultIcon: { fontSize: 48, color: brand.primary[500] },
  resultTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: neutral[900],
    textAlign: "center",
  },
  resultTitleHi: { lineHeight: 35.2 },
  resultSummary: {
    fontSize: 15,
    lineHeight: 22,
    color: neutral[800],
    textAlign: "center",
    fontWeight: "500",
  },
  resultSummaryHi: { lineHeight: 24 },
  doneBtn: {
    backgroundColor: brand.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    marginTop: 8,
  },
  btnPressed: { opacity: 0.85 },
  doneText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});

export default SathiMission;
