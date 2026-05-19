/**
 * TRUST Profile Screen
 *
 * One screen, three views:
 *  1. "sections"  — list of sections with completion bars + score header
 *  2. "detail"    — questions for a section, save responses
 *  3. "score"     — full score dashboard with section breakdown
 *
 * Backed by:
 *  GET  /trust/home                            (one-call dashboard)
 *  GET  /trust/sections/:id/questions          (per-section questions)
 *  POST /trust/responses                       (save answers)
 *  GET  /trust/score/history                   (score timeline)
 *  POST /trust/appeal                          (submit a score appeal)
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { apiGet, apiPost, getToken } from "../lib/api";

// ─── Types ─────────────────────────────────────────────────────────

interface HomeSection {
  sectionId: number;
  sectionName: string;
  sectionCode: string;
  status: "completed" | "in_progress" | "not_started";
  responsesCollected: number;
  totalQuestions: number;
}

interface HomePayload {
  score: { total: number; band: string; bandMin: number; bandMax: number };
  profile: {
    completionPercent: number;
    sections: HomeSection[];
    nextNudge: HomeSection | null;
  };
  activities: { active: string[]; primary: string | null; mix: any };
  expenses?: {
    monthsLogged: number;
    avgLast3MonthsInr: number;
    avgLast6MonthsInr: number;
    currentMonth: { year: number; month: number; logged: boolean };
    nudge: { year: number; month: number; message: string } | null;
  };
  leverage?: {
    additionalEmiCapacityInr: number;
    monthlyIncomeInr: number;
    band: string;
    readinessLabel: "READY" | "PARTIAL" | "INSUFFICIENT_DATA";
    missingInputs: string[];
  } | null;
}

interface Choice {
  choiceId: number;
  text: string;
  value: string;
  order: number;
}

interface Question {
  questionId: number;
  questionText: string;
  questionType: "numeric_input" | "yes_no" | "multiple_choice" | "text";
  minValue: number | null;
  maxValue: number | null;
  unit: string | null;
  choices: Choice[];
}

type ResponseValue = number | string;

interface HistoryItem {
  score: number;
  band: string;
  calculatedAt: string;
  sectionScores?: Record<string, any>;
}

// ─── Constants ─────────────────────────────────────────────────────

const GREEN_DARK = "#1b5e20";
const GREEN_MID = "#2e7d32";
const GREEN_PALE = "#e8f5e9";

const BAND_COLORS: Record<string, string> = {
  excellent: "#1b5e20",
  good: "#388e3c",
  fair: "#f9a825",
  poor: "#c62828",
};

function bandColor(band: string): string {
  return BAND_COLORS[(band || "").toLowerCase()] || "#757575";
}

function bandLabel(band: string): string {
  if (!band) return "—";
  return band.charAt(0).toUpperCase() + band.slice(1);
}

// ─── Component ─────────────────────────────────────────────────────

type ViewMode = "sections" | "detail" | "score" | "history" | "appeal";

export default function TrustProfileScreen() {
  const router = useRouter();

  const [view, setView] = useState<ViewMode>("sections");
  const [home, setHome] = useState<HomePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail-view state
  const [selectedSection, setSelectedSection] = useState<HomeSection | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<number, ResponseValue>>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // History view state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Appeal view state
  const [appealReason, setAppealReason] = useState("");
  const [appealContext, setAppealContext] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  // ─── Data loading ────────────────────────────────────────────────

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadHome = useCallback(async () => {
    setLoadError(null);
    // Bail early if no auth token at all → push to login
    const token = await getToken();
    if (!token) {
      setLoadError("not_authenticated");
      router.replace("/login" as any);
      return;
    }
    try {
      const r = await apiGet("/trust/home");
      if (r?.success && r?.data) {
        setHome(r.data);
      } else if (r?.errorCode === "AUTH_001" || r?.statusCode === 401) {
        setLoadError("not_authenticated");
        router.replace("/login" as any);
      } else {
        setLoadError(r?.message || "Failed to load TRUST profile");
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load TRUST profile";
      // The fetch wrapper throws { statusCode: 401 } on auth fail
      if (e?.statusCode === 401 || /401|unauthor/i.test(msg)) {
        setLoadError("not_authenticated");
        router.replace("/login" as any);
        return;
      }
      setLoadError(msg);
    }
  }, [router]);

  // Re-fetch on every focus so a fresh login auto-recovers stale state
  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        await loadHome();
        setLoading(false);
      })();
    }, [loadHome]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHome();
    setRefreshing(false);
  };

  const openHistory = async () => {
    setView("history");
    setHistoryLoading(true);
    try {
      const r = await apiGet("/trust/score/history");
      if (r?.success) setHistory(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load score history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openAppeal = () => {
    setAppealReason("");
    setAppealContext("");
    setView("appeal");
  };

  const submitAppeal = async () => {
    const reason = appealReason.trim();
    if (reason.length < 10) {
      Alert.alert("Too short", "Appeal reason must be at least 10 characters.");
      return;
    }
    setAppealSubmitting(true);
    try {
      const r = await apiPost("/trust/appeal", {
        appealReason: reason,
        additionalContext: appealContext.trim() || undefined,
      });
      if (r?.success) {
        Alert.alert(
          "Appeal submitted",
          `Your appeal has been recorded${r.data?.appealId ? ` (#${r.data.appealId})` : ""}. We'll review it within 5 working days.`,
          [{ text: "OK", onPress: () => setView("score") }],
        );
      } else {
        Alert.alert("Error", r?.message || "Failed to submit appeal");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to submit appeal");
    } finally {
      setAppealSubmitting(false);
    }
  };

  const openSection = async (s: HomeSection) => {
    setSelectedSection(s);
    setView("detail");
    setQuestionsLoading(true);
    setResponses({});
    try {
      const r = await apiGet(`/trust/sections/${s.sectionId}/questions`);
      if (r?.success) setQuestions(r.data || []);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load questions");
    } finally {
      setQuestionsLoading(false);
    }
  };

  const setAnswer = (qId: number, val: ResponseValue) => {
    setResponses((prev) => ({ ...prev, [qId]: val }));
  };

  const saveSection = async () => {
    if (!selectedSection) return;
    const payload = Object.entries(responses).map(([qId, val]) => ({
      questionId: Number(qId),
      response: val,
    }));
    if (payload.length === 0) {
      Alert.alert("Nothing to save", "Please answer at least one question.");
      return;
    }
    setSaving(true);
    try {
      const r = await apiPost("/trust/responses", {
        sectionId: selectedSection.sectionId,
        responses: payload,
      });
      if (r?.success) {
        await loadHome();
        Alert.alert(
          "Saved",
          `Your answers have been saved.${r.data?.nextSection ? `\n\nNext: ${r.data.nextSection.sectionName}` : ""}`,
          [{ text: "OK", onPress: () => setView("sections") }],
        );
      } else {
        Alert.alert("Error", r?.message || "Failed to save");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN_MID} />
      </View>
    );
  }

  if (!home) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {loadError === "not_authenticated"
            ? "Please log in to view your TRUST profile."
            : loadError
              ? `Unable to load TRUST profile.\n\n${loadError}`
              : "Unable to load TRUST profile."}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={async () => {
          setLoading(true);
          await loadHome();
          setLoading(false);
        }}>
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { marginTop: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: GREEN_DARK }]}
          onPress={() => router.replace("/login" as any)}
        >
          <Text style={[styles.btnText, { color: GREEN_DARK }]}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── DETAIL VIEW ────────────────────────────────────────────────
  if (view === "detail" && selectedSection) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setView("sections")} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.h1}>{selectedSection.sectionName}</Text>
        <Text style={styles.sub}>
          {selectedSection.responsesCollected} / {selectedSection.totalQuestions} answered
        </Text>

        {questionsLoading ? (
          <ActivityIndicator color={GREEN_MID} style={{ marginTop: 24 }} />
        ) : questions.length === 0 ? (
          <Text style={styles.empty}>No questions in this section yet.</Text>
        ) : (
          questions.map((q) => (
            <View key={q.questionId} style={styles.qCard}>
              <Text style={styles.qText}>{q.questionText}</Text>

              {q.questionType === "numeric_input" && (
                <TextInput
                  style={styles.numericInput}
                  keyboardType="numeric"
                  placeholder={q.unit ? `Enter (${q.unit})` : "Enter a number"}
                  value={responses[q.questionId]?.toString() || ""}
                  onChangeText={(t) => setAnswer(q.questionId, parseFloat(t) || 0)}
                />
              )}

              {(q.questionType === "yes_no" || q.questionType === "multiple_choice") &&
                q.choices.map((c) => {
                  const selected = responses[q.questionId] === c.choiceId;
                  return (
                    <TouchableOpacity
                      key={c.choiceId}
                      style={[styles.choice, selected && styles.choiceSelected]}
                      onPress={() => setAnswer(q.questionId, c.choiceId)}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          selected && styles.choiceTextSelected,
                        ]}
                      >
                        {selected ? "● " : "○ "}
                        {c.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
          ))
        )}

        {questions.length > 0 && (
          <TouchableOpacity
            style={[styles.btn, saving && { opacity: 0.6 }]}
            disabled={saving}
            onPress={saveSection}
          >
            <Text style={styles.btnText}>{saving ? "Saving..." : "Save Answers"}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // ─── SCORE VIEW ─────────────────────────────────────────────────
  if (view === "score") {
    const s = home.score;
    const color = bandColor(s.band);
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setView("sections")} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.h1}>Your TRUST Score</Text>

        <View style={[styles.bigScoreCard, { borderColor: color }]}>
          <Text style={[styles.bigScoreNum, { color }]}>{s.total}</Text>
          <Text style={styles.bigScoreOf}>/ 1000</Text>
          <Text style={[styles.bigScoreBand, { color }]}>{bandLabel(s.band)}</Text>
          <Text style={styles.bigScoreRange}>
            Band: {s.bandMin} – {s.bandMax}
          </Text>
        </View>

        {/* History + Appeal CTAs */}
        <View style={styles.scoreActionsRow}>
          <TouchableOpacity
            style={[styles.scoreActionBtn, { backgroundColor: GREEN_PALE, borderColor: GREEN_MID }]}
            onPress={openHistory}
            activeOpacity={0.85}
          >
            <Text style={[styles.scoreActionText, { color: GREEN_DARK }]}>📈 Score History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scoreActionBtn, { backgroundColor: "#fff3e0", borderColor: "#e65100" }]}
            onPress={openAppeal}
            activeOpacity={0.85}
          >
            <Text style={[styles.scoreActionText, { color: "#e65100" }]}>⚖️ Appeal Score</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.h2}>Section Breakdown</Text>
        {home.profile.sections.map((sec) => {
          const pct = sec.totalQuestions
            ? Math.round((sec.responsesCollected / sec.totalQuestions) * 100)
            : 0;
          return (
            <View key={sec.sectionId} style={styles.breakdownRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.breakdownName}>{sec.sectionName}</Text>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
              </View>
              <Text style={styles.breakdownPct}>{pct}%</Text>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  // ─── HISTORY VIEW ───────────────────────────────────────────────
  if (view === "history") {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setView("score")} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.h1}>Score History</Text>
        <Text style={styles.sub}>Every recalculation of your TRUST score</Text>

        {historyLoading ? (
          <ActivityIndicator color={GREEN_MID} style={{ marginTop: 24 }} />
        ) : history.length === 0 ? (
          <Text style={styles.empty}>No score history yet. Answer questions to start building your profile.</Text>
        ) : (
          history.map((h, i) => {
            const c = bandColor(h.band);
            const prev = history[i + 1];
            const delta = prev ? h.score - prev.score : null;
            const deltaColor = delta == null ? "#999" : delta > 0 ? "#2e7d32" : delta < 0 ? "#c62828" : "#999";
            const deltaText = delta == null ? "—" : delta > 0 ? `+${delta}` : `${delta}`;
            return (
              <View key={i} style={[styles.historyCard, { borderLeftColor: c }]}>
                <View style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyScore, { color: c }]}>{h.score} <Text style={styles.historyOf}>/ 1000</Text></Text>
                    <Text style={[styles.historyBand, { color: c }]}>{bandLabel(h.band)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.historyDelta, { color: deltaColor }]}>{deltaText}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(String(h.calculatedAt).replace(" ", "T")).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    );
  }

  // ─── APPEAL VIEW ────────────────────────────────────────────────
  if (view === "appeal") {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setView("score")} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.h1}>Appeal Your Score</Text>
        <Text style={styles.sub}>
          Tell us why you think your score should be reviewed. Our team will respond within 5 working days.
        </Text>

        <View style={styles.qCard}>
          <Text style={styles.qText}>Reason for appeal *</Text>
          <TextInput
            style={[styles.numericInput, { height: 100, textAlignVertical: "top" }]}
            placeholder="Minimum 10 characters — e.g., 'My new bank statement shows higher savings...'"
            multiline
            value={appealReason}
            onChangeText={setAppealReason}
          />
          <Text style={styles.appealCounter}>{appealReason.trim().length} / 2000 chars</Text>
        </View>

        <View style={styles.qCard}>
          <Text style={styles.qText}>Additional context (optional)</Text>
          <TextInput
            style={[styles.numericInput, { height: 80, textAlignVertical: "top" }]}
            placeholder="Anything else we should know — supporting documents, recent changes..."
            multiline
            value={appealContext}
            onChangeText={setAppealContext}
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, appealSubmitting && { opacity: 0.6 }]}
          disabled={appealSubmitting || appealReason.trim().length < 10}
          onPress={submitAppeal}
        >
          <Text style={styles.btnText}>{appealSubmitting ? "Submitting..." : "Submit Appeal"}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── SECTIONS VIEW (default) ────────────────────────────────────
  const s = home.score;
  const color = bandColor(s.band);
  const nudge = home.profile.nextNudge;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.h1}>TRUST Profile</Text>
      <Text style={styles.sub}>Build your credit profile, raise your score</Text>

      <TouchableOpacity
        style={styles.activitiesLink}
        onPress={() => router.push("/trust-activities" as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.activitiesEmoji}>💼</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.activitiesLabel}>Your Livelihood Mix</Text>
          <Text style={styles.activitiesSub}>
            {home.activities?.active?.length
              ? `${home.activities.active.join(" • ")}`
              : "Tap to set up your income sources"}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.activitiesLink}
        onPress={() => router.push("/trust-liabilities" as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.activitiesEmoji}>🏦</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.activitiesLabel}>Your Loans</Text>
          <Text style={styles.activitiesSub}>
            Track every loan + repayment to unlock cheaper credit
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.activitiesLink,
          home.expenses?.nudge && { borderColor: "#f9a825", backgroundColor: "#fff8e1" },
        ]}
        onPress={() => router.push("/trust-expenses" as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.activitiesEmoji}>🧾</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.activitiesLabel}>Monthly Expenses</Text>
          <Text style={styles.activitiesSub}>
            {home.expenses?.nudge
              ? "⚠ Pending — log this month to keep score current"
              : home.expenses && home.expenses.monthsLogged > 0
                ? `3-mo avg ₹${Math.round(home.expenses.avgLast3MonthsInr).toLocaleString("en-IN")} • ${home.expenses.monthsLogged} months logged`
                : "Tap to log this month's spending"}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      {/* L5 Leverage card — the "how much can I borrow?" CTA */}
      <TouchableOpacity
        style={styles.leverageCard}
        onPress={() => router.push("/trust-leverage" as any)}
        activeOpacity={0.85}
      >
        <View style={styles.leverageHead}>
          <Text style={styles.leverageEmoji}>💰</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.leverageLabel}>How much can I borrow?</Text>
            <Text style={styles.leverageSub}>
              {home.leverage && home.leverage.additionalEmiCapacityInr > 0
                ? `≈ ₹${home.leverage.additionalEmiCapacityInr.toLocaleString("en-IN")}/mo new EMI capacity`
                : home.leverage?.missingInputs?.length
                  ? `Add ${home.leverage.missingInputs.join(" + ")} to unlock`
                  : "Tap to compute your borrowing headroom"}
            </Text>
          </View>
          <Text style={styles.arrowWhite}>›</Text>
        </View>
      </TouchableOpacity>

      {/* Score header card */}
      <TouchableOpacity
        style={[styles.scoreHeader, { borderColor: color }]}
        onPress={() => setView("score")}
        activeOpacity={0.85}
      >
        <View style={styles.scoreHeaderLeft}>
          <Text style={[styles.scoreNum, { color }]}>{s.total}</Text>
          <Text style={styles.scoreOf}>/ 1000</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bandText, { color }]}>{bandLabel(s.band)}</Text>
          <Text style={styles.completionText}>
            Profile {home.profile.completionPercent}% complete
          </Text>
          <View style={styles.bar}>
            <View
              style={[styles.barFill, { width: `${home.profile.completionPercent}%` }]}
            />
          </View>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      {/* Next nudge */}
      {nudge && (
        <TouchableOpacity
          style={styles.nudgeCard}
          onPress={() => openSection(nudge)}
          activeOpacity={0.85}
        >
          <Text style={styles.nudgeLabel}>👉 NEXT STEP</Text>
          <Text style={styles.nudgeName}>{nudge.sectionName}</Text>
          <Text style={styles.nudgeSub}>
            {nudge.responsesCollected} / {nudge.totalQuestions} questions answered
          </Text>
        </TouchableOpacity>
      )}

      {/* Sections list */}
      <Text style={styles.h2}>All Sections</Text>
      {home.profile.sections.map((sec) => {
        const pct = sec.totalQuestions
          ? Math.round((sec.responsesCollected / sec.totalQuestions) * 100)
          : 0;
        const statusEmoji =
          sec.status === "completed" ? "✅" : sec.status === "in_progress" ? "🟡" : "⚪️";
        return (
          <TouchableOpacity
            key={sec.sectionId}
            style={styles.sectionCard}
            onPress={() => openSection(sec)}
            activeOpacity={0.85}
          >
            <View style={styles.sectionRow}>
              <Text style={styles.sectionEmoji}>{statusEmoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionName}>{sec.sectionName}</Text>
                <Text style={styles.sectionMeta}>
                  {sec.responsesCollected} / {sec.totalQuestions} answered
                </Text>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
              </View>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  errorText: { color: "#c62828", marginBottom: 12 },

  back: { marginBottom: 12 },
  backText: { color: GREEN_MID, fontWeight: "700", fontSize: 15 },

  h1: { fontSize: 22, fontWeight: "900", color: GREEN_DARK, marginBottom: 4 },
  h2: { fontSize: 15, fontWeight: "700", color: "#333", marginTop: 18, marginBottom: 10 },
  sub: { fontSize: 13, color: "#666", marginBottom: 14 },
  empty: { color: "#999", marginTop: 20, fontStyle: "italic", textAlign: "center" },

  scoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    gap: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreHeaderLeft: { alignItems: "center", justifyContent: "center", paddingRight: 8 },
  scoreNum: { fontSize: 36, fontWeight: "900", lineHeight: 40 },
  scoreOf: { fontSize: 11, color: "#999" },
  bandText: { fontSize: 18, fontWeight: "800" },
  completionText: { fontSize: 12, color: "#666", marginTop: 4, marginBottom: 6 },
  arrow: { fontSize: 26, color: "#999" },
  arrowWhite: { fontSize: 26, color: "#fff" },

  leverageCard: {
    backgroundColor: GREEN_DARK,
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    marginBottom: 4,
  },
  leverageHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  leverageEmoji: { fontSize: 28 },
  leverageLabel: { color: "#fff", fontSize: 15, fontWeight: "900" },
  leverageSub: { color: "#c8e6c9", fontSize: 12, fontWeight: "600", marginTop: 2 },

  bar: { height: 8, backgroundColor: "#e0e0e0", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: GREEN_MID, borderRadius: 4 },

  nudgeCard: {
    backgroundColor: GREEN_DARK,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  nudgeLabel: { color: "#a5d6a7", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  nudgeName: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: 6 },
  nudgeSub: { color: "#c8e6c9", fontSize: 12, marginTop: 4 },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionEmoji: { fontSize: 22 },
  sectionName: { fontSize: 14, fontWeight: "700", color: "#333" },
  sectionMeta: { fontSize: 11, color: "#888", marginTop: 2, marginBottom: 6 },

  qCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  qText: { fontSize: 14, fontWeight: "700", color: "#333", marginBottom: 10 },
  numericInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fafafa",
  },
  choice: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#fafafa",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#eee",
  },
  choiceSelected: { backgroundColor: GREEN_PALE, borderColor: GREEN_MID },
  choiceText: { fontSize: 14, color: "#444" },
  choiceTextSelected: { color: GREEN_DARK, fontWeight: "700" },

  btn: {
    backgroundColor: GREEN_MID,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  bigScoreCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 3,
    padding: 24,
    alignItems: "center",
    marginBottom: 18,
  },
  bigScoreNum: { fontSize: 64, fontWeight: "900", lineHeight: 70 },
  bigScoreOf: { fontSize: 14, color: "#999" },
  bigScoreBand: { fontSize: 22, fontWeight: "800", marginTop: 8 },
  bigScoreRange: { fontSize: 12, color: "#888", marginTop: 4 },

  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  breakdownName: { fontSize: 13, fontWeight: "700", color: "#333", marginBottom: 6 },
  breakdownPct: { fontSize: 13, fontWeight: "800", color: GREEN_MID, minWidth: 40, textAlign: "right" },

  activitiesLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  activitiesEmoji: { fontSize: 22 },
  activitiesLabel: { fontSize: 14, fontWeight: "700", color: "#333" },
  activitiesSub: { fontSize: 11, color: "#888", marginTop: 2 },

  // History + Appeal
  scoreActionsRow: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 8 },
  scoreActionBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1.5 },
  scoreActionText: { fontSize: 13, fontWeight: "800" },
  historyCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
    borderLeftWidth: 4, borderWidth: 1, borderColor: "#eee",
  },
  historyRow: { flexDirection: "row", alignItems: "center" },
  historyScore: { fontSize: 22, fontWeight: "900" },
  historyOf: { fontSize: 11, color: "#888", fontWeight: "600" },
  historyBand: { fontSize: 12, fontWeight: "800", marginTop: 2 },
  historyDelta: { fontSize: 16, fontWeight: "900" },
  historyDate: { fontSize: 11, color: "#888", marginTop: 2 },
  appealCounter: { fontSize: 10, color: "#999", textAlign: "right", marginTop: 4 },
});
