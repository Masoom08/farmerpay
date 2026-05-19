/**
 * Persona-based Home — THE new nav center.
 *
 * Replaces the old 8-section module-grid home. Reads from:
 *   - GET /farmer/activity-subscriptions  (active activities + setupComplete)
 *   - GET /farmer/my-activities-v2        (persona classification + income)
 *   - GET /sage/feed/me                   (next EMI + advisory count)
 *   - GET /pulse/prices/latest            (mandi price tile)
 *
 * Layout:
 *   Welcome strip (persona ribbon)
 *   3 data tiles (next EMI / today's advice / mandi price) — answer-on-glance
 *   "More options" + 3 question chips (need a loan / need insurance / call SATHI)
 *   "My activities" header + activity cards (unset / locked / editing state)
 *   + Add another activity dashed button
 *
 * No sticky bottom bar — every CTA lives in the scroll area as a tile or
 * a chip. Loan + insurance used to appear both as sticky buttons AND inside
 * the scroll content, which created visible duplicates on the same screen.
 *
 * Edit flow: tapping ✏️ on a LOCKED card routes to the matching setup
 * screen in ?mode=edit. The setup screen POSTs the new aggregate and
 * returns to the home, which refreshes on focus.
 */

import React, { useCallback, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { apiGet, apiGetMe, formatRupees, apiLogout } from "../../lib/api";
import { getReadiness, getReadinessFlags, mapState, type ReadinessData } from "../../lib/readiness";
import LoanReadinessBadge from "../../components/readiness/LoanReadinessBadge";

// ─── Types ───────────────────────────────────────────────────────

interface Subscription {
  subscriptionId: string;
  activityCode: string;
  streamType: string;
  status: "ACTIVE" | "PAUSED" | "DROPPED";
  setupComplete?: boolean;
  health?: "GREEN" | "AMBER" | "RED" | "UNKNOWN" | null;
  priorityRank?: number;
  notes?: string | null;
}

interface PersonaResponse {
  hasSubscriptions: boolean;
  persona: string;
  activities: string[];
  streams: Array<{
    type: string;
    activityCode: string;
    annualIncome: number;
    tier?: string;
    health?: string;
  }>;
  totalAnnualIncome: number;
  familySize: number | null;
}

// ─── Activity metadata ───────────────────────────────────────────

const ACTIVITY_META: Record<string, {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
  editRoute: string;
  detailRoute: string;
  setupRoute: string;
}> = {
  CROP: {
    emoji: "🌾",
    label: "Crop farming",
    color: "#1b5e20",
    bgColor: "#e8f5e9",
    editRoute: "/activity-crop",
    detailRoute: "/activity-crop",
    setupRoute: "/roots-crop-card",
  },
  HORTI: {
    emoji: "🥭",
    label: "Horticulture",
    color: "#bf360c",
    bgColor: "#fbe9e7",
    editRoute: "/activity-horti",
    detailRoute: "/activity-horti",
    setupRoute: "/roots-crop-card?mode=horti",
  },
  DAIRY: {
    emoji: "🐄",
    label: "Dairy",
    color: "#4e342e",
    bgColor: "#efebe9",
    editRoute: "/setup-dairy?mode=edit",
    detailRoute: "/activity-dairy",
    setupRoute: "/setup-dairy",
  },
  FISHERY: {
    emoji: "🐟",
    label: "Fisheries",
    color: "#0d47a1",
    bgColor: "#e3f2fd",
    editRoute: "/setup-fishery?mode=edit",
    detailRoute: "/activity-fishery",
    setupRoute: "/setup-fishery",
  },
  POULTRY: {
    emoji: "🐔",
    label: "Poultry",
    color: "#e65100",
    bgColor: "#fff3e0",
    editRoute: "/setup-poultry?mode=edit",
    detailRoute: "/activity-poultry",
    setupRoute: "/setup-poultry",
  },
  GOATERY: {
    emoji: "🐐",
    label: "Goatery",
    color: "#6a1b9a",
    bgColor: "#f3e5f5",
    editRoute: "/setup-goatery?mode=edit",
    detailRoute: "/activity-goatery",
    setupRoute: "/setup-goatery",
  },
  LABOUR_WAGE: {
    emoji: "👷",
    label: "Daily wage",
    color: "#00695c",
    bgColor: "#e0f2f1",
    editRoute: "/setup-confirm?code=LABOUR_WAGE&mode=edit",
    detailRoute: "/setup-confirm?code=LABOUR_WAGE&mode=edit",
    setupRoute: "/setup-confirm?code=LABOUR_WAGE",
  },
  SHOP_BUSINESS: {
    emoji: "🏪",
    label: "Shop / business",
    color: "#4527a0",
    bgColor: "#ede7f6",
    editRoute: "/setup-confirm?code=SHOP_BUSINESS&mode=edit",
    detailRoute: "/setup-confirm?code=SHOP_BUSINESS&mode=edit",
    setupRoute: "/setup-confirm?code=SHOP_BUSINESS",
  },
  REMITTANCE: {
    emoji: "💸",
    label: "Remittance",
    color: "#00838f",
    bgColor: "#e0f7fa",
    editRoute: "/setup-confirm?code=REMITTANCE&mode=edit",
    detailRoute: "/setup-confirm?code=REMITTANCE&mode=edit",
    setupRoute: "/setup-confirm?code=REMITTANCE",
  },
  OTHER: {
    emoji: "💼",
    label: "Other income",
    color: "#455a64",
    bgColor: "#eceff1",
    editRoute: "/setup-confirm?code=OTHER&mode=edit",
    detailRoute: "/setup-confirm?code=OTHER&mode=edit",
    setupRoute: "/setup-confirm?code=OTHER",
  },
};

const PERSONA_LABELS: Record<string, string> = {
  single_income: "Single-activity farmer",
  double_income: "Two-activity farmer",
  triple_income: "Three-activity farmer",
  quad_income: "Multi-activity farmer",
};

const HEALTH_DOT: Record<string, string> = {
  GREEN: "🟢",
  AMBER: "🟡",
  RED: "🔴",
  UNKNOWN: "⚪",
};

// ─── Helpers ──────────────────────────────────────────────────────

/** Format an ISO date string as "15 Apr" (Indian locale, short month). */
const fmtShortDate = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

// All quick actions are now rendered as tile rows — no chip list needed.

// ─── Component ────────────────────────────────────────────────────

export default function PersonaHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [persona, setPersona] = useState<PersonaResponse | null>(null);
  const [nextEmi, setNextEmi] = useState<{ dueDate: string; dueAmount: number } | null>(null);
  // New for the hybrid home: SAGE advice tile needs the unacknowledged
  // advisory count and the highest urgency level so it can say "2 new"
  // in green, or "1 urgent" in red. Reuses the same /sage/feed/me fetch
  // below — no extra API call.
  const [advisoryCount, setAdvisoryCount] = useState<number>(0);
  const [maxUrgency, setMaxUrgency] = useState<"critical" | "high" | "medium" | "low" | null>(null);
  // Mandi price tile — live from /pulse/prices/latest. Falls back to
  // "Check prices" intent tile when no data is seeded.
  const [mandiPrice, setMandiPrice] = useState<{ price: number; commodity: string; unit: string } | null>(null);
  // Borrowing sources tile
  const [borrowingSummary, setBorrowingSummary] = useState<{
    formal: { count: number; totalOutstanding: number };
    informal: { count: number; totalOutstanding: number };
    total: { count: number; totalOutstanding: number };
  } | null>(null);

  // PULSE Phase 2 — nudges banner. Reads /pulse/nudges/me on focus
  // and renders the highest-severity nudge as an amber banner just
  // below the welcome strip. The backend already sorts by severity
  // so we only ever render nudges[0].
  const [topNudge, setTopNudge] = useState<{
    id: string;
    type: string;
    severity: string;
    title: string;
    body: string;
    ctaLabel: string;
    ctaRoute: string;
  } | null>(null);

  // Loan readiness badge state — fetched from /readiness/:uuid
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [readinessEnabled, setReadinessEnabled] = useState(false);

  const load = useCallback(async () => {
    try {
      const [userRes, subsRes, personaRes, emiRes, mandiRes, nudgesRes, borrowingRes, readinessRes] = await Promise.all([
        apiGetMe().catch(() => null),
        apiGet("/farmer/activity-subscriptions").catch(() => null),
        apiGet("/farmer/my-activities-v2").catch(() => null),
        apiGet("/sage/feed/me").catch(() => null),
        // Latest wheat mandi price — tolerates empty/error gracefully.
        // Wired to a fixed COMM-WHEAT + mandi 1 just like the existing
        // market.tsx screen; a future phase can personalize this to the
        // farmer's own crops + nearest mandi.
        apiGet("/pulse/prices/latest?commodityId=COMM-WHEAT-UUID-001&mandiId=1&days=1").catch(() => null),
        // PULSE Phase 2 — nudges for the amber banner below the
        // welcome strip. Backend returns sorted by severity; we only
        // ever render nudges[0].
        apiGet("/pulse/nudges/me").catch(() => null),
        apiGet("/farmer/borrowing-summary").catch(() => null),
        // Loan readiness — check flag first, skip fetch if disabled
        getReadinessFlags().then(f => f.farmerBadge ? getReadiness() : null).catch(() => null),
      ]);

      if (userRes) setUser(userRes);
      const rawItems: Subscription[] = subsRes?.data?.items || [];
      setSubs(rawItems.filter((s) => s.status === "ACTIVE"));
      if (personaRes?.data) setPersona(personaRes.data);
      if (emiRes?.data?.nextEmi) setNextEmi(emiRes.data.nextEmi);

      // Derive the advice tile state from the same SAGE feed payload.
      // advisories is an array of { urgency, acknowledged, ... }; we
      // count only the unacknowledged ones and find the highest urgency.
      const advisories: Array<{ urgency?: string; acknowledged?: boolean }> =
        emiRes?.data?.advisories || [];
      const unacked = advisories.filter((a) => !a.acknowledged);
      setAdvisoryCount(unacked.length);
      const urgencyRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      let highest: typeof maxUrgency = null;
      let highestRank = 0;
      for (const a of unacked) {
        const rank = urgencyRank[a.urgency || ""] || 0;
        if (rank > highestRank) {
          highestRank = rank;
          highest = (a.urgency as typeof highest) || null;
        }
      }
      setMaxUrgency(highest);

      // Mandi price — /pulse/prices/latest returns an array, newest first.
      // We take the top row and display its modal_price (₹/qtl). If the
      // endpoint returned empty, mandiPrice stays null and the tile
      // degrades to its "Check prices" intent-CTA fallback.
      const priceRows = Array.isArray(mandiRes?.data) ? mandiRes.data : [];
      if (priceRows.length > 0) {
        const latest = priceRows[0];
        const price = Number(latest.modal_price || latest.modalPrice || latest.price || 0);
        if (price > 0) {
          setMandiPrice({ price, commodity: "Wheat", unit: "qtl" });
        }
      }

      // PULSE Phase 2 — top nudge. Backend returns sorted array; we
      // render nudges[0] only (avoids banner overload). Banner is
      // dismissed for 24h if the farmer taps X (stored in AsyncStorage
      // in a future enhancement; for v1 dismissal lives in component
      // state only).
      const nudgesList = Array.isArray(nudgesRes?.data) ? nudgesRes.data : [];
      setTopNudge(nudgesList.length > 0 ? nudgesList[0] : null);

      // Borrowing sources summary tile
      if (borrowingRes?.data?.summary) setBorrowingSummary(borrowingRes.data.summary);

      // Loan readiness badge — only show if flag is on and data came back
      if (readinessRes) {
        setReadiness(readinessRes);
        setReadinessEnabled(true);
      }
    } catch {
      /* tolerate partial failures — cards render with defaults */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const onLogout = async () => {
    await apiLogout();
    router.replace("/login");
  };

  // ─── Derived ──────────────────────────────────────────────────

  // Note: monthlyIncome is no longer displayed (the old money pill
  // strip was replaced by the hybrid data tiles). Kept the derivation
  // commented out here for future use on the Money tab if needed.
  const personaLabel = persona ? PERSONA_LABELS[persona.persona] || "Farmer" : "Farmer";
  const livelihoodCount = subs.length;
  const farmerName = user?.name || user?.farmer_name || "Farmer";

  // Match streams to subscriptions for income amounts
  const streamByCode: Record<string, any> = {};
  if (persona?.streams) {
    for (const s of persona.streams) streamByCode[s.activityCode] = s;
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Welcome */}
        <View style={styles.welcome}>
          <Text style={styles.greeting}>🙏 Namaste, {farmerName}</Text>
          <Text style={styles.personaRibbon}>
            {personaLabel} · {livelihoodCount} livelihood{livelihoodCount === 1 ? "" : "s"}
          </Text>
        </View>

        {/* PULSE Phase 2 — nudge banner. Renders the highest-severity
            nudge from /pulse/nudges/me (backend sorts; we take [0]).
            Amber palette signals "you should do something" without
            reading as an error. Tap = route to the nudge's CTA. */}
        {topNudge && (
          <TouchableOpacity
            style={[
              styles.nudgeBanner,
              topNudge.severity === "high" && styles.nudgeBannerHigh,
            ]}
            onPress={() => router.push(topNudge.ctaRoute as any)}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.nudgeBannerTitle}>{topNudge.title}</Text>
              <Text style={styles.nudgeBannerBody}>{topNudge.body}</Text>
              <Text style={styles.nudgeBannerCta}>{topNudge.ctaLabel} →</Text>
            </View>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                setTopNudge(null);
              }}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              style={styles.nudgeDismiss}
            >
              <Text style={styles.nudgeDismissText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* ─── Data tiles (hybrid home: 3 high-frequency answers) ─── */}
        {/* Replaces the old 3-pill money strip. Each tile is a glanceable
            answer-at-a-glance: next EMI with ₹ + date, unacknowledged
            advisory count with urgency-aware color, loan intent CTA.    */}
        <View style={styles.tileRow}>
          {/* Tile 1 — Next EMI */}
          {/* Tinted background (very pale amber) signals "stat to read",
              not "button to tap". Per Hurff thumb-zone + Apple Wallet
              transaction-card precedent. Left border still carries the
              accent color; background is a subtle 5% tint of that hue.  */}
          <TouchableOpacity
            style={[styles.tile, { borderLeftColor: "#7c5800", backgroundColor: "#fff8e1" }]}
            onPress={() => router.push("/repayments" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.tileEmoji}>💸</Text>
            {nextEmi ? (
              <>
                <Text style={[styles.tileValue, { color: "#7c5800" }]} numberOfLines={1}>
                  {formatRupees(nextEmi.dueAmount)}
                </Text>
                <Text style={styles.tileCaption} numberOfLines={1}>
                  {fmtShortDate(nextEmi.dueDate)}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.tileValue, { color: "#888", fontSize: 14 }]} numberOfLines={1}>
                  No EMI
                </Text>
                <Text style={styles.tileCaption}>due now</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Tile 2 — Today's advice */}
          {(() => {
            const isUrgent = maxUrgency === "critical" || maxUrgency === "high";
            const accent = advisoryCount === 0 ? "#2e7d32" : isUrgent ? "#c62828" : "#2e7d32";
            return (
              <TouchableOpacity
                style={[styles.tile, { borderLeftColor: accent, backgroundColor: "#f1f8e9" }]}
                onPress={() => router.push("/sage" as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.tileEmoji}>📖</Text>
                {advisoryCount === 0 ? (
                  <>
                    <Text style={[styles.tileValue, { color: "#2e7d32", fontSize: 14 }]} numberOfLines={1}>
                      All clear
                    </Text>
                    <Text style={styles.tileCaption}>no advice</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.tileValue, { color: accent }]} numberOfLines={1}>
                      {advisoryCount}{" "}
                      <Text style={{ fontSize: 12, fontWeight: "600" }}>
                        {isUrgent ? "urgent" : "new"}
                      </Text>
                    </Text>
                    <Text style={styles.tileCaption} numberOfLines={1}>
                      today's advice
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })()}

          {/* Tile 3 — Market & Sell (unified: prices + cost analysis + sell-or-store) */}
          <TouchableOpacity
            style={[styles.tile, { borderLeftColor: "#1565c0", backgroundColor: "#e3f2fd" }]}
            onPress={() => router.push("/sell-or-store" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.tileEmoji}>💰</Text>
            {mandiPrice ? (
              <>
                <Text style={[styles.tileValue, { color: "#1565c0" }]} numberOfLines={1}>
                  {formatRupees(mandiPrice.price)}
                </Text>
                <Text style={styles.tileCaption} numberOfLines={1}>
                  {mandiPrice.commodity} / {mandiPrice.unit}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.tileValue, { color: "#1565c0", fontSize: 14 }]} numberOfLines={1}>
                  Market & Sell
                </Text>
                <Text style={styles.tileCaption}>prices & costs</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── Loan + Insurance tiles (3-tile row) ─── */}
        <View style={styles.tileRow}>
          <TouchableOpacity
            style={[styles.tile, { borderLeftColor: "#2e7d32", backgroundColor: "#e8f5e9" }]}
            onPress={() => router.push("/loan-journey" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.tileEmoji}>🏦</Text>
            <Text style={[styles.tileValue, { color: "#2e7d32", fontSize: 14 }]}>Need a loan?</Text>
            <Text style={styles.tileCaption}>crop, dairy, gold</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, { borderLeftColor: "#e65100", backgroundColor: "#fff3e0" }]}
            onPress={() => router.push("/postharvest-apply" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.tileEmoji}>🌾</Text>
            <Text style={[styles.tileValue, { color: "#e65100", fontSize: 14 }]}>Harvest loan?</Text>
            <Text style={styles.tileCaption}>post-harvest</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, { borderLeftColor: "#1565c0", backgroundColor: "#e3f2fd" }]}
            onPress={() => router.push("/insurance" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.tileEmoji}>🛡️</Text>
            <Text style={[styles.tileValue, { color: "#1565c0", fontSize: 14 }]}>Insurance</Text>
            <Text style={styles.tileCaption}>crop protection</Text>
          </TouchableOpacity>
        </View>

        {/* ─── DRISHTI scenario tile ─── */}
        <TouchableOpacity
          style={[styles.questionChip, { borderColor: "#ff6f00", borderWidth: 1.5, backgroundColor: "#fff8e1" }]}
          onPress={() => router.push("/drishti-home" as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.chipEmoji}>🔮</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.chipLabel, { color: "#e65100" }]}>DRISHTI — What-if Scenarios</Text>
            <Text style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Loan analysis, climate stress, insurance, market timing</Text>
          </View>
          <Text style={styles.chipArrow}>›</Text>
        </TouchableOpacity>

        {/* ─── Account Aggregator tile ─── */}
        <TouchableOpacity
          style={[styles.questionChip, { borderColor: "#0277bd", borderWidth: 1.5, backgroundColor: "#e1f5fe" }]}
          onPress={() => router.push("/aa-consent" as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.chipEmoji}>🏦</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.chipLabel, { color: "#01579b" }]}>Account Aggregator</Text>
            <Text style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Connect bank account for financial health score</Text>
          </View>
          <Text style={styles.chipArrow}>›</Text>
        </TouchableOpacity>

        {/* ─── Loan Readiness badge (behind feature flag) ─── */}
        {readinessEnabled && (
          <LoanReadinessBadge
            state={readiness ? mapState(readiness.state) : "needsData"}
            onPress={() => router.push("/readiness-why" as any)}
            style={{ marginBottom: 8 }}
          />
        )}

        {/* ─── Farm Health CTA ─── */}
        <TouchableOpacity
          style={{
            flexDirection: "row", alignItems: "center", gap: 12,
            backgroundColor: "#e8f5e9", borderRadius: 14, padding: 14, marginBottom: 12,
            borderLeftWidth: 4, borderLeftColor: "#2e7d32",
          }}
          onPress={() => router.push("/(tabs)/farm-health" as any)}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 28 }}>🌾</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#1b5e20" }}>Am I on Track? / क्या मैं सही राह पर हूँ?</Text>
            <Text style={{ fontSize: 11, color: "#555", marginTop: 2 }}>See your farm health score and pending actions</Text>
          </View>
          <Text style={{ color: "#2e7d32", fontSize: 18, fontWeight: "700" }}>→</Text>
        </TouchableOpacity>

        {/* ─── Activity tiles — 2-column grid right below tile rows ─── */}
        <Text style={styles.sectionHeader}>My activities</Text>
        {subs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌾</Text>
            <Text style={styles.emptyTitle}>No activities yet</Text>
            <Text style={styles.emptySub}>Add your first livelihood to get started.</Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => router.push("/onboarding-activities" as any)}
            >
              <Text style={styles.emptyCtaText}>+ Add activity</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activityGrid}>
            {subs.map((sub) => {
              const meta = ACTIVITY_META[sub.activityCode] || ACTIVITY_META.OTHER;
              const isUnset = !sub.setupComplete;
              const stream = streamByCode[sub.activityCode];
              const income = stream?.annualIncome || 0;
              const healthDot = HEALTH_DOT[sub.health || "UNKNOWN"];

              return (
                <TouchableOpacity
                  key={sub.subscriptionId}
                  style={[styles.activityTile, { backgroundColor: meta.bgColor, borderColor: meta.color }]}
                  onPress={() =>
                    router.push((isUnset ? meta.setupRoute : meta.detailRoute) as any)
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.activityTileEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.activityTileName, { color: meta.color }]} numberOfLines={1}>
                    {meta.label}
                  </Text>
                  {isUnset ? (
                    <Text style={styles.activityTileUnset}>⚠️ Setup needed</Text>
                  ) : (
                    <>
                      <Text style={styles.activityTileStatus}>{healthDot} Active</Text>
                      {income > 0 && (
                        <Text style={[styles.activityTileIncome, { color: meta.color }]}>
                          {formatRupees(income)}/yr
                        </Text>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Add activity tile */}
            <TouchableOpacity
              style={styles.addActivityTile}
              onPress={() => router.push("/onboarding-activities" as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.addActivityTileIcon}>+</Text>
              <Text style={styles.addActivityTileText}>Add activity</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Borrowing sources card ─── */}
        <TouchableOpacity
          style={[styles.card, { borderLeftColor: "#7c5800", marginBottom: 14 }]}
          onPress={() => router.push("/borrowing-sources" as any)}
          activeOpacity={0.85}
        >
          <View style={styles.cardRow}>
            <Text style={styles.cardEmoji}>💰</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: "#5d4037" }]}>My Borrowing Sources</Text>
              {borrowingSummary && borrowingSummary.total.count > 0 ? (
                <Text style={styles.cardLockedSub}>
                  {formatRupees(borrowingSummary.total.totalOutstanding)} total ·{" "}
                  {borrowingSummary.formal.count} formal · {borrowingSummary.informal.count} informal
                </Text>
              ) : (
                <Text style={styles.cardUnsetSub}>Add your bank loans, PACS, informal debt</Text>
              )}
            </View>
            <Text style={styles.cardArrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* ─── SATHI + Krishi Bazaar tiles (2-tile row) ─── */}
        <View style={styles.tileRow}>
          <TouchableOpacity
            style={[styles.tile, { borderLeftColor: "#00695c", backgroundColor: "#e0f2f1" }]}
            onPress={() => router.push("/choice" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.tileEmoji}>🤝</Text>
            <Text style={[styles.tileValue, { color: "#00695c", fontSize: 14 }]}>My SATHI</Text>
            <Text style={styles.tileCaption}>agent & help</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, { borderLeftColor: "#6a1b9a", backgroundColor: "#f3e5f5" }]}
            onPress={() => router.push("/krishi-bazaar" as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.tileEmoji}>🏪</Text>
            <Text style={[styles.tileValue, { color: "#6a1b9a", fontSize: 14 }]}>Krishi Bazaar</Text>
            <Text style={styles.tileCaption}>vendors & inputs</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
      {/* Sticky bottom bar was removed — loan + insurance now live as
          chips inside the scrolling content, so there's no duplication
          and the tile row can own the top of the screen. */}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },

  welcome: { marginBottom: 14 },
  greeting: { fontSize: 22, fontWeight: "800", color: "#1b5e20" },
  personaRibbon: { fontSize: 13, color: "#666", marginTop: 4 },

  // ─── Hybrid home: data tiles + question chips ──────────────────
  // `tileRow` holds the 3 top-of-screen tiles (next EMI / advice /
  // loan intent). Each `tile` is a square-ish card with an emoji, a
  // big value, and a caption — answer-on-glance UX for Indian
  // smallholder farmers. Replaces the old `moneyStrip` + `moneyPill`
  // styles that used to live here.
  tileRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  tile: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 4,
    minHeight: 108,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tileEmoji: { fontSize: 22, marginBottom: 4 },
  tileValue: { fontSize: 18, fontWeight: "800", color: "#222", marginTop: 2 },
  tileCaption: { fontSize: 10, color: "#888", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.3 },

  // Question chips: stacked full-width rows below the tiles. Intent
  // shortcuts for long-tail actions (insurance, new crop, SATHI call).
  questionChip: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    // paddingVertical bumped 14 → 18 so each chip row is ~56 dp tall,
    // the rural touch-target target from Chaudry CSCW (Material's 48 dp
    // is calibrated for urban users — rural / 45+ farmers need 56–64).
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  chipEmoji: { fontSize: 18 },
  chipLabel: { fontSize: 14, fontWeight: "700", color: "#333", flex: 1 },
  chipArrow: { fontSize: 16, color: "#999" },

  // Section header bumped from 13/"#555" → 14/"#333" so "Quick actions"
  // and "My activities" read as peer sections, not one primary + one sub.
  sectionHeader: { fontSize: 14, fontWeight: "700", color: "#333", marginBottom: 8, marginLeft: 4, marginTop: 8 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardEmoji: { fontSize: 28 },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  cardUnsetSub: { fontSize: 12, color: "#e65100", marginTop: 2, fontWeight: "600" },
  cardLockedSub: { fontSize: 12, color: "#666", marginTop: 2 },
  editBtn: { padding: 6 },
  editBtnText: { fontSize: 18 },
  cardArrow: { fontSize: 16, color: "#999", marginLeft: 4 },

  emptyCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 24, alignItems: "center",
  },
  emptyEmoji: { fontSize: 36, marginBottom: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#333", marginBottom: 4 },
  emptySub: { fontSize: 13, color: "#666", textAlign: "center", marginBottom: 14 },
  emptyCta: { backgroundColor: "#2e7d32", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  emptyCtaText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Activity tiles — 2-column grid
  activityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  activityTile: {
    width: "47%",
    flexGrow: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    minHeight: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  activityTileEmoji: { fontSize: 32, marginBottom: 6 },
  activityTileName: { fontSize: 14, fontWeight: "800", marginBottom: 4 },
  activityTileStatus: { fontSize: 11, color: "#555", marginTop: 2 },
  activityTileUnset: { fontSize: 11, color: "#e65100", fontWeight: "600", marginTop: 2 },
  activityTileIncome: { fontSize: 13, fontWeight: "800", marginTop: 4 },

  addActivityTile: {
    width: "47%",
    flexGrow: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
    minHeight: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  addActivityTileIcon: { fontSize: 28, color: "#999", marginBottom: 4 },
  addActivityTileText: { fontSize: 12, fontWeight: "700", color: "#888" },

  // stickyBottom / stickyBtn / stickyBtnText styles were removed when
  // the sticky bottom bar was deleted — loan + insurance are now chips
  // inside the scroll area instead of permanent chrome at the bottom.

  // PULSE Phase 2 — nudge banner styles. Amber (default) for medium
  // severity and red-tinted for high severity. Dismiss button is a
  // small X in the top-right corner.
  nudgeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fff8e1",
    borderLeftWidth: 4,
    borderLeftColor: "#7c5800",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  nudgeBannerHigh: {
    backgroundColor: "#fbe9e7",
    borderLeftColor: "#c62828",
  },
  nudgeBannerTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#5d4037",
  },
  nudgeBannerBody: {
    fontSize: 12,
    color: "#5d4037",
    marginTop: 4,
    lineHeight: 17,
  },
  nudgeBannerCta: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1565c0",
    marginTop: 6,
  },
  nudgeDismiss: {
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  nudgeDismissText: {
    fontSize: 12, fontWeight: "900", color: "#555",
  },
});
