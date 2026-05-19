import { useState, useCallback, useEffect, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiGet, apiPost, formatRupees } from "../../lib/api";
import {
  ACTIVITY_SUBTYPE_CATALOG,
  SubtypeActivityCode,
  getSubtypeLabel,
} from "../../lib/activitySubtypeCatalog";

// Activity codes that have a seeded Package of Practices in the DB.
// Adding a new activity's PoP is as simple as extending this list once the
// seeder has run — the Farm tab picks it up automatically.
const POP_ACTIVITY_CODES: Record<string, string> = {
  crop: "CROP",
  dairy: "DAIRY",
  fisheries: "FISHERY",
  horticulture: "HORTI",
  poultry: "POULTRY",
  goatery: "GOATERY",
};

// ─── Types ──────────────────────────────────────────────────────────

type HealthStatus = "GREEN" | "AMBER" | "RED" | "UNKNOWN";

type IncomeStream = {
  type: string;
  activityCode?: string;
  annualIncome: number;
  stability: string;
  description: string | null;
  tier?: "SMALL" | "MEDIUM" | "LARGE" | null;
  health?: HealthStatus;
  priorityRank?: number;
};

type ActivitiesData = {
  hasSubscriptions?: boolean;
  activities: string[];
  persona: string;
  streams: IncomeStream[];
  totalAnnualIncome: number;
};

const HEALTH_COLOR: Record<HealthStatus, string> = {
  GREEN:   "#2e7d32",
  AMBER:   "#e65100",
  RED:     "#c62828",
  UNKNOWN: "#bdbdbd",
};

type PopStage = {
  id: number;
  stageKey: string;
  stageOrder: number;
  labelEn: string;
  labelHi: string | null;
  icon: string | null;
};

type PopTouchpointStatus = "PENDING" | "CURRENT" | "DONE" | "SKIPPED";

type PopCadence = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "PER_EVENT" | null;

type PopTouchpoint = {
  touchpointNumber: number;
  stageKey: string | null;
  cadence: PopCadence;
  nameEn: string;
  nameHi: string | null;
  descriptionEn: string | null;
  status: PopTouchpointStatus;
  score: number | null;
  taskCompleted: boolean | null;
  timingStatus: string | null;
  inputsStatus: string | null;
};

type OpTier = "SMALL" | "MEDIUM" | "LARGE";
type DairyHerdTier = OpTier;
type DairyAnimalKind = "cow" | "buffalo" | "mixed";
type FisheryWaterType = "sea" | "freshwater";

// Client-side persistence keys for farm-tab lock + picker state.
// Kept in AsyncStorage only — no backend schema needed for the "lock
// & hide unchosen cards" UX. Survives app restarts on the same device.
const LS_LOCKED_ACTIVITIES = "farm.lockedActivities";
const LS_DAIRY_ANIMAL_KIND = "farm.dairyAnimalKind";
const LS_FISHERY_WATER_TYPE = "farm.fisheryWaterType";

type PopProgress = {
  activityCode: string;
  stages: PopStage[];
  touchpoints: PopTouchpoint[];
  complianceScore: number | null;
  currentTouchpoint: PopTouchpoint | null;
  currentStageKey: string | null;
};

// Multi-PoP dashboard card. One PopCard per (activityCode, subtypeCode)
// pair the farmer is actively working on. Rendered as a vertical list of
// compact collapsible cards (single-active accordion) — no more exclusive
// tab bar. Picker cards carry kind='picker' and render the subtype picker
// grid in their body; once the farmer saves selections the picker card
// gets replaced by one real card per selected subtype.
type PopCard = {
  key: string;          // `${activityCode}:${subtypeCode}` or `${code}:__picker__`
  kind: "pop" | "picker";
  activity: string;     // ACTIVITY_TABS key (crop, dairy, ...)
  activityCode: string; // CROP / DAIRY / FISHERY / HORTI / VEG / POULTRY / GOATERY
  subtypeCode: string;
  label: string;        // compact header label (e.g. "Crop · Rice")
  icon: string;
};

const PERSONA_CONFIG: Record<string, { label: string; labelHi: string; color: string; bg: string; icon: string }> = {
  quad_income:   { label: "Quad Income",   labelHi: "\u091A\u0924\u0941\u0930\u094D\u0917\u0941\u0923\u093E \u0906\u092F", color: "#b45309", bg: "#fef3c7", icon: "\uD83C\uDFC6" },
  triple_income: { label: "Triple Income",  labelHi: "\u0924\u094D\u0930\u093F\u0917\u0941\u0923\u093E \u0906\u092F", color: "#7c3aed", bg: "#ede9fe", icon: "\uD83D\uDFE3" },
  double_income: { label: "Double Income",  labelHi: "\u0926\u094B\u0939\u0930\u0940 \u0906\u092F", color: "#1d4ed8", bg: "#dbeafe", icon: "\uD83D\uDD35" },
  single_income: { label: "Single Income",  labelHi: "\u090F\u0915\u0932 \u0906\u092F", color: "#15803d", bg: "#dcfce7", icon: "\uD83D\uDFE2" },
};

const DAIRY_DEMO = {
  herdSize: 4, milchAnimals: 3, todayMilk: "12 L", avgPrice: "\u20B935/L",
  monthlyIncome: "\u20B910,500", healthStatus: "Good", nextVetVisit: "Apr 15",
};

const FISHERY_DEMO = {
  ponds: 1, area: "0.5 ha", species: "Rohu, Catla",
  waterQuality: "Good (pH 7.2)", lastStocking: "Nov 2025",
  nextHarvest: "May 2026", estimatedYield: "200 kg",
};

const HORTI_DEMO = {
  orchards: 1, area: "2 ha", crop: "Mango (Alphonso + Totapuri)",
  trees: 120, currentStage: "Flowering", nextHarvest: "Jun 2026",
  healthStatus: "Moderate (some leaf spot)",
};

// Theme for each activity — used by the picker and card headers. Keeps
// the per-section colour language from the old tab-based design.
const ACTIVITY_THEME: Record<string, { bg: string; border: string; accent: string; chipBg: string; chipFg: string }> = {
  CROP:    { bg: "#e8f5e9", border: "#81c784", accent: "#1b5e20", chipBg: "#c8e6c9", chipFg: "#1b5e20" },
  HORTI:   { bg: "#fff3e0", border: "#ffb74d", accent: "#e65100", chipBg: "#ffe0b2", chipFg: "#e65100" },
  POULTRY: { bg: "#fff8e1", border: "#ffd54f", accent: "#f57f17", chipBg: "#ffecb3", chipFg: "#f57f17" },
  GOATERY: { bg: "#efebe9", border: "#a1887f", accent: "#5d4037", chipBg: "#d7ccc8", chipFg: "#5d4037" },
};

const ACTIVITY_TABS: Record<string, { label: string; labelHi: string; icon: string }> = {
  crop:         { label: "Crop",         labelHi: "\u092B\u0938\u0932",     icon: "\uD83C\uDF3E" },
  dairy:        { label: "Dairy",        labelHi: "\u0921\u0947\u092F\u0930\u0940",   icon: "\uD83D\uDC04" },
  fisheries:    { label: "Fisheries",    labelHi: "\u092E\u0924\u094D\u0938\u094D\u092F",   icon: "\uD83D\uDC1F" },
  horticulture: { label: "Horticulture", labelHi: "\u092C\u093E\u0917\u0935\u093E\u0928\u0940", icon: "\uD83C\uDF4E" },
  poultry:      { label: "Poultry",      labelHi: "\u092E\u0941\u0930\u094D\u0917\u0940\u092A\u093E\u0932\u0928", icon: "\uD83D\uDC14" },
  goatery:      { label: "Goatery",      labelHi: "\u092C\u0915\u0930\u0940\u092A\u093E\u0932\u0928", icon: "\uD83D\uDC10" },
};

const ALL_AGRI = ["crop", "dairy", "fisheries", "horticulture", "poultry", "goatery"];

// ─── Component ──────────────────────────────────────────────────────

export default function FarmScreen() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [activitiesData, setActivitiesData] = useState<ActivitiesData | null>(null);

  // PoP cache keyed by `${activityCode}:${subtypeCode}`. Rice, wheat and
  // sugarcane each hold their own independent progress + compliance score.
  const [popByKey, setPopByKey] = useState<Record<string, PopProgress>>({});

  // Single-active accordion state. Exactly one card body is mounted in the
  // DOM at a time (lazy mount) to keep memory flat on low-RAM devices.
  // null = all collapsed; auto-expands when cards.length === 1.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Tier drives data-entry fatigue reduction for Dairy/Fishery.
  const [dairyHerdTier, setDairyHerdTier] = useState<OpTier | null>(null);
  const [fisheryTier, setFisheryTier] = useState<OpTier | null>(null);
  const [dairyProfileExists, setDairyProfileExists] = useState<boolean | null>(null);
  const [fisheryProfileExists, setFisheryProfileExists] = useState<boolean | null>(null);
  const [savingTier, setSavingTier] = useState(false);

  // Per-farmer subtype selections for CROP / HORTI / POULTRY / GOATERY.
  const [subtypesByActivity, setSubtypesByActivity] = useState<Partial<Record<SubtypeActivityCode, string[]>> | null>(null);

  // Client-only lock state. Activities in this set are treated as
  // "confirmed" — once any lock exists, the cards list filters to only
  // these. Farmer taps "Add new activity" to unlock more.
  const [lockedActivities, setLockedActivities] = useState<Set<string>>(new Set());
  const [locksHydrated, setLocksHydrated] = useState(false);

  // Dairy "animal kind" picker — stored client-side only, no backend.
  const [dairyAnimalKind, setDairyAnimalKind] = useState<DairyAnimalKind | null>(null);
  // Fishery "water type" picker — stored client-side only, no backend.
  const [fisheryWaterType, setFisheryWaterType] = useState<FisheryWaterType | null>(null);

  // "Add new activity" inline sheet toggle.
  const [showAddNew, setShowAddNew] = useState(false);

  // Picker state: which activity's picker grid is currently being edited.
  const [editingSubtypeFor, setEditingSubtypeFor] = useState<SubtypeActivityCode | null>(null);
  const [subtypeDraft, setSubtypeDraft] = useState<string[]>([]);
  const [savingSubtypes, setSavingSubtypes] = useState(false);

  // Horti / Veg / Poultry / Goatery tiers — no profile models yet, default SMALL.
  const [horticultureTier] = useState<OpTier>("SMALL");
  const [vegetableTier] = useState<OpTier>("SMALL");
  const [poultryTier] = useState<OpTier>("SMALL");
  const [goateryTier] = useState<OpTier>("SMALL");

  const [loading, setLoading] = useState(true);

  const goEntry = (type: string) => router.push(`/roots-entry?type=${type}` as any);

  const goPopEntry = (
    activityCode: string,
    subtypeCode: string,
    touchpointNumber: number,
    touchpointName: string,
  ) => {
    const qs = new URLSearchParams({
      type: "pop_touchpoint",
      activityCode,
      subtypeCode,
      touchpointNumber: String(touchpointNumber),
      touchpointName,
    }).toString();
    router.push(`/roots-entry?${qs}` as any);
  };

  // Lazy-load PoP for a given (activity, subtype) pair, cached after first fetch.
  const loadPop = useCallback(async (code: string, subtypeCode: string = "") => {
    const cacheKey = `${code}:${subtypeCode}`;
    setPopByKey((prev) => {
      if (prev[cacheKey]) return prev;
      return prev;
    });
    try {
      const qs = subtypeCode ? `?subtypeCode=${encodeURIComponent(subtypeCode)}` : "";
      const res = await apiGet(`/farmer/pop/${code}/progress${qs}`);
      if (res.success && res.data) {
        setPopByKey((prev) => {
          if (prev[cacheKey]) return prev;
          return { ...prev, [cacheKey]: res.data };
        });
      }
    } catch {
      /* swallow — card body renders "no template" fallback */
    }
  }, []);

  // Dairy profile fetch — runs once on mount. Non-fatal on failure.
  useEffect(() => {
    if (dairyHerdTier !== null) return;
    (async () => {
      try {
        const res = await apiGet("/roots/dairy/v2/profile");
        if (res.success && res.data?.herdTier) {
          setDairyHerdTier(res.data.herdTier as OpTier);
          setDairyProfileExists(true);
        } else {
          setDairyHerdTier("SMALL");
          setDairyProfileExists(false);
        }
      } catch {
        setDairyHerdTier("SMALL");
        setDairyProfileExists(false);
      }
    })();
  }, [dairyHerdTier]);

  // Fishery profile fetch — runs once on mount.
  useEffect(() => {
    if (fisheryTier !== null) return;
    (async () => {
      try {
        const res = await apiGet("/roots/fishery/v2/profile");
        if (res.success && res.data?.tier) {
          setFisheryTier(res.data.tier as OpTier);
          setFisheryProfileExists(true);
        } else {
          setFisheryTier("SMALL");
          setFisheryProfileExists(false);
        }
      } catch {
        setFisheryTier("SMALL");
        setFisheryProfileExists(false);
      }
    })();
  }, [fisheryTier]);

  const saveDairyTier = useCallback(async (tier: OpTier) => {
    setSavingTier(true);
    try {
      const r = await apiPost("/roots/dairy/v2/profile", { herdTier: tier });
      if (r?.success) { setDairyHerdTier(tier); setDairyProfileExists(true); }
    } catch { /* non-fatal */ } finally { setSavingTier(false); }
  }, []);

  const saveFisheryTier = useCallback(async (tier: OpTier) => {
    setSavingTier(true);
    try {
      const r = await apiPost("/roots/fishery/v2/profile", { tier });
      if (r?.success) { setFisheryTier(tier); setFisheryProfileExists(true); }
    } catch { /* non-fatal */ } finally { setSavingTier(false); }
  }, []);

  // Load all of the farmer's subtype selections once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet("/farmer/activity-subtypes");
        if (cancelled) return;
        if (res?.success && res.data?.subtypes) setSubtypesByActivity(res.data.subtypes);
        else setSubtypesByActivity({});
      } catch {
        if (!cancelled) setSubtypesByActivity({});
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Hydrate client-only lock + picker state from AsyncStorage once on mount.
  useEffect(() => {
    (async () => {
      try {
        const [locks, kind, water] = await Promise.all([
          AsyncStorage.getItem(LS_LOCKED_ACTIVITIES),
          AsyncStorage.getItem(LS_DAIRY_ANIMAL_KIND),
          AsyncStorage.getItem(LS_FISHERY_WATER_TYPE),
        ]);
        if (locks) {
          try { setLockedActivities(new Set(JSON.parse(locks) as string[])); } catch { /* ignore */ }
        }
        if (kind) setDairyAnimalKind(kind as DairyAnimalKind);
        if (water) setFisheryWaterType(water as FisheryWaterType);
      } catch { /* non-fatal */ } finally {
        setLocksHydrated(true);
      }
    })();
  }, []);

  const persistLocks = useCallback(async (next: Set<string>) => {
    setLockedActivities(next);
    try { await AsyncStorage.setItem(LS_LOCKED_ACTIVITIES, JSON.stringify([...next])); } catch { /* non-fatal */ }
  }, []);

  const lockActivity = useCallback((activity: string) => {
    const next = new Set(lockedActivities);
    next.add(activity);
    persistLocks(next);
  }, [lockedActivities, persistLocks]);

  const saveDairyAnimalKind = useCallback(async (kind: DairyAnimalKind) => {
    setDairyAnimalKind(kind);
    try { await AsyncStorage.setItem(LS_DAIRY_ANIMAL_KIND, kind); } catch { /* non-fatal */ }
  }, []);

  const saveFisheryWaterType = useCallback(async (water: FisheryWaterType) => {
    setFisheryWaterType(water);
    try { await AsyncStorage.setItem(LS_FISHERY_WATER_TYPE, water); } catch { /* non-fatal */ }
  }, []);

  const saveSubtypes = useCallback(async (activityCode: SubtypeActivityCode, codes: string[]) => {
    if (codes.length === 0) return;
    setSavingSubtypes(true);
    try {
      const r = await apiPost("/farmer/activity-subtypes", { activityCode, subtypeCodes: codes });
      if (r?.success) {
        setSubtypesByActivity((prev) => ({ ...(prev || {}), [activityCode]: r.data?.subtypeCodes || codes }));
        setEditingSubtypeFor(null);
        setSubtypeDraft([]);
        // Lock the corresponding farm-tab activity so the cards list
        // starts filtering after the first confirmed save.
        const tabKey = Object.keys(POP_ACTIVITY_CODES).find(
          (k) => POP_ACTIVITY_CODES[k] === activityCode,
        );
        if (tabKey) {
          const next = new Set(lockedActivities);
          next.add(tabKey);
          persistLocks(next);
        }
      }
    } catch { /* non-fatal */ } finally { setSavingSubtypes(false); }
  }, [lockedActivities, persistLocks]);

  const openSubtypeEditor = useCallback((activityCode: SubtypeActivityCode) => {
    const current = subtypesByActivity?.[activityCode] || [];
    setSubtypeDraft([...current]);
    setEditingSubtypeFor(activityCode);
  }, [subtypesByActivity]);

  const toggleSubtypeDraft = useCallback((code: string) => {
    setSubtypeDraft((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  }, []);

  // ─── Build card list from subtype selections ─────────────────────
  const cards = useMemo<PopCard[]>(() => {
    if (subtypesByActivity === null || !locksHydrated) return [];
    const list: PopCard[] = [];
    // Once the farmer has locked any activity, filter the card list to
    // show only chosen activities. Before the first lock (onboarding),
    // show everything so the farmer can explore and save.
    const anyLocks = lockedActivities.size > 0;
    for (const activity of ALL_AGRI) {
      if (anyLocks && !lockedActivities.has(activity)) continue;
      const tab = ACTIVITY_TABS[activity];
      if (!tab) continue;

      if (activity === "crop" || activity === "poultry" || activity === "goatery") {
        const activityCode = POP_ACTIVITY_CODES[activity];
        const selections = subtypesByActivity[activityCode as SubtypeActivityCode] || [];
        if (selections.length === 0) {
          list.push({
            key: `${activityCode}:__picker__`, kind: "picker",
            activity, activityCode, subtypeCode: "",
            label: tab.label, icon: tab.icon,
          });
        } else {
          for (const st of selections) {
            const def = getSubtypeLabel(activityCode as SubtypeActivityCode, st);
            list.push({
              key: `${activityCode}:${st}`, kind: "pop",
              activity, activityCode, subtypeCode: st,
              label: def ? `${tab.label} · ${def.labelEn}` : tab.label,
              icon: def?.icon || tab.icon,
            });
          }
        }
      } else if (activity === "horticulture") {
        // Fruit track — one card per HORTI subtype (or a picker card)
        const selections = subtypesByActivity.HORTI || [];
        if (selections.length === 0) {
          list.push({
            key: "HORTI:__picker__", kind: "picker",
            activity, activityCode: "HORTI", subtypeCode: "",
            label: `${tab.label} · Fruit`, icon: "\uD83C\uDF4E",
          });
        } else {
          for (const st of selections) {
            const def = getSubtypeLabel("HORTI", st);
            list.push({
              key: `HORTI:${st}`, kind: "pop",
              activity, activityCode: "HORTI", subtypeCode: st,
              label: def ? `Horti · ${def.labelEn}` : "Horticulture · Fruit",
              icon: def?.icon || "\uD83C\uDF4E",
            });
          }
        }
        // Vegetables track — always present, no subtype
        list.push({
          key: "VEG:", kind: "pop",
          activity, activityCode: "VEG", subtypeCode: "",
          label: "Horti · Vegetables", icon: "\uD83E\uDD55",
        });
      } else {
        // dairy, fisheries — single card
        const activityCode = POP_ACTIVITY_CODES[activity];
        list.push({
          key: `${activityCode}:`, kind: "pop",
          activity, activityCode, subtypeCode: "",
          label: tab.label, icon: tab.icon,
        });
      }
    }
    return list;
  }, [subtypesByActivity, locksHydrated, lockedActivities]);

  // Eager-fetch PoP for all pop cards so headers can show live scores
  // without waiting for the farmer to expand each one. Picker cards skip
  // the fetch (no subtype yet).
  useEffect(() => {
    cards.forEach((c) => {
      if (c.kind === "pop") loadPop(c.activityCode, c.subtypeCode);
    });
  }, [cards, loadPop]);

  // Auto-expand when there is exactly one card (solo farmer — no point
  // making them tap to see their only PoP).
  useEffect(() => {
    if (cards.length === 1 && expandedKey === null) setExpandedKey(cards[0].key);
  }, [cards, expandedKey]);

  const toggleCard = useCallback((key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  }, []);

  /**
   * Shared sub-activity picker grid. Rendered inside a picker card's body
   * (first-open gate) or when the farmer taps the edit pencil on a PoP
   * card header to re-open the picker.
   */
  const renderSubtypePicker = (
    activityCode: SubtypeActivityCode,
    theme: { bg: string; border: string; accent: string; chipBg: string; chipFg: string },
  ) => {
    if (subtypesByActivity === null) return null;
    const category = ACTIVITY_SUBTYPE_CATALOG[activityCode];
    const current = subtypesByActivity[activityCode] || [];
    const isEditing = editingSubtypeFor === activityCode;
    const hasSelections = current.length > 0;

    if (hasSelections && !isEditing) {
      return (
        <View style={[styles.subtypeChipHeader, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {current.map((code) => {
              const def = getSubtypeLabel(activityCode, code);
              if (!def) return null;
              return (
                <View key={code} style={[styles.subtypeChip, { backgroundColor: theme.chipBg }]}>
                  <Text style={styles.subtypeChipIcon}>{def.icon}</Text>
                  <Text style={[styles.subtypeChipLabel, { color: theme.chipFg }]}>{def.labelEn}</Text>
                </View>
              );
            })}
          </View>
          <TouchableOpacity onPress={() => openSubtypeEditor(activityCode)} activeOpacity={0.7} style={styles.subtypeEditBtn}>
            <Text style={{ fontSize: 16, color: theme.accent }}>{"\u270F\uFE0F"}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const draft = isEditing ? subtypeDraft : [];
    return (
      <View style={[styles.card, { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border }]}>
        <Text style={[styles.tierPromptTitle, { color: theme.accent }]}>What do you grow / raise?</Text>
        <Text style={[styles.tierPromptHi, { color: theme.accent, opacity: 0.7 }]}>
          {"\u0906\u092A \u0915\u094D\u092F\u093E \u0909\u0917\u093E\u0924\u0947 / \u092A\u093E\u0932\u0924\u0947 \u0939\u0948\u0902?"} · Select all that apply
        </Text>
        <View style={styles.subtypeGrid}>
          {category.subtypes.map((s) => {
            const selected = isEditing ? draft.includes(s.code) : false;
            return (
              <TouchableOpacity
                key={s.code}
                style={[styles.subtypeCell, { borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.chipBg : "#fff" }]}
                activeOpacity={0.7}
                onPress={() => {
                  if (!isEditing) {
                    setEditingSubtypeFor(activityCode);
                    setSubtypeDraft([s.code]);
                  } else {
                    toggleSubtypeDraft(s.code);
                  }
                }}
              >
                <Text style={styles.subtypeCellIcon}>{s.icon}</Text>
                <Text style={[styles.subtypeCellLabel, { color: selected ? theme.accent : "#333" }]}>{s.labelEn}</Text>
                <Text style={styles.subtypeCellHi}>{s.labelHi}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {isEditing && (
          <View style={styles.subtypeActionsRow}>
            <TouchableOpacity
              style={[styles.subtypeSaveBtn, { backgroundColor: theme.accent, opacity: draft.length === 0 || savingSubtypes ? 0.4 : 1 }]}
              disabled={draft.length === 0 || savingSubtypes}
              activeOpacity={0.8}
              onPress={() => saveSubtypes(activityCode, draft)}
            >
              <Text style={styles.subtypeSaveBtnLabel}>{savingSubtypes ? "Saving…" : `Save (${draft.length})`}</Text>
            </TouchableOpacity>
            {hasSelections && (
              <TouchableOpacity
                style={styles.subtypeCancelBtn}
                activeOpacity={0.8}
                onPress={() => { setEditingSubtypeFor(null); setSubtypeDraft([]); }}
              >
                <Text style={styles.subtypeCancelLabel}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  /**
   * Shared tier-aware PoP grouping renderer. See in-file docs for the
   * fatigue-reduction strategy (SMALL anchors on dailies; LARGE on weekly
   * bulk entry; MEDIUM keeps everything expanded).
   */
  const renderTierAwarePop = (
    pop: PopProgress | null,
    tier: OpTier,
    tierLabels: Record<OpTier, { label: string; hint: string; color: string; bg: string }>,
    emptyLabel: string,
    logEntryKey: string,
    popContext?: { activityCode: string; subtypeCode: string },
  ) => {
    if (!pop || pop.touchpoints.length === 0) {
      return <Text style={styles.tpPending}>{emptyLabel}</Text>;
    }
    const cfg = tierLabels[tier];
    const byCadence: Record<string, PopTouchpoint[]> = {
      DAILY: [], WEEKLY: [], MONTHLY: [], QUARTERLY: [], PER_EVENT: [],
    };
    for (const tp of pop.touchpoints) {
      const key = tp.cadence || "WEEKLY";
      (byCadence[key] ||= []).push(tp);
    }
    const CADENCE_META: Record<string, { label: string; icon: string }> = {
      DAILY:     { label: "Daily",     icon: "\u2600\uFE0F" },
      WEEKLY:    { label: "Weekly",    icon: "\uD83D\uDCC5" },
      MONTHLY:   { label: "Monthly",   icon: "\uD83D\uDDD3\uFE0F" },
      QUARTERLY: { label: "Quarterly", icon: "\uD83D\uDDD3\uFE0F" },
      PER_EVENT: { label: "As needed", icon: "\u26A1" },
    };
    const groupOrder = tier === "LARGE"
      ? ["WEEKLY", "DAILY", "MONTHLY", "QUARTERLY", "PER_EVENT"]
      : ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "PER_EVENT"];
    const defaultCollapsedForTier = (cadence: string): boolean => {
      if (tier === "SMALL")  return cadence !== "DAILY";
      if (tier === "LARGE")  return cadence === "DAILY" || cadence === "PER_EVENT";
      return false;
    };

    return (
      <>
        <Text style={styles.sectionTitle}>{pop.touchpoints.length} Care Touchpoints</Text>
        <View style={[styles.tierBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
          <Text style={[styles.tierBadgeLabel, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={[styles.tierBadgeHint, { color: cfg.color }]}>{cfg.hint}</Text>
        </View>
        {groupOrder.map((cadence) => {
          const tps = byCadence[cadence];
          if (!tps || tps.length === 0) return null;
          const meta = CADENCE_META[cadence];
          const headerOpen = !defaultCollapsedForTier(cadence);
          return (
            <View key={cadence}>
              <View style={styles.cadenceHeader}>
                <Text style={styles.cadenceHeaderIcon}>{meta.icon}</Text>
                <Text style={styles.cadenceHeaderLabel}>{meta.label}</Text>
                <Text style={styles.cadenceHeaderCount}>{tps.length}</Text>
              </View>
              {headerOpen && tps.map((tp) => {
                const done = tp.status === "DONE";
                const current = tp.status === "CURRENT";
                return (
                  <TouchableOpacity
                    key={tp.touchpointNumber}
                    style={[styles.tpCard, current && styles.tpCurrent]}
                    onPress={() => setExpanded(expanded === tp.touchpointNumber ? null : tp.touchpointNumber)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tpRow}>
                      <View style={[styles.tpDot, done ? styles.tpDotDone : current ? styles.tpDotActive : styles.tpDotPending]}>
                        <Text style={styles.tpDotText}>{done ? "\u2713" : tp.touchpointNumber}</Text>
                      </View>
                      <View style={styles.tpInfo}>
                        <Text style={[styles.tpName, !done && !current && { color: "#bbb" }]}>{tp.nameEn}</Text>
                        {tp.descriptionEn && expanded === tp.touchpointNumber && (
                          <Text style={styles.tpDesc}>{tp.descriptionEn}</Text>
                        )}
                        {done && tp.score !== null && (
                          <Text style={[styles.tpScore, { color: tp.score >= 70 ? "#2e7d32" : tp.score >= 40 ? "#e65100" : "#c62828" }]}>{tp.score}/100</Text>
                        )}
                        {current && (
                          <Text
                            style={styles.enterBtn}
                            onPress={() =>
                              popContext
                                ? goPopEntry(popContext.activityCode, popContext.subtypeCode, tp.touchpointNumber, tp.nameEn)
                                : goEntry(logEntryKey)
                            }
                          >
                            {"\uD83D\uDCDD"} Log Care
                          </Text>
                        )}
                        {!done && !current && <Text style={styles.tpPending}>Pending</Text>}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {!headerOpen && (
                <Text style={styles.cadenceHidden}>Hidden by default for {cfg.label.toLowerCase()} — tap header to review.</Text>
              )}
            </View>
          );
        })}
      </>
    );
  };

  // Tier copy presets
  const DAIRY_TIER_LABELS: Record<OpTier, { label: string; hint: string; color: string; bg: string }> = {
    SMALL:  { label: "Small herd (<5)",    hint: "Daily essentials only — 30-second log", color: "#15803d", bg: "#dcfce7" },
    MEDIUM: { label: "Medium herd (5–10)", hint: "Daily + weekly check-ins",              color: "#1d4ed8", bg: "#dbeafe" },
    LARGE:  { label: "Large herd (>10)",   hint: "Weekly bulk entry + periodic tasks",    color: "#b45309", bg: "#fef3c7" },
  };
  const FISHERY_TIER_LABELS: Record<OpTier, { label: string; hint: string; color: string; bg: string }> = {
    SMALL:  { label: "Small (<1 ha / ≤1 vessel)", hint: "Daily essentials only — 30-second log", color: "#0e7490", bg: "#cffafe" },
    MEDIUM: { label: "Medium (1–5 ha / 2 vessels)", hint: "Daily + weekly check-ins",             color: "#1d4ed8", bg: "#dbeafe" },
    LARGE:  { label: "Large (>5 ha / 3+ vessels)",  hint: "Weekly bulk entry + periodic tasks",   color: "#b45309", bg: "#fef3c7" },
  };
  const HORTI_TIER_LABELS: Record<OpTier, { label: string; hint: string; color: string; bg: string }> = {
    SMALL:  { label: "Small orchard (<0.5 ha)", hint: "Weekly scouting — keep it a 2-minute walk", color: "#15803d", bg: "#dcfce7" },
    MEDIUM: { label: "Medium orchard (0.5–2 ha)", hint: "Weekly + monthly routine",                 color: "#1d4ed8", bg: "#dbeafe" },
    LARGE:  { label: "Large orchard (>2 ha)",     hint: "Weekly bulk entry + periodic tasks",       color: "#b45309", bg: "#fef3c7" },
  };
  const VEG_TIER_LABELS: Record<OpTier, { label: string; hint: string; color: string; bg: string }> = {
    SMALL:  { label: "Kitchen garden (<0.25 ha)", hint: "Weekly scouting anchor",                   color: "#15803d", bg: "#dcfce7" },
    MEDIUM: { label: "Market garden (0.25–1 ha)", hint: "Daily + weekly routine",                    color: "#1d4ed8", bg: "#dbeafe" },
    LARGE:  { label: "Commercial veg (>1 ha)",    hint: "Weekly bulk entry — dailies collapsed",    color: "#b45309", bg: "#fef3c7" },
  };
  const POULTRY_TIER_LABELS: Record<OpTier, { label: string; hint: string; color: string; bg: string }> = {
    SMALL:  { label: "Backyard (<100 birds)",     hint: "Weekly check anchor",                       color: "#15803d", bg: "#dcfce7" },
    MEDIUM: { label: "Small farm (100–500)",      hint: "Daily + weekly routine",                    color: "#1d4ed8", bg: "#dbeafe" },
    LARGE:  { label: "Commercial (>500)",         hint: "Weekly bulk entry — dailies collapsed",     color: "#b45309", bg: "#fef3c7" },
  };
  const GOATERY_TIER_LABELS: Record<OpTier, { label: string; hint: string; color: string; bg: string }> = {
    SMALL:  { label: "Household (<10 head)",      hint: "Weekly check anchor",                       color: "#15803d", bg: "#dcfce7" },
    MEDIUM: { label: "Medium (10–30 head)",       hint: "Daily + weekly routine",                    color: "#1d4ed8", bg: "#dbeafe" },
    LARGE:  { label: "Commercial (>30 head)",     hint: "Weekly bulk entry — dailies collapsed",     color: "#b45309", bg: "#fef3c7" },
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const actRes = await apiGet("/farmer/my-activities-v2");
          if (cancelled) return;
          if (actRes.success && actRes.data) setActivitiesData(actRes.data);
        } catch {
          if (cancelled) return;
          setActivitiesData({
            hasSubscriptions: false,
            activities: ["crop"],
            persona: "single_income",
            streams: [{ type: "crop", annualIncome: 150000, stability: "moderate", description: "Crop farming", health: "UNKNOWN" }],
            totalAnnualIncome: 150000,
          });
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [])
  );

  // ─── Per-activity body renderers (mounted only when card is expanded) ───

  const renderCropBody = (card: PopCard, pop: PopProgress | null) => {
    const compliance = pop?.complianceScore ?? 0;
    const scoreColor = compliance >= 70 ? "#2e7d32" : compliance >= 40 ? "#e65100" : "#c62828";
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.label}>PoP Compliance / {"\u0905\u0928\u0941\u092A\u093E\u0932\u0928"}</Text>
          <View style={styles.row}>
            <Text style={[styles.bigScore, { color: scoreColor }]}>{compliance}/100</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${compliance}%`, backgroundColor: scoreColor }]} />
            </View>
          </View>
          <Text style={styles.costText}>Cost: {formatRupees(32500)} of {formatRupees(75000)} (DLTC norm)</Text>
        </View>

        <Text style={styles.sectionTitle}>Crop Stage / {"\u092B\u0938\u0932 \u091A\u0930\u0923"}</Text>
        <View style={styles.timeline}>
          {(pop?.stages || []).map((s, i, arr) => {
            const stageTps = (pop?.touchpoints || []).filter((t) => t.stageKey === s.stageKey);
            const done = stageTps.length > 0 && stageTps.every((t) => t.status === "DONE");
            const current = pop?.currentStageKey === s.stageKey;
            return (
              <View key={s.stageKey} style={styles.stageRow}>
                <View style={styles.stageLine}>
                  <View style={[styles.stageDot, done ? styles.dotDone : current ? styles.dotCurrent : styles.dotFuture]}>
                    <Text style={styles.stageIcon}>{done ? "\u2713" : (s.icon || "")}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={[styles.connector, done ? styles.connDone : styles.connFuture]} />}
                </View>
                <View style={styles.stageInfo}>
                  <Text style={[styles.stageName, !done && !current && styles.stageFuture]}>{s.labelEn}</Text>
                  {s.labelHi && <Text style={styles.stageHi}>{s.labelHi}</Text>}
                  {current && <Text style={styles.currentBadge}>CURRENT</Text>}
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>{(pop?.touchpoints.length || 0)} Touchpoints / {"\u091A\u0930\u0923"}</Text>
        {(pop?.touchpoints || []).map((tp) => {
          const done = tp.status === "DONE";
          const current = tp.status === "CURRENT";
          return (
            <TouchableOpacity key={tp.touchpointNumber} style={[styles.tpCard, current && styles.tpCurrent]} onPress={() => setExpanded(expanded === tp.touchpointNumber ? null : tp.touchpointNumber)} activeOpacity={0.7}>
              <View style={styles.tpRow}>
                <View style={[styles.tpDot, done ? styles.tpDotDone : current ? styles.tpDotActive : styles.tpDotPending]}>
                  <Text style={styles.tpDotText}>{done ? "\u2713" : tp.touchpointNumber}</Text>
                </View>
                <View style={styles.tpInfo}>
                  <Text style={[styles.tpName, !done && !current && { color: "#bbb" }]}>{tp.nameEn}</Text>
                  {done && tp.score !== null && <Text style={[styles.tpScore, { color: tp.score >= 70 ? "#2e7d32" : tp.score >= 40 ? "#e65100" : "#c62828" }]}>{tp.score}/100</Text>}
                  {current && <Text style={styles.enterBtn} onPress={() => goPopEntry(card.activityCode, card.subtypeCode, tp.touchpointNumber, tp.nameEn)}>{"\uD83D\uDCDD"} Enter Data</Text>}
                  {!done && !current && <Text style={styles.tpPending}>Pending</Text>}
                </View>
              </View>
              {expanded === tp.touchpointNumber && done && (
                <View style={styles.tpDetail}>
                  <Text style={styles.tpDetailText}>Task: {tp.taskCompleted ? "\u2705 Complete" : "\u26A0\uFE0F Incomplete"}</Text>
                  <Text style={styles.tpDetailText}>Timing: {tp.timingStatus || "\u2014"}</Text>
                  <Text style={styles.tpDetailText}>Inputs: {tp.inputsStatus || "\u2014"}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        {(!pop || pop.touchpoints.length === 0) && (
          <Text style={styles.tpPending}>No PoP template available for Crop yet.</Text>
        )}
      </>
    );
  };

  const renderDairyBody = (_card: PopCard, pop: PopProgress | null) => {
    const compliance = pop?.complianceScore ?? 0;
    const scoreColor = compliance >= 70 ? "#2e7d32" : compliance >= 40 ? "#e65100" : "#c62828";
    const dairyLocked = lockedActivities.has("dairy");
    const canSaveDairy = dairyHerdTier != null && dairyAnimalKind != null;
    const dairyHerdOptions: { t: OpTier; label: string; hi: string }[] = [
      { t: "SMALL",  label: "Less than 5",  hi: "5 से कम" },
      { t: "MEDIUM", label: "5 to 10",      hi: "5 से 10" },
      { t: "LARGE",  label: "More than 10", hi: "10 से अधिक" },
    ];
    const dairyKindOptions: { k: DairyAnimalKind; label: string; hi: string; icon: string }[] = [
      { k: "cow",     label: "Cow",     hi: "गाय",     icon: "🐄" },
      { k: "buffalo", label: "Buffalo", hi: "भैंस",    icon: "🐃" },
      { k: "mixed",   label: "Mixed",   hi: "मिश्रित",  icon: "🐄🐃" },
    ];
    return (
      <>
        {/* ── Type pickers (always at top) ── */}
        <View style={[styles.card, { backgroundColor: "#e8f5e9", borderWidth: 1, borderColor: "#81c784" }]}>
          <Text style={styles.tierPromptTitle}>Herd size / {"\u092A\u0936\u0941\u0927\u0928"}</Text>
          <Text style={styles.tierPromptHi}>How many milch animals do you have? · आपके पास कितने दुधारू पशु हैं?</Text>
          <View style={styles.tierPromptRow}>
            {dairyHerdOptions.map(({ t, label, hi }) => {
              const selected = dairyHerdTier === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tierPromptBtn, selected && { backgroundColor: "#c8e6c9", borderColor: "#1b5e20", borderWidth: 2 }]}
                  onPress={() => saveDairyTier(t)}
                  disabled={savingTier}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tierPromptBtnLabel, selected && { color: "#1b5e20" }]}>{label}</Text>
                  <Text style={styles.tierPromptBtnHi}>{hi}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: "#f1f8e9", borderWidth: 1, borderColor: "#aed581" }]}>
          <Text style={styles.tierPromptTitle}>Animal kind / {"\u092A\u0936\u0941 \u092A\u094D\u0930\u0915\u093E\u0930"}</Text>
          <Text style={styles.tierPromptHi}>Which dairy animals do you keep? · आप कौन से पशु पालते हैं?</Text>
          <View style={styles.tierPromptRow}>
            {dairyKindOptions.map(({ k, label, hi, icon }) => {
              const selected = dairyAnimalKind === k;
              return (
                <TouchableOpacity
                  key={k}
                  style={[styles.tierPromptBtn, selected && { backgroundColor: "#dcedc8", borderColor: "#33691e", borderWidth: 2 }]}
                  onPress={() => saveDairyAnimalKind(k)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 20, marginBottom: 2 }}>{icon}</Text>
                  <Text style={[styles.tierPromptBtnLabel, selected && { color: "#33691e" }]}>{label}</Text>
                  <Text style={styles.tierPromptBtnHi}>{hi}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {!dairyLocked && (
          <TouchableOpacity
            style={[styles.lockSaveBtn, { backgroundColor: canSaveDairy ? "#1b5e20" : "#bdbdbd" }]}
            disabled={!canSaveDairy}
            activeOpacity={0.85}
            onPress={() => lockActivity("dairy")}
          >
            <Text style={styles.lockSaveBtnLabel}>
              {canSaveDairy ? "✓ Save & Lock Dairy" : "Choose herd size and animal kind"}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Herd Summary / {"\u092A\u0936\u0941\u0927\u0928"}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}><Text style={styles.statValue}>{DAIRY_DEMO.herdSize}</Text><Text style={styles.statLabel}>Total Animals</Text></View>
            <View style={styles.statItem}><Text style={styles.statValue}>{DAIRY_DEMO.milchAnimals}</Text><Text style={styles.statLabel}>Milch Animals</Text></View>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: "#1565c0" }]}>{DAIRY_DEMO.todayMilk}</Text><Text style={styles.statLabel}>Today's Milk</Text></View>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: "#2e7d32" }]}>{DAIRY_DEMO.monthlyIncome}</Text><Text style={styles.statLabel}>Monthly Income</Text></View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Avg Price</Text><Text style={styles.detailValue}>{DAIRY_DEMO.avgPrice}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Health Status</Text><Text style={[styles.detailValue, { color: "#2e7d32" }]}>{DAIRY_DEMO.healthStatus}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Next Vet Visit</Text><Text style={styles.detailValue}>{DAIRY_DEMO.nextVetVisit}</Text></View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => goEntry("dairy_milk")}><Text style={styles.actionIcon}>{"\uD83E\uDD5B"}</Text><Text style={styles.actionText}>Log Milk</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => goEntry("dairy_health")}><Text style={styles.actionIcon}>{"\uD83C\uDFE5"}</Text><Text style={styles.actionText}>Health Check</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}><Text style={styles.actionIcon}>{"\uD83D\uDCCA"}</Text><Text style={styles.actionText}>Production</Text></TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>PoP Compliance / {"\u0905\u0928\u0941\u092A\u093E\u0932\u0928"}</Text>
          <View style={styles.row}>
            <Text style={[styles.bigScore, { color: scoreColor }]}>{compliance}/100</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${compliance}%`, backgroundColor: scoreColor }]} />
            </View>
          </View>
          <Text style={styles.costText}>Based on ten operational care domains</Text>
        </View>

        <Text style={styles.sectionTitle}>Care Domains / {"\u0926\u0947\u0916\u092D\u093E\u0932"}</Text>
        <View style={styles.timeline}>
          {(pop?.stages || []).map((s, i, arr) => {
            const stageTps = (pop?.touchpoints || []).filter((t) => t.stageKey === s.stageKey);
            const done = stageTps.length > 0 && stageTps.every((t) => t.status === "DONE");
            const current = pop?.currentStageKey === s.stageKey;
            return (
              <View key={s.stageKey} style={styles.stageRow}>
                <View style={styles.stageLine}>
                  <View style={[styles.stageDot, done ? styles.dotDone : current ? styles.dotCurrent : styles.dotFuture]}>
                    <Text style={styles.stageIcon}>{done ? "\u2713" : (s.icon || "")}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={[styles.connector, done ? styles.connDone : styles.connFuture]} />}
                </View>
                <View style={styles.stageInfo}>
                  <Text style={[styles.stageName, !done && !current && styles.stageFuture]}>{s.labelEn}</Text>
                  {s.labelHi && <Text style={styles.stageHi}>{s.labelHi}</Text>}
                  {current && <Text style={styles.currentBadge}>CURRENT</Text>}
                </View>
              </View>
            );
          })}
        </View>

        {renderTierAwarePop(pop, dairyHerdTier || "SMALL", DAIRY_TIER_LABELS, "No PoP template available for Dairy yet.", "dairy_milk")}
      </>
    );
  };

  const renderFisheryBody = (_card: PopCard, pop: PopProgress | null) => {
    const compliance = pop?.complianceScore ?? 0;
    const scoreColor = compliance >= 70 ? "#2e7d32" : compliance >= 40 ? "#e65100" : "#c62828";
    const fisheryLocked = lockedActivities.has("fisheries");
    const canSaveFishery = fisheryWaterType != null && fisheryTier != null;
    const waterOptions: { w: FisheryWaterType; label: string; hi: string; icon: string }[] = [
      { w: "freshwater", label: "Freshwater", hi: "मीठा पानी", icon: "🏞️" },
      { w: "sea",        label: "Sea",        hi: "समुद्र",    icon: "🌊" },
    ];
    const fisheryTierOptions: { t: OpTier; label: string; hi: string }[] = [
      { t: "SMALL",  label: "Under 1 acre", hi: "1 एकड़ से कम" },
      { t: "MEDIUM", label: "1 to 5 acres", hi: "1 से 5 एकड़" },
      { t: "LARGE",  label: "Over 5 acres", hi: "5 एकड़ से अधिक" },
    ];
    return (
      <>
        {/* ── Type pickers (always at top) ── */}
        <View style={[styles.card, { backgroundColor: "#e0f2f1", borderWidth: 1, borderColor: "#4db6ac" }]}>
          <Text style={[styles.tierPromptTitle, { color: "#00695c" }]}>Type of fish farming / {"\u092E\u0924\u094D\u0938\u094D\u092F \u092A\u094D\u0930\u0915\u093E\u0930"}</Text>
          <Text style={[styles.tierPromptHi, { color: "#00796b" }]}>Sea or freshwater? · समुद्र या मीठा पानी?</Text>
          <View style={styles.tierPromptRow}>
            {waterOptions.map(({ w, label, hi, icon }) => {
              const selected = fisheryWaterType === w;
              return (
                <TouchableOpacity
                  key={w}
                  style={[styles.tierPromptBtn, { borderColor: "#80cbc4" }, selected && { backgroundColor: "#b2dfdb", borderColor: "#00695c", borderWidth: 2 }]}
                  onPress={() => saveFisheryWaterType(w)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 22, marginBottom: 2 }}>{icon}</Text>
                  <Text style={[styles.tierPromptBtnLabel, { color: selected ? "#00695c" : "#00796b" }]}>{label}</Text>
                  <Text style={styles.tierPromptBtnHi}>{hi}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: "#e0f7fa", borderWidth: 1, borderColor: "#4dd0e1" }]}>
          <Text style={[styles.tierPromptTitle, { color: "#006064" }]}>Pond area / {"\u0924\u093E\u0932\u093E\u092C \u0915\u094D\u0937\u0947\u0924\u094D\u0930"}</Text>
          <Text style={[styles.tierPromptHi, { color: "#00838f" }]}>How large is your operation? · आपके तालाब का आकार?</Text>
          <View style={styles.tierPromptRow}>
            {fisheryTierOptions.map(({ t, label, hi }) => {
              const selected = fisheryTier === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tierPromptBtn, { borderColor: "#80deea" }, selected && { backgroundColor: "#b2ebf2", borderColor: "#006064", borderWidth: 2 }]}
                  onPress={() => saveFisheryTier(t)}
                  disabled={savingTier}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tierPromptBtnLabel, { color: selected ? "#006064" : "#00838f" }]}>{label}</Text>
                  <Text style={styles.tierPromptBtnHi}>{hi}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {!fisheryLocked && (
          <TouchableOpacity
            style={[styles.lockSaveBtn, { backgroundColor: canSaveFishery ? "#00695c" : "#bdbdbd" }]}
            disabled={!canSaveFishery}
            activeOpacity={0.85}
            onPress={() => lockActivity("fisheries")}
          >
            <Text style={styles.lockSaveBtnLabel}>
              {canSaveFishery ? "✓ Save & Lock Fisheries" : "Choose water type and pond area"}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Pond Summary / {"\u0924\u093E\u0932\u093E\u092C"}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}><Text style={styles.statValue}>{FISHERY_DEMO.ponds}</Text><Text style={styles.statLabel}>Active Ponds</Text></View>
            <View style={styles.statItem}><Text style={styles.statValue}>{FISHERY_DEMO.area}</Text><Text style={styles.statLabel}>Total Area</Text></View>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: "#1565c0" }]}>{FISHERY_DEMO.estimatedYield}</Text><Text style={styles.statLabel}>Est. Yield</Text></View>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: "#2e7d32", fontSize: 12 }]}>{FISHERY_DEMO.waterQuality}</Text><Text style={styles.statLabel}>Water Quality</Text></View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.card, { backgroundColor: "#004d40", flexDirection: "row", alignItems: "center", gap: 12 }]}
          activeOpacity={0.8}
          onPress={() => router.push("/fishery-logbook" as any)}
        >
          <Text style={{ fontSize: 28 }}>{"\uD83D\uDC1F"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Open Fishery Logbook</Text>
            <Text style={{ color: "#80cbc4", fontSize: 12, marginTop: 2 }}>Ponds, vessels, trips, P&L</Text>
          </View>
          <Text style={{ color: "#80cbc4", fontSize: 24 }}>›</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Species</Text><Text style={styles.detailValue}>{FISHERY_DEMO.species}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Last Stocking</Text><Text style={styles.detailValue}>{FISHERY_DEMO.lastStocking}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Next Harvest</Text><Text style={[styles.detailValue, { color: "#e65100" }]}>{FISHERY_DEMO.nextHarvest}</Text></View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => goEntry("fishery_water")}><Text style={styles.actionIcon}>{"\uD83D\uDCA7"}</Text><Text style={styles.actionText}>Water Test</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => goEntry("fishery_stock")}><Text style={styles.actionIcon}>{"\uD83D\uDC1F"}</Text><Text style={styles.actionText}>Stocking</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}><Text style={styles.actionIcon}>{"\uD83D\uDCCA"}</Text><Text style={styles.actionText}>Production</Text></TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>PoP Compliance / {"\u0905\u0928\u0941\u092A\u093E\u0932\u0928"}</Text>
          <View style={styles.row}>
            <Text style={[styles.bigScore, { color: scoreColor }]}>{compliance}/100</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${compliance}%`, backgroundColor: scoreColor }]} />
            </View>
          </View>
          <Text style={styles.costText}>Based on ten operational care domains</Text>
        </View>

        <Text style={styles.sectionTitle}>Care Domains / {"\u0926\u0947\u0916\u092D\u093E\u0932"}</Text>
        <View style={styles.timeline}>
          {(pop?.stages || []).map((s, i, arr) => {
            const stageTps = (pop?.touchpoints || []).filter((t) => t.stageKey === s.stageKey);
            const done = stageTps.length > 0 && stageTps.every((t) => t.status === "DONE");
            const current = pop?.currentStageKey === s.stageKey;
            return (
              <View key={s.stageKey} style={styles.stageRow}>
                <View style={styles.stageLine}>
                  <View style={[styles.stageDot, done ? styles.dotDone : current ? styles.dotCurrent : styles.dotFuture]}>
                    <Text style={styles.stageIcon}>{done ? "\u2713" : (s.icon || "")}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={[styles.connector, done ? styles.connDone : styles.connFuture]} />}
                </View>
                <View style={styles.stageInfo}>
                  <Text style={[styles.stageName, !done && !current && styles.stageFuture]}>{s.labelEn}</Text>
                  {s.labelHi && <Text style={styles.stageHi}>{s.labelHi}</Text>}
                  {current && <Text style={styles.currentBadge}>CURRENT</Text>}
                </View>
              </View>
            );
          })}
        </View>

        {renderTierAwarePop(pop, fisheryTier || "SMALL", FISHERY_TIER_LABELS, "No PoP template available for Fishery yet.", "fishery_water")}
      </>
    );
  };

  // Shared timeline + PoP compliance block used by HORTI / VEG / POULTRY / GOATERY.
  const renderGenericPopBody = (
    card: PopCard,
    pop: PopProgress | null,
    opts: {
      tier: OpTier;
      tierLabels: Record<OpTier, { label: string; hint: string; color: string; bg: string }>;
      popCaption: string;
      stagesLabel: string;
      stagesLabelHi: string;
      emptyLabel: string;
      logEntryKey: string;
      extras?: React.ReactNode;
    },
  ) => {
    const compliance = pop?.complianceScore ?? 0;
    const scoreColor = compliance >= 70 ? "#2e7d32" : compliance >= 40 ? "#e65100" : "#c62828";
    return (
      <>
        {opts.extras}
        <View style={styles.card}>
          <Text style={styles.label}>PoP Compliance / {"\u0905\u0928\u0941\u092A\u093E\u0932\u0928"}</Text>
          <View style={styles.row}>
            <Text style={[styles.bigScore, { color: scoreColor }]}>{compliance}/100</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${compliance}%`, backgroundColor: scoreColor }]} />
            </View>
          </View>
          <Text style={styles.costText}>{opts.popCaption}</Text>
        </View>

        <Text style={styles.sectionTitle}>{opts.stagesLabel} / {opts.stagesLabelHi}</Text>
        <View style={styles.timeline}>
          {(pop?.stages || []).map((s, i, arr) => {
            const stageTps = (pop?.touchpoints || []).filter((t) => t.stageKey === s.stageKey);
            const done = stageTps.length > 0 && stageTps.every((t) => t.status === "DONE");
            const current = pop?.currentStageKey === s.stageKey;
            return (
              <View key={s.stageKey} style={styles.stageRow}>
                <View style={styles.stageLine}>
                  <View style={[styles.stageDot, done ? styles.dotDone : current ? styles.dotCurrent : styles.dotFuture]}>
                    <Text style={styles.stageIcon}>{done ? "\u2713" : (s.icon || "")}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={[styles.connector, done ? styles.connDone : styles.connFuture]} />}
                </View>
                <View style={styles.stageInfo}>
                  <Text style={[styles.stageName, !done && !current && styles.stageFuture]}>{s.labelEn}</Text>
                  {s.labelHi && <Text style={styles.stageHi}>{s.labelHi}</Text>}
                  {current && <Text style={styles.currentBadge}>CURRENT</Text>}
                </View>
              </View>
            );
          })}
        </View>

        {renderTierAwarePop(
          pop, opts.tier, opts.tierLabels, opts.emptyLabel, opts.logEntryKey,
          { activityCode: card.activityCode, subtypeCode: card.subtypeCode },
        )}
      </>
    );
  };

  const renderHortiFruitBody = (card: PopCard, pop: PopProgress | null) => {
    const extras = (
      <>
        <View style={styles.card}>
          <Text style={styles.label}>Orchard Summary / {"\u092C\u093E\u0917"}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}><Text style={styles.statValue}>{HORTI_DEMO.orchards}</Text><Text style={styles.statLabel}>Orchards</Text></View>
            <View style={styles.statItem}><Text style={styles.statValue}>{HORTI_DEMO.area}</Text><Text style={styles.statLabel}>Total Area</Text></View>
            <View style={styles.statItem}><Text style={[styles.statValue, { color: "#7c3aed", fontSize: 12 }]}>{HORTI_DEMO.currentStage}</Text><Text style={styles.statLabel}>Current Stage</Text></View>
            <View style={styles.statItem}><Text style={styles.statValue}>{HORTI_DEMO.trees}</Text><Text style={styles.statLabel}>Trees</Text></View>
          </View>
        </View>
        <View style={styles.card}>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Crop</Text><Text style={styles.detailValue}>{HORTI_DEMO.crop}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Health</Text><Text style={[styles.detailValue, { color: "#e65100" }]}>{HORTI_DEMO.healthStatus}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Next Harvest</Text><Text style={[styles.detailValue, { color: "#2e7d32" }]}>{HORTI_DEMO.nextHarvest}</Text></View>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => goEntry("horti_health")}><Text style={styles.actionIcon}>{"\uD83C\uDF3F"}</Text><Text style={styles.actionText}>Health Log</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => goEntry("horti_harvest")}><Text style={styles.actionIcon}>{"\uD83C\uDF4E"}</Text><Text style={styles.actionText}>Harvest</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => goEntry("horti_input")}><Text style={styles.actionIcon}>{"\uD83E\uDDEA"}</Text><Text style={styles.actionText}>Input Log</Text></TouchableOpacity>
        </View>
      </>
    );
    return renderGenericPopBody(card, pop, {
      tier: horticultureTier,
      tierLabels: HORTI_TIER_LABELS,
      popCaption: "Based on the annual orchard care cycle",
      stagesLabel: "Care Domains", stagesLabelHi: "\u0926\u0947\u0916\u092D\u093E\u0932",
      emptyLabel: "No PoP template available for Horticulture yet.",
      logEntryKey: "horti_health",
      extras,
    });
  };

  const renderVegBody = (card: PopCard, pop: PopProgress | null) => {
    const extras = (
      <>
        <View style={styles.card}>
          <Text style={styles.label}>Vegetables / {"\u0938\u092C\u094D\u095B\u093F\u092F\u093E\u0901"}</Text>
          <Text style={styles.costText}>
            Short-cycle crops — tomato, brinjal, okra, chilli, cucurbits, cole crops. Based on ICAR-IIVR mandate crops.
          </Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => goEntry("veg_nursery")}><Text style={styles.actionIcon}>{"\uD83C\uDF31"}</Text><Text style={styles.actionText}>Nursery</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => goEntry("veg_harvest")}><Text style={styles.actionIcon}>{"\uD83E\uDD55"}</Text><Text style={styles.actionText}>Harvest</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => goEntry("veg_input")}><Text style={styles.actionIcon}>{"\uD83E\uDDEA"}</Text><Text style={styles.actionText}>Input Log</Text></TouchableOpacity>
        </View>
      </>
    );
    return renderGenericPopBody(card, pop, {
      tier: vegetableTier,
      tierLabels: VEG_TIER_LABELS,
      popCaption: "Based on the short-cycle vegetable crop cycle",
      stagesLabel: "Crop Stages", stagesLabelHi: "\u095E\u0938\u0932 \u091A\u0930\u0923",
      emptyLabel: "No PoP template available for Vegetables yet.",
      logEntryKey: "veg_health",
      extras,
    });
  };

  const renderPoultryBody = (card: PopCard, pop: PopProgress | null) =>
    renderGenericPopBody(card, pop, {
      tier: poultryTier,
      tierLabels: POULTRY_TIER_LABELS,
      popCaption: "Based on ten poultry care domains (layer + broiler)",
      stagesLabel: "Care Domains", stagesLabelHi: "\u0926\u0947\u0916\u092D\u093E\u0932",
      emptyLabel: "No PoP template available for Poultry yet.",
      logEntryKey: "poultry_health",
    });

  const renderGoateryBody = (card: PopCard, pop: PopProgress | null) =>
    renderGenericPopBody(card, pop, {
      tier: goateryTier,
      tierLabels: GOATERY_TIER_LABELS,
      popCaption: "Based on ten small-ruminant care domains",
      stagesLabel: "Care Domains", stagesLabelHi: "\u0926\u0947\u0916\u092D\u093E\u0932",
      emptyLabel: "No PoP template available for Goatery yet.",
      logEntryKey: "goatery_health",
    });

  const renderCardBody = (card: PopCard) => {
    if (card.kind === "picker") {
      const theme = ACTIVITY_THEME[card.activityCode] || ACTIVITY_THEME.CROP;
      return renderSubtypePicker(card.activityCode as SubtypeActivityCode, theme);
    }
    const pop = popByKey[card.key] || null;
    switch (card.activity) {
      case "crop":         return renderCropBody(card, pop);
      case "dairy":        return renderDairyBody(card, pop);
      case "fisheries":    return renderFisheryBody(card, pop);
      case "horticulture": return card.activityCode === "VEG" ? renderVegBody(card, pop) : renderHortiFruitBody(card, pop);
      case "poultry":      return renderPoultryBody(card, pop);
      case "goatery":      return renderGoateryBody(card, pop);
      default:             return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.loadingText}>Loading farm data...</Text>
      </View>
    );
  }

  const persona = activitiesData?.persona || "single_income";
  const personaCfg = PERSONA_CONFIG[persona] || PERSONA_CONFIG.single_income;
  const totalIncome = activitiesData?.totalAnnualIncome || 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* ── Persona Badge + Income Summary ── */}
      <View style={[styles.personaCard, { backgroundColor: personaCfg.bg }]}>
        <View style={styles.personaRow}>
          <Text style={styles.personaIcon}>{personaCfg.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.personaLabel, { color: personaCfg.color }]}>{personaCfg.label} Farmer</Text>
            <Text style={styles.personaHi}>{personaCfg.labelHi}</Text>
          </View>
          <View style={styles.incomeBox}>
            <Text style={styles.incomeLabel}>Annual Income</Text>
            <Text style={[styles.incomeValue, { color: personaCfg.color }]}>{formatRupees(totalIncome)}</Text>
          </View>
        </View>
        <View style={styles.activityIconsRow}>
          {activitiesData?.streams?.map((s, i) => {
            const healthColor = HEALTH_COLOR[(s.health || "UNKNOWN") as HealthStatus];
            return (
              <View key={i} style={styles.activityChip}>
                <View style={[styles.healthDot, { backgroundColor: healthColor }]} />
                <Text style={styles.chipIcon}>
                  {s.type === "crop" ? "\uD83C\uDF3E" : s.type === "dairy" ? "\uD83D\uDC04" : s.type === "fisheries" ? "\uD83D\uDC1F" : s.type === "horticulture" ? "\uD83C\uDF4E" : s.type === "shg" ? "\uD83E\uDD1D" : s.type === "labour" ? "\uD83D\uDC77" : "\uD83D\uDCB0"}
                </Text>
                <Text style={styles.chipLabel}>{s.type}</Text>
                <Text style={styles.chipAmount}>{formatRupees(s.annualIncome)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Plant a new crop CTA (Phase 2A — opens crop card screen) ── */}
      <TouchableOpacity
        style={styles.plantCropBtn}
        onPress={() => router.push("/roots-crop-card" as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.plantCropEmoji}>🌱</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.plantCropTitle}>Plant a new crop</Text>
          <Text style={styles.plantCropSub}>Pick crop + variety, get stage-aware advisories</Text>
        </View>
        <Text style={styles.plantCropChevron}>›</Text>
      </TouchableOpacity>

      {/* ── Add / Edit Activities CTA ── */}
      <TouchableOpacity
        style={styles.editActivitiesBtn}
        onPress={() => router.push("/onboarding-activities" as any)}
        activeOpacity={0.8}
      >
        <Text style={styles.editActivitiesIcon}>✏️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.editActivitiesLabel}>Add / Edit Activities</Text>
          <Text style={styles.editActivitiesSub}>Update your livelihood mix · पुनः चुनें</Text>
        </View>
        <Text style={styles.editActivitiesArrow}>›</Text>
      </TouchableOpacity>

      {/* ── Multi-PoP Dashboard: single-active accordion of cards ── */}
      <Text style={styles.dashboardTitle}>
        {cards.length > 0 ? `${cards.length} Activities / ${"\u0917\u0924\u093F\u0935\u093F\u0927\u093F\u092F\u093E\u0901"}` : ""}
      </Text>

      {cards.map((card) => {
        const isExpanded = expandedKey === card.key;
        const pop = card.kind === "pop" ? (popByKey[card.key] || null) : null;
        const compliance = pop?.complianceScore ?? 0;
        const scoreColor = compliance >= 70 ? "#2e7d32" : compliance >= 40 ? "#e65100" : "#c62828";
        const theme = ACTIVITY_THEME[card.activityCode] || { accent: "#1b5e20", bg: "#f9f9f9", border: "#e0e0e0", chipBg: "#eef", chipFg: "#333" };
        const currentName = pop?.currentTouchpoint?.nameEn;

        return (
          <View key={card.key} style={[styles.popCard, isExpanded && { borderColor: theme.accent, borderWidth: 1.5 }]}>
            {/* Collapsed header — always rendered */}
            <TouchableOpacity
              style={styles.popCardHeader}
              onPress={() => toggleCard(card.key)}
              activeOpacity={0.75}
            >
              <Text style={styles.popCardIcon}>{card.icon}</Text>
              <View style={styles.popCardLabelWrap}>
                <Text style={styles.popCardLabel} numberOfLines={1}>{card.label}</Text>
                {card.kind === "picker" ? (
                  <Text style={styles.popCardSub} numberOfLines={1}>Tap to select what you grow / raise</Text>
                ) : currentName ? (
                  <Text style={styles.popCardSub} numberOfLines={1}>Next: {currentName}</Text>
                ) : pop ? (
                  <Text style={styles.popCardSub} numberOfLines={1}>All caught up</Text>
                ) : (
                  <Text style={styles.popCardSub} numberOfLines={1}>Loading…</Text>
                )}
              </View>
              {card.kind === "pop" && (
                <View style={styles.popCardScoreWrap}>
                  <Text style={[styles.popCardScore, { color: scoreColor }]}>{compliance}</Text>
                  <View style={styles.popCardProgressThin}>
                    <View style={[styles.popCardProgressThinFill, { width: `${compliance}%`, backgroundColor: scoreColor }]} />
                  </View>
                </View>
              )}
              <Text style={[styles.popCardChevron, { color: theme.accent }]}>{isExpanded ? "\u25BE" : "\u25B8"}</Text>
            </TouchableOpacity>

            {/* Body — only mounted when this card is the single active one */}
            {isExpanded && (
              <View style={styles.popCardBody}>
                {renderCardBody(card)}
              </View>
            )}
          </View>
        );
      })}

      {/* ── Add new activity CTA (only when locks exist) ── */}
      {lockedActivities.size > 0 && (() => {
        const unlocked = ALL_AGRI.filter((a) => !lockedActivities.has(a));
        if (unlocked.length === 0) return null;
        return (
          <View style={styles.addActivityWrap}>
            <TouchableOpacity
              style={styles.addActivityBtn}
              onPress={() => setShowAddNew((v) => !v)}
              activeOpacity={0.85}
            >
              <Text style={styles.addActivityIcon}>➕</Text>
              <Text style={styles.addActivityLabel}>
                {showAddNew ? "Close" : "Add new activity"}
              </Text>
              <Text style={styles.addActivityHi}>{showAddNew ? "बंद करें" : "नई गतिविधि जोड़ें"}</Text>
            </TouchableOpacity>
            {showAddNew && (
              <View style={styles.addActivityGrid}>
                {unlocked.map((a) => {
                  const tab = ACTIVITY_TABS[a];
                  if (!tab) return null;
                  return (
                    <TouchableOpacity
                      key={a}
                      style={styles.addActivityCell}
                      activeOpacity={0.75}
                      onPress={() => {
                        const next = new Set(lockedActivities);
                        next.add(a);
                        persistLocks(next);
                        setShowAddNew(false);
                      }}
                    >
                      <Text style={styles.addActivityCellIcon}>{tab.icon}</Text>
                      <Text style={styles.addActivityCellLabel}>{tab.label}</Text>
                      <Text style={styles.addActivityCellHi}>{tab.labelHi}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })()}

      {cards.length === 0 && subtypesByActivity !== null && (
        <Text style={styles.tpPending}>No activities yet. Tap "Add / Edit Activities" above to get started.</Text>
      )}
    </ScrollView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  loadingText: { marginTop: 12, color: "#888", fontSize: 14 },

  personaCard: { borderRadius: 16, padding: 16, marginBottom: 14, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  personaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  personaIcon: { fontSize: 28 },
  personaLabel: { fontSize: 16, fontWeight: "800" },
  personaHi: { fontSize: 11, color: "#888", marginTop: 1 },
  incomeBox: { alignItems: "flex-end" },
  incomeLabel: { fontSize: 10, color: "#888", textTransform: "uppercase" },
  incomeValue: { fontSize: 16, fontWeight: "800" },

  activityIconsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  activityChip: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, gap: 4 },
  healthDot: { width: 8, height: 8, borderRadius: 4, marginRight: 2 },
  chipIcon: { fontSize: 14 },
  chipLabel: { fontSize: 11, fontWeight: "600", color: "#555", textTransform: "capitalize" },
  chipAmount: { fontSize: 11, fontWeight: "700", color: "#333" },

  plantCropBtn: { backgroundColor: "#1b5e20", borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
  plantCropEmoji: { fontSize: 28 },
  plantCropTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
  plantCropSub: { fontSize: 12, color: "#a5d6a7", marginTop: 2 },
  plantCropChevron: { fontSize: 24, color: "#a5d6a7" },

  editActivitiesBtn: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#c8e6c9", elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  editActivitiesIcon: { fontSize: 22 },
  editActivitiesLabel: { fontSize: 14, fontWeight: "700", color: "#1b5e20" },
  editActivitiesSub: { fontSize: 11, color: "#888", marginTop: 1 },
  editActivitiesArrow: { fontSize: 22, color: "#a5d6a7" },

  // Multi-PoP dashboard
  dashboardTitle: { fontSize: 12, fontWeight: "800", color: "#888", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8, marginTop: 4 },
  popCard: {
    backgroundColor: "#fff", borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#e5e5e5",
    elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2,
    overflow: "hidden",
  },
  popCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  popCardIcon: { fontSize: 22 },
  popCardLabelWrap: { flex: 1, minWidth: 0 },
  popCardLabel: { fontSize: 14, fontWeight: "800", color: "#222" },
  popCardSub: { fontSize: 11, color: "#888", marginTop: 2 },
  popCardScoreWrap: { alignItems: "flex-end", minWidth: 64 },
  popCardScore: { fontSize: 16, fontWeight: "900" },
  popCardProgressThin: { width: 60, height: 4, backgroundColor: "#eee", borderRadius: 2, marginTop: 3, overflow: "hidden" },
  popCardProgressThinFill: { height: "100%", borderRadius: 2 },
  popCardChevron: { fontSize: 18, fontWeight: "800", marginLeft: 4 },
  popCardBody: { borderTopWidth: 1, borderTopColor: "#f0f0f0", padding: 14, backgroundColor: "#fafafa" },

  // Shared card (used inside card bodies)
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 14, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  label: { fontSize: 11, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  bigScore: { fontSize: 28, fontWeight: "900" },
  progressBar: { flex: 1, height: 10, backgroundColor: "#e0e0e0", borderRadius: 5 },
  progressFill: { height: "100%", borderRadius: 5 },
  costText: { fontSize: 12, color: "#888", marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 10, marginTop: 8 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  statItem: { width: "47%", backgroundColor: "#f9f9f9", borderRadius: 10, padding: 12, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800", color: "#333" },
  statLabel: { fontSize: 10, color: "#888", marginTop: 2, textTransform: "uppercase" },

  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  detailLabel: { fontSize: 13, color: "#888" },
  detailValue: { fontSize: 13, fontWeight: "700", color: "#333" },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 6, marginBottom: 16 },
  actionBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionText: { fontSize: 11, fontWeight: "700", color: "#333" },

  timeline: { marginBottom: 16 },
  stageRow: { flexDirection: "row", marginBottom: 0 },
  stageLine: { width: 40, alignItems: "center" },
  stageDot: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", zIndex: 1 },
  dotDone: { backgroundColor: "#2e7d32" },
  dotCurrent: { backgroundColor: "#1565c0", borderWidth: 3, borderColor: "#90caf9" },
  dotFuture: { backgroundColor: "#e0e0e0" },
  stageIcon: { color: "#fff", fontSize: 14, fontWeight: "700" },
  connector: { width: 3, height: 24, marginTop: -2 },
  connDone: { backgroundColor: "#2e7d32" },
  connFuture: { backgroundColor: "#e0e0e0" },
  stageInfo: { flex: 1, paddingVertical: 4, paddingLeft: 8 },
  stageName: { fontSize: 14, fontWeight: "600", color: "#333" },
  stageHi: { fontSize: 11, color: "#999" },
  stageFuture: { color: "#ccc" },
  currentBadge: { fontSize: 10, color: "#1565c0", fontWeight: "800", marginTop: 2 },

  tpCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  tpCurrent: { borderWidth: 2, borderColor: "#1565c0" },
  tpRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  tpDot: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  tpDotDone: { backgroundColor: "#2e7d32" },
  tpDotActive: { backgroundColor: "#1565c0" },
  tpDotPending: { backgroundColor: "#e0e0e0" },
  tpDotText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  tpInfo: { flex: 1 },
  tpName: { fontSize: 14, fontWeight: "600", color: "#333" },
  tpScore: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  enterBtn: { fontSize: 13, color: "#1565c0", fontWeight: "700", marginTop: 2 },
  tpPending: { fontSize: 12, color: "#bbb", marginTop: 2 },
  tpDetail: { marginTop: 10, padding: 10, backgroundColor: "#f5f5f5", borderRadius: 8 },
  tpDetailText: { fontSize: 12, color: "#555", marginBottom: 3 },
  tpDesc: { fontSize: 12, color: "#666", marginTop: 4, lineHeight: 16 },

  tierBadge: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  tierBadgeLabel: { fontSize: 13, fontWeight: "800" },
  tierBadgeHint: { fontSize: 11, fontWeight: "500", marginLeft: 12, flexShrink: 1, textAlign: "right" },
  cadenceHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingVertical: 8, marginTop: 6 },
  cadenceHeaderIcon: { fontSize: 14, marginRight: 8 },
  cadenceHeaderLabel: { fontSize: 13, fontWeight: "700", color: "#555", flex: 1, textTransform: "uppercase", letterSpacing: 0.5 },
  cadenceHeaderCount: { fontSize: 12, fontWeight: "600", color: "#999", backgroundColor: "#f0f0f0", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  cadenceHidden: { fontSize: 11, color: "#aaa", fontStyle: "italic", marginBottom: 10, marginLeft: 4 },

  tierPromptTitle: { fontSize: 15, fontWeight: "800", color: "#1b5e20" },
  tierPromptHi: { fontSize: 12, color: "#558b2f", marginTop: 2, marginBottom: 12 },
  tierPromptRow: { flexDirection: "row", gap: 8 },
  tierPromptBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center", borderWidth: 1.5, borderColor: "#c8e6c9" },
  tierPromptBtnLabel: { fontSize: 13, fontWeight: "700", color: "#1b5e20", textAlign: "center" },
  tierPromptBtnHi: { fontSize: 10, color: "#777", marginTop: 2, textAlign: "center" },

  subtypeChipHeader: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 },
  subtypeChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  subtypeChipIcon: { fontSize: 13 },
  subtypeChipLabel: { fontSize: 12, fontWeight: "700" },
  subtypeEditBtn: { padding: 6 },

  subtypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  subtypeCell: { width: "31%", minWidth: 90, alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1.5 },
  subtypeCellIcon: { fontSize: 22, marginBottom: 4 },
  subtypeCellLabel: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  subtypeCellHi: { fontSize: 10, color: "#888", marginTop: 2, textAlign: "center" },

  subtypeActionsRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  subtypeSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  subtypeSaveBtnLabel: { color: "#fff", fontSize: 14, fontWeight: "800" },
  subtypeCancelBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, backgroundColor: "#f0f0f0" },
  subtypeCancelLabel: { color: "#666", fontSize: 14, fontWeight: "700" },

  // "Save & Lock" button inside dairy/fishery cards
  lockSaveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 14, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  lockSaveBtnLabel: { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },

  // "Add new activity" CTA + inline picker
  addActivityWrap: { marginTop: 8 },
  addActivityBtn: { backgroundColor: "#fff", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: "#c8e6c9" },
  addActivityIcon: { fontSize: 20 },
  addActivityLabel: { fontSize: 14, fontWeight: "800", color: "#1b5e20", flex: 1 },
  addActivityHi: { fontSize: 11, color: "#558b2f" },
  addActivityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  addActivityCell: { width: "31%", minWidth: 90, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: "#c8e6c9", paddingVertical: 14, paddingHorizontal: 6, alignItems: "center" },
  addActivityCellIcon: { fontSize: 24, marginBottom: 4 },
  addActivityCellLabel: { fontSize: 12, fontWeight: "700", color: "#1b5e20" },
  addActivityCellHi: { fontSize: 10, color: "#888", marginTop: 2 },
});
