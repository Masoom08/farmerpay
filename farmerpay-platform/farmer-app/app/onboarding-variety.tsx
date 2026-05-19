/**
 * Onboarding — Pick your variety (SAGE Phase 2A)
 *
 * Loops through the sub-crops the farmer picked on `onboarding-crops.tsx`,
 * one at a time. For each sub-crop:
 *   1. Resolve sub-crop → crop_code via SUBTYPE_TO_CROP_CODE
 *   2. Fetch GET /roots/crops and find the cropId
 *   3. Fetch GET /roots/varieties?cropId=<id>
 *   4. Show 5 radio options
 *   5. On Save & next → POST /roots/cycles → advance to next sub-crop
 *
 * Minimal data entry: variety is the ONLY input. Sowing date defaults to
 * today, season auto-derived, no insurance, no policy. Insurance belongs
 * in DICE (see plan non-goals).
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { SUBTYPE_TO_CROP_CODE, SUBTYPE_PRIMARY_LABEL } from "../lib/subtypeCropMapping";

// ─── Types ────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10);

const seasonForDate = (iso: string): "kharif" | "rabi" | "summer" => {
  const m = new Date(iso).getMonth() + 1;
  if (m >= 6 && m <= 10) return "kharif";
  if (m >= 11 || m <= 3) return "rabi";
  return "summer";
};

const subtypeLabel = (code: string) => {
  const s = ACTIVITY_SUBTYPE_CATALOG.CROP.subtypes.find((x) => x.code === code);
  return s?.labelEn || code;
};

const subtypeIcon = (code: string) => {
  const s = ACTIVITY_SUBTYPE_CATALOG.CROP.subtypes.find((x) => x.code === code);
  return s?.icon || "🌱";
};

// ─── Component ────────────────────────────────────────────────────────

export default function OnboardingVarietyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ codes?: string }>();

  // Memoize so the array reference is stable across renders — otherwise
  // useCallback dependencies churn and the useEffect fires in a loop.
  const codesString = (params.codes || "") as string;
  const codes = useMemo(
    () => codesString.split(",").map((s) => s.trim()).filter(Boolean),
    [codesString]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [cropsCache, setCropsCache] = useState<Crop[] | null>(null);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [selectedVariety, setSelectedVariety] = useState<Variety | null>(null);
  const [currentCrop, setCurrentCrop] = useState<Crop | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const cropsFetchedRef = useRef(false);

  // If no codes in query, bail out to the Farm tab
  useEffect(() => {
    if (codes.length === 0) {
      router.replace("/sage" as any);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the crop catalog once
  useEffect(() => {
    if (cropsFetchedRef.current) return;
    cropsFetchedRef.current = true;
    (async () => {
      try {
        const r = await apiGet("/roots/crops");
        if (r?.success && Array.isArray(r.data)) {
          setCropsCache(r.data);
        } else {
          setCropsCache([]);
        }
      } catch {
        setCropsCache([]);
      }
    })();
  }, []);

  // Resolve the current sub-crop's crop_code → cropId from the cache.
  // Uses primitive deps (codesString + currentIndex + cropsCache identity)
  // so this effect only fires when the sub-crop actually changes.
  const currentSubtype = codes[currentIndex];
  useEffect(() => {
    if (!cropsCache || !currentSubtype) return;
    const cropCode = SUBTYPE_TO_CROP_CODE[currentSubtype];
    if (!cropCode) {
      // Sub-crop not yet wired — auto-advance
      const next = currentIndex + 1;
      if (next >= codes.length) router.replace("/sage" as any);
      else setCurrentIndex(next);
      return;
    }
    const crop = cropsCache.find((c) => c.cropCode === cropCode) || null;
    setCurrentCrop(crop);
    setSelectedVariety(null);

    if (!crop) {
      setVarieties([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await apiGet(
          `/roots/varieties?cropId=${encodeURIComponent(crop.cropId)}`
        );
        if (cancelled) return;
        if (r?.success && Array.isArray(r.data)) {
          setVarieties(r.data);
        } else {
          setVarieties([]);
        }
      } catch {
        if (!cancelled) setVarieties([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSubtype, cropsCache]);

  const advanceIndex = () => {
    const next = currentIndex + 1;
    if (next >= codes.length) {
      router.replace("/sage" as any);
    } else {
      setCurrentIndex(next);
    }
  };

  const submit = async () => {
    if (!selectedVariety || !currentCrop) return;
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
      advanceIndex();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => advanceIndex();

  // ─── Render ──────────────────────────────────────────────────────────

  const primaryLabel = SUBTYPE_PRIMARY_LABEL[currentSubtype];
  const progressText = `Crop ${currentIndex + 1} of ${codes.length}`;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.headerEmoji}>{subtypeIcon(currentSubtype)}</Text>
        <Text style={styles.headerTitle}>
          Your {subtypeLabel(currentSubtype)} variety
        </Text>
        {!!primaryLabel && (
          <Text style={styles.headerPrimary}>{primaryLabel}</Text>
        )}
        <Text style={styles.headerProgress}>{progressText}</Text>
      </View>

      {loading ? (
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator color="#2e7d32" />
        </View>
      ) : varieties.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No varieties pre-loaded for this crop yet. Skipping.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={advanceIndex}>
            <Text style={styles.emptyBtnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Pick your variety</Text>
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
                  <View style={[styles.radio, active && styles.radioActive]}>
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

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (!selectedVariety || submitting) && { opacity: 0.5 },
            ]}
            onPress={submit}
            disabled={!selectedVariety || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {currentIndex + 1 === codes.length
                  ? "Save & finish →"
                  : "Save & next →"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={skip} disabled={submitting}>
            <Text style={styles.skipLink}>Skip this crop</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 48 },

  headerCard: { backgroundColor: "#1b5e20", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 16 },
  headerEmoji: { fontSize: 36, marginBottom: 4 },
  headerTitle: { color: "#fff", fontSize: 19, fontWeight: "800" },
  headerPrimary: { color: "#c8e6c9", fontSize: 12, marginTop: 4, fontStyle: "italic" },
  headerProgress: { color: "#a5d6a7", fontSize: 11, marginTop: 6, fontWeight: "700", letterSpacing: 1 },

  sectionLabel: { fontSize: 13, fontWeight: "800", color: "#555", marginBottom: 10 },

  varList: { backgroundColor: "#fff", borderRadius: 14, padding: 4, marginBottom: 20 },
  varRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderRadius: 10 },
  varRowActive: { backgroundColor: "#e8f5e9" },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#cfd8dc", justifyContent: "center", alignItems: "center" },
  radioActive: { borderColor: "#2e7d32" },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#2e7d32" },
  varName: { fontSize: 15, fontWeight: "700", color: "#333" },
  varNameActive: { color: "#1b5e20" },
  varHybridTag: { fontSize: 10, fontWeight: "800", color: "#e65100" },
  varMeta: { fontSize: 11, color: "#888", marginTop: 2 },

  primaryBtn: { backgroundColor: "#1b5e20", borderRadius: 14, padding: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  skipLink: { textAlign: "center", color: "#888", fontSize: 13, marginTop: 14, textDecorationLine: "underline" },

  emptyCard: { backgroundColor: "#fff3e0", borderRadius: 14, padding: 20, alignItems: "center" },
  emptyText: { fontSize: 13, color: "#e65100", textAlign: "center", marginBottom: 14 },
  emptyBtn: { backgroundColor: "#e65100", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  emptyBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
