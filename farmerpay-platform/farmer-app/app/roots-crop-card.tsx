/**
 * ROOTS — Plant a new crop / horti crop (simplified Phase 2A)
 *
 * The "add a crop later" path from the Farm / activity-crop / activity-horti
 * screens. Mirrors the onboarding flow (onboarding-crops → onboarding-variety)
 * but for a single cycle:
 *   1. Pick a sub-crop card
 *        - default (CROP):  rice / wheat / sugarcane / oilseeds / pulses
 *        - ?mode=horti:     fruits / vegetables / flowers
 *   2. Pick a variety (radio list from the master catalog)
 *   3. Save → POST /roots/cycles → back to the caller
 *
 * Minimal data entry: no sowing-date, no insurance, no policy. Sowing
 * date defaults to today; season auto-derived. Insurance is captured in
 * DICE (see plan non-goals).
 *
 * The persona-phase resume-setup wizard links here with ?mode=horti so
 * the same screen doubles as the HORTI setup step.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiGet, apiPost } from "../lib/api";
import { ACTIVITY_SUBTYPE_CATALOG } from "../lib/activitySubtypeCatalog";
import {
  SUBTYPE_TO_CROP_CODE,
  SUBTYPE_PRIMARY_LABEL,
} from "../lib/subtypeCropMapping";

// ─── Types ─────────────────────────────────────────────────────────

interface Crop {
  cropId: string;
  cropCode: string;
  cropName: string;
}

interface Variety {
  varietyId: string;
  varietyName: string;
  varietyCode?: string;
  durationMin?: number;
  durationMax?: number;
  expectedYield?: number;
  isHybrid?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10);

const seasonForDate = (iso: string): "kharif" | "rabi" | "summer" => {
  const m = new Date(iso).getMonth() + 1;
  if (m >= 6 && m <= 10) return "kharif";
  if (m >= 11 || m <= 3) return "rabi";
  return "summer";
};

// ─── Component ─────────────────────────────────────────────────────

export default function RootsCropCardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isHortiMode = params.mode === "horti";
  const activityKey: "CROP" | "HORTI" = isHortiMode ? "HORTI" : "CROP";
  const subtypeOptions = ACTIVITY_SUBTYPE_CATALOG[activityKey].subtypes;

  const [cropsCache, setCropsCache] = useState<Crop[] | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<string | null>(null);
  const [currentCrop, setCurrentCrop] = useState<Crop | null>(null);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [selectedVariety, setSelectedVariety] = useState<Variety | null>(null);
  const [loadingVarieties, setLoadingVarieties] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load crop catalog once
  useEffect(() => {
    (async () => {
      try {
        const r = await apiGet("/roots/crops");
        setCropsCache(r?.success && Array.isArray(r.data) ? r.data : []);
      } catch {
        setCropsCache([]);
      }
    })();
  }, []);

  // When sub-crop picked, resolve crop + fetch varieties
  useEffect(() => {
    if (!selectedSubtype || !cropsCache) {
      setVarieties([]);
      setSelectedVariety(null);
      setCurrentCrop(null);
      return;
    }
    const cropCode = SUBTYPE_TO_CROP_CODE[selectedSubtype];
    if (!cropCode) return;
    const crop = cropsCache.find((c) => c.cropCode === cropCode) || null;
    setCurrentCrop(crop);
    setSelectedVariety(null);
    if (!crop) {
      setVarieties([]);
      return;
    }
    setLoadingVarieties(true);
    (async () => {
      try {
        const r = await apiGet(
          `/roots/varieties?cropId=${encodeURIComponent(crop.cropId)}`
        );
        setVarieties(r?.success && Array.isArray(r.data) ? r.data : []);
      } catch {
        setVarieties([]);
      } finally {
        setLoadingVarieties(false);
      }
    })();
  }, [selectedSubtype, cropsCache]);

  const submit = async () => {
    if (!selectedSubtype || !currentCrop || !selectedVariety) {
      Alert.alert(
        "Pick a crop and a variety",
        "Tap a sub-crop card, then pick a variety."
      );
      return;
    }
    setSubmitting(true);
    try {
      const sowingDate = todayStr();
      const body: any = {
        cropId: currentCrop.cropId,
        varietyId: selectedVariety.varietyId,
        season: seasonForDate(sowingDate),
        sowingDate,
        selfDeclaredCrop: currentCrop.cropName,
      };
      const r = await apiPost("/roots/cycles", body);
      if (!r?.success) throw new Error(r?.message || "Save failed");
      // Persona phase routing: if we were launched from the resume-setup
      // wizard (?mode=horti), continue the wizard. Otherwise drop back to
      // the activity drill-in so the farmer can see their new cycle.
      const nextRoute = isHortiMode
        ? "/resume-setup"
        : "/activity-crop";
      Alert.alert(
        "Saved",
        `Your ${currentCrop.cropName} (${selectedVariety.varietyName}) is now being tracked.`,
        [{ text: "OK", onPress: () => router.replace(nextRoute as any) }]
      );
    } catch (e: any) {
      Alert.alert(
        "Save failed",
        e?.message || "Could not save your crop. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────

  const primaryLabel = selectedSubtype
    ? SUBTYPE_PRIMARY_LABEL[selectedSubtype]
    : "";

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.headerEmoji}>{isHortiMode ? "🥭" : "🌱"}</Text>
        <Text style={styles.headerTitle}>
          {isHortiMode ? "Plant a new horti crop" : "Plant a new crop"}
        </Text>
        <Text style={styles.headerHi}>
          {isHortiMode ? "नई बागवानी फसल लगाएं" : "नई फसल लगाएं"}
        </Text>
      </View>

      {/* Sub-crop picker */}
      <Text style={styles.sectionLabel}>
        {isHortiMode ? "Which type?" : "Which crop?"}
      </Text>
      <View style={styles.cropGrid}>
        {subtypeOptions.map((s) => {
          const active = selectedSubtype === s.code;
          return (
            <TouchableOpacity
              key={s.code}
              style={[styles.cropCard, active && styles.cropCardActive]}
              onPress={() => setSelectedSubtype(s.code)}
              activeOpacity={0.85}
            >
              <Text style={styles.cropIcon}>{s.icon}</Text>
              <Text style={[styles.cropLabel, active && styles.cropLabelActive]}>
                {s.labelEn}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!!primaryLabel && (
        <Text style={styles.primaryHint}>{primaryLabel}</Text>
      )}

      {/* Variety picker */}
      {selectedSubtype && (
        <>
          <Text style={styles.sectionLabel}>
            Which variety?{" "}
            {varieties.length > 0 && `(${varieties.length} available)`}
          </Text>
          {loadingVarieties ? (
            <ActivityIndicator color="#2e7d32" style={{ marginVertical: 14 }} />
          ) : varieties.length === 0 ? (
            <View style={styles.emptyVar}>
              <Text style={styles.emptyVarText}>
                No varieties pre-loaded for this crop yet.
              </Text>
            </View>
          ) : (
            <View style={styles.varList}>
              {varieties.map((v) => {
                const active = selectedVariety?.varietyId === v.varietyId;
                const dur =
                  v.durationMin && v.durationMax
                    ? `${v.durationMin}–${v.durationMax}d`
                    : null;
                return (
                  <TouchableOpacity
                    key={v.varietyId}
                    style={[styles.varRow, active && styles.varRowActive]}
                    onPress={() => setSelectedVariety(v)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[styles.radio, active && styles.radioActive]}
                    >
                      {active && <View style={styles.radioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.varName, active && styles.varNameActive]}
                      >
                        {v.varietyName}
                        {v.isHybrid && (
                          <Text style={styles.varHybridTag}>  Hybrid</Text>
                        )}
                      </Text>
                      {(dur || v.expectedYield) && (
                        <Text style={styles.varMeta}>
                          {dur && `${dur}`}
                          {dur && v.expectedYield && "  •  "}
                          {v.expectedYield && `~${(v.expectedYield / 1000).toFixed(1)} t/ha`}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}

      <TouchableOpacity
        style={[
          styles.submitBtn,
          (!selectedVariety || submitting) && { opacity: 0.5 },
        ]}
        onPress={submit}
        disabled={!selectedVariety || submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Save & start tracking →</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} disabled={submitting}>
        <Text style={styles.cancelLink}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 48 },

  headerCard: { backgroundColor: "#1b5e20", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 16 },
  headerEmoji: { fontSize: 36, marginBottom: 4 },
  headerTitle: { color: "#fff", fontSize: 19, fontWeight: "800" },
  headerHi: { color: "#a5d6a7", fontSize: 13, marginTop: 4 },

  sectionLabel: { fontSize: 14, fontWeight: "800", color: "#333", marginTop: 14, marginBottom: 8 },

  cropGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cropCard: { backgroundColor: "#fff", borderWidth: 2, borderColor: "#cfd8dc", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 140 },
  cropCardActive: { backgroundColor: "#e8f5e9", borderColor: "#2e7d32" },
  cropIcon: { fontSize: 22 },
  cropLabel: { fontSize: 14, fontWeight: "700", color: "#555" },
  cropLabelActive: { color: "#1b5e20" },

  primaryHint: { fontSize: 11, color: "#888", fontStyle: "italic", marginTop: 6 },

  varList: { backgroundColor: "#fff", borderRadius: 14, padding: 4 },
  varRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12, borderRadius: 10 },
  varRowActive: { backgroundColor: "#e8f5e9" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#cfd8dc", justifyContent: "center", alignItems: "center" },
  radioActive: { borderColor: "#2e7d32" },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#2e7d32" },
  varName: { fontSize: 14, fontWeight: "700", color: "#333" },
  varNameActive: { color: "#1b5e20" },
  varHybridTag: { fontSize: 10, fontWeight: "800", color: "#e65100" },
  varMeta: { fontSize: 11, color: "#888", marginTop: 2 },

  emptyVar: { backgroundColor: "#fff3e0", borderRadius: 12, padding: 14 },
  emptyVarText: { fontSize: 12, color: "#e65100", lineHeight: 17 },

  submitBtn: { backgroundColor: "#1b5e20", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 24 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  cancelLink: { textAlign: "center", color: "#888", fontSize: 13, marginTop: 14, textDecorationLine: "underline" },
});
