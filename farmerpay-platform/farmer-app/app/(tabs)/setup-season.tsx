/**
 * Season-Start Setup Wizard — 4-step guided flow
 *
 * Step 1: Crop & Variety Selection
 * Step 2: Field Selection
 * Step 3: Soil Health Card (OCR capture)
 * Step 4: Confirm & Start Season
 *
 * Design: large touch targets (48px+), bilingual Hindi/English,
 * progress dots, scrollable cards, offline-capable.
 */

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { apiGet, apiPost, apiPut } from "../../lib/api";
import { extractTextFromImage } from "../../lib/ocrService";

let ImagePicker: any = null;
try {
  ImagePicker = require("expo-image-picker");
} catch {}

/* ─── Types ─── */

type Crop = { code: string; labelEn: string; labelHi: string; icon: string; cropId?: string };
type Variety = { id: string; nameEn: string; nameHi?: string };
type Field = { fieldId: number; fieldUuid: string; fieldName: string; fieldSizeHectares: number };
type SoilData = {
  nitrogen?: number; phosphorus?: number; potassium?: number;
  ph?: number; ec?: number; oc?: number;
  [key: string]: any;
};
type Classification = { [key: string]: string | number };

const STEPS = [
  { labelEn: "Crop", labelHi: "फसल" },
  { labelEn: "Field", labelHi: "खेत" },
  { labelEn: "Soil", labelHi: "मिट्टी" },
  { labelEn: "Confirm", labelHi: "पुष्टि" },
];

/* ─── Component ─── */

export default function SetupSeasonScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);

  // Step 1: Crop
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [selectedVariety, setSelectedVariety] = useState<Variety | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Step 2: Field
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);

  // Step 3: Soil
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [soilClassifications, setSoilClassifications] = useState<Classification | null>(null);
  const [soilConfidence, setSoilConfidence] = useState<Record<string, number>>({});
  const [existingSoilRecord, setExistingSoilRecord] = useState<any>(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [soilEditing, setSoilEditing] = useState(false);
  const [soilRecordId, setSoilRecordId] = useState<number | null>(null);

  // Step 4: Submit
  const [submitting, setSubmitting] = useState(false);

  const fetchedRef = useRef(false);

  /* ─── Load initial data ─── */

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const [subsRes, fieldsRes] = await Promise.all([
          apiGet("/farmer/activity-subscriptions"),
          apiGet("/roots/farms"),
        ]);

        // Extract crop subscriptions
        const subs = subsRes?.data || [];
        const cropSubs = subs
          .filter((s: any) => s.activityType === "CROP" && s.subtypes?.length)
          .flatMap((s: any) =>
            s.subtypes.map((st: any) => ({
              code: st.code,
              labelEn: st.labelEn || st.code,
              labelHi: st.labelHi || "",
              icon: st.icon || "🌾",
              cropId: st.cropId || null,
            }))
          );
        setCrops(cropSubs);

        // Extract fields from farm registers
        const farms = fieldsRes?.data || [];
        const allFields = farms.flatMap((f: any) =>
          (f.fields || []).map((fld: any) => ({
            fieldId: fld.fieldId || fld.id,
            fieldUuid: fld.fieldUuid,
            fieldName: fld.fieldName,
            fieldSizeHectares: fld.fieldSizeHectares || fld.fieldSize || 0,
          }))
        );
        setFields(allFields);
      } catch (e: any) {
        Alert.alert("Error", "Could not load data. Please check your connection.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ─── Step 1: Fetch varieties when crop is selected ─── */

  useEffect(() => {
    if (!selectedCrop?.cropId) { setVarieties([]); return; }

    (async () => {
      try {
        const r = await apiGet(`/roots/crops/${selectedCrop.cropId}/varieties`);
        setVarieties(
          (r?.data || []).map((v: any) => ({ id: v.varietyId || v.id, nameEn: v.varietyName || v.nameEn, nameHi: v.nameHi || "" }))
        );
      } catch {
        setVarieties([]);
      }
    })();
  }, [selectedCrop]);

  /* ─── Step 2: Check existing soil record when field selected ─── */

  useEffect(() => {
    if (!selectedField) { setExistingSoilRecord(null); return; }

    (async () => {
      try {
        const r = await apiGet(`/roots/fields/${selectedField.fieldId}/soil-health`);
        if (r?.data) setExistingSoilRecord(r.data);
        else setExistingSoilRecord(null);
      } catch {
        setExistingSoilRecord(null);
      }
    })();
  }, [selectedField]);

  /* ─── Soil Health Card OCR ─── */

  const handleTakePhoto = async () => {
    if (!ImagePicker) {
      Alert.alert("Camera not available", "Image picker is not installed on this device.");
      return;
    }

    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Camera access is required to scan your Soil Health Card.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setOcrProcessing(true);
      const imageUri = result.assets[0].uri;

      // Run local OCR for quick preview
      let ocrText = "";
      try {
        ocrText = await extractTextFromImage(imageUri, "eng");
      } catch {
        ocrText = "";
      }

      // Send to backend for structured extraction
      try {
        const r = await apiPost("/roots/soil-health", {
          fieldId: selectedField?.fieldId,
          ocrText,
          imageUrl: imageUri,
        });

        if (r?.data) {
          setSoilData(r.data.extractedValues || {});
          setSoilClassifications(r.data.classifications || {});
          setSoilConfidence(r.data.confidenceScores || {});
          if (r.data.record?.recordId) setSoilRecordId(r.data.record.recordId);
        }
      } catch (e: any) {
        Alert.alert("OCR Error", "Could not process image. You can enter values manually.");
      }
    } catch (e: any) {
      Alert.alert("Camera Error", e?.message || "Could not open camera.");
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleUseExistingSoil = () => {
    if (!existingSoilRecord) return;
    setSoilData({
      nitrogen: existingSoilRecord.nitrogen,
      phosphorus: existingSoilRecord.phosphorus,
      potassium: existingSoilRecord.potassium,
      ph: existingSoilRecord.ph,
      oc: existingSoilRecord.organicCarbon,
      ec: existingSoilRecord.ec,
    });
    setSoilClassifications(existingSoilRecord.classifications || {});
    setSoilRecordId(existingSoilRecord.recordId);
  };

  const handleSoilCorrection = async () => {
    if (!soilRecordId || !soilData) return;
    try {
      const r = await apiPut(`/roots/soil-health/${soilRecordId}/verify`, {
        corrections: soilData,
      });
      if (r?.data?.classifications) setSoilClassifications(r.data.classifications);
      setSoilEditing(false);
      Alert.alert("Updated / अपडेट हो गया", "Soil values saved successfully.");
    } catch {
      Alert.alert("Error", "Could not save corrections.");
    }
  };

  /* ─── Step 4: Create cycle ─── */

  const handleStartSeason = async () => {
    if (!selectedCrop || !selectedField) return;
    setSubmitting(true);

    try {
      const season = getCurrentSeason();
      const r = await apiPost("/roots/cycles", {
        fieldId: selectedField.fieldId,
        cropId: selectedCrop.cropId || selectedCrop.code,
        varietyId: selectedVariety?.id || null,
        season,
        sowingDate: new Date().toISOString().slice(0, 10),
      });

      if (!r?.success) throw new Error(r?.message || "Could not start season");

      const cycleId = r.data?.cycleId || r.data?.cycleUuid;
      Alert.alert(
        "Season Started! / सीजन शुरू! 🎉",
        `${selectedCrop.labelEn} cycle created for ${selectedField.fieldName}.`,
        [{ text: "Go to Cycle →", onPress: () => router.replace(`/cycle-detail?cycleId=${cycleId}` as any) }]
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not create cycle. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrentSeason = () => {
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 10) return "kharif";
    if (month >= 11 || month <= 2) return "rabi";
    return "summer";
  };

  /* ─── Navigation ─── */

  const canAdvance = () => {
    if (step === 0) return !!selectedCrop;
    if (step === 1) return !!selectedField;
    if (step === 2) return true; // soil is optional
    return true;
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else handleStartSeason();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  /* ─── Helpers ─── */

  const hectaresToAcres = (h: number) => (h * 2.471).toFixed(2);

  const statusColor = (status: string | undefined) => {
    if (!status) return "#888";
    const s = status.toUpperCase();
    if (s === "LOW" || s === "ACIDIC") return "#c62828";
    if (s === "HIGH" || s === "ALKALINE") return "#e65100";
    return "#2e7d32";
  };

  const statusLabel = (status: string | undefined) => {
    if (!status) return "";
    const map: Record<string, string> = {
      LOW: "Low / कम", MEDIUM: "Good / ठीक", HIGH: "High / ज़्यादा",
      ACIDIC: "Acidic / अम्लीय", NEUTRAL: "Normal / सामान्य", ALKALINE: "Alkaline / क्षारीय",
    };
    return map[status.toUpperCase()] || status;
  };

  /* ─── Render ─── */

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1b5e20" />
        <Text style={styles.loadingText}>Loading... / लोड हो रहा है...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* ─── Progress Dots ─── */}
      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <TouchableOpacity key={i} style={styles.progressItem} onPress={() => i < step && setStep(i)}>
            <View style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
            <Text style={[styles.dotLabel, i === step && styles.dotLabelActive]}>{s.labelEn}</Text>
            <Text style={styles.dotLabelHi}>{s.labelHi}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══════════════ STEP 1: Crop Selection ═══════════════ */}
      {step === 0 && (
        <View>
          <Text style={styles.stepTitle}>Select Crop / फसल चुनें 🌾</Text>

          {/* Search */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search crop / फसल खोजें"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Crop cards */}
          {crops
            .filter((c) => !searchQuery || c.labelEn.toLowerCase().includes(searchQuery.toLowerCase()) || c.labelHi.includes(searchQuery))
            .map((crop) => (
              <TouchableOpacity
                key={crop.code}
                style={[styles.selectCard, selectedCrop?.code === crop.code && styles.selectCardActive]}
                onPress={() => { setSelectedCrop(crop); setSelectedVariety(null); }}
                activeOpacity={0.7}
              >
                <Text style={styles.selectIcon}>{crop.icon}</Text>
                <View style={styles.selectTextWrap}>
                  <Text style={styles.selectLabel}>{crop.labelEn}</Text>
                  <Text style={styles.selectLabelHi}>{crop.labelHi}</Text>
                </View>
                {selectedCrop?.code === crop.code && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}

          {/* Variety selection */}
          {selectedCrop && varieties.length > 0 && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Select Variety / किस्म चुनें</Text>
              {varieties.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.selectCard, selectedVariety?.id === v.id && styles.selectCardActive]}
                  onPress={() => setSelectedVariety(v)}
                  activeOpacity={0.7}
                >
                  <View style={styles.selectTextWrap}>
                    <Text style={styles.selectLabel}>{v.nameEn}</Text>
                    {v.nameHi ? <Text style={styles.selectLabelHi}>{v.nameHi}</Text> : null}
                  </View>
                  {selectedVariety?.id === v.id && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ═══════════════ STEP 2: Field Selection ═══════════════ */}
      {step === 1 && (
        <View>
          <Text style={styles.stepTitle}>Select Field / खेत चुनें 🌿</Text>

          {fields.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No fields registered yet / अभी कोई खेत नहीं</Text>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push("/farm" as any)}
              >
                <Text style={styles.secondaryBtnText}>Register Field / खेत जोड़ें →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            fields.map((f) => (
              <TouchableOpacity
                key={f.fieldId}
                style={[styles.selectCard, selectedField?.fieldId === f.fieldId && styles.selectCardActive]}
                onPress={() => setSelectedField(f)}
                activeOpacity={0.7}
              >
                <Text style={styles.selectIcon}>🌿</Text>
                <View style={styles.selectTextWrap}>
                  <Text style={styles.selectLabel}>{f.fieldName}</Text>
                  <Text style={styles.selectLabelHi}>
                    {hectaresToAcres(f.fieldSizeHectares)} acres / {f.fieldSizeHectares} हेक्टेयर
                  </Text>
                </View>
                {selectedField?.fieldId === f.fieldId && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* ═══════════════ STEP 3: Soil Health Card ═══════════════ */}
      {step === 2 && (
        <View>
          <Text style={styles.stepTitle}>Soil Health Card / मिट्टी जाँच कार्ड 🧪</Text>

          {/* Value proposition */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Why Soil Health Card? / क्यों ज़रूरी है?</Text>
            <Text style={styles.infoText}>
              A Soil Health Card helps us give you EXACT fertilizer recommendations for YOUR field.
            </Text>
            <Text style={styles.infoTextHi}>
              मिट्टी जाँच कार्ड से हम आपके खेत के लिए सटीक खाद की सिफारिश दे सकते हैं।
            </Text>
          </View>

          {/* Existing record */}
          {existingSoilRecord && !soilData && (
            <View style={styles.existingSoilCard}>
              <Text style={styles.existingSoilTitle}>
                📋 Existing data from {existingSoilRecord.testDate}
              </Text>
              <Text style={styles.existingSoilHi}>
                {existingSoilRecord.testDate} की मिट्टी जाँच उपलब्ध है
              </Text>
              <View style={styles.existingSoilBtns}>
                <TouchableOpacity style={styles.keepBtn} onPress={handleUseExistingSoil}>
                  <Text style={styles.keepBtnText}>Keep / रखें ✓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.newPhotoBtn} onPress={handleTakePhoto}>
                  <Text style={styles.newPhotoBtnText}>New Photo / नई फोटो 📷</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Camera button */}
          {!soilData && !existingSoilRecord && (
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={handleTakePhoto}
              disabled={ocrProcessing}
              activeOpacity={0.7}
            >
              {ocrProcessing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.cameraBtnText}>📷  Take Photo of Soil Health Card</Text>
              )}
              <Text style={styles.cameraBtnHi}>मिट्टी जाँच कार्ड की फोटो लें</Text>
            </TouchableOpacity>
          )}

          {/* Extracted values */}
          {soilData && Object.keys(soilData).length > 0 && (
            <View style={styles.soilResultsCard}>
              <Text style={styles.soilResultsTitle}>Extracted Values / निकाले गए मान</Text>

              {renderSoilRow("Nitrogen (N)", "नाइट्रोजन", soilData.nitrogen, "kg/ha", soilClassifications?.n_status as string, soilEditing, (v) => setSoilData({ ...soilData, nitrogen: v }))}
              {renderSoilRow("Phosphorus (P)", "फॉस्फोरस", soilData.phosphorus, "kg/ha", soilClassifications?.p_status as string, soilEditing, (v) => setSoilData({ ...soilData, phosphorus: v }))}
              {renderSoilRow("Potassium (K)", "पोटेशियम", soilData.potassium, "kg/ha", soilClassifications?.k_status as string, soilEditing, (v) => setSoilData({ ...soilData, potassium: v }))}
              {renderSoilRow("pH", "पी.एच.", soilData.ph, "", soilClassifications?.ph_status as string, soilEditing, (v) => setSoilData({ ...soilData, ph: v }))}
              {renderSoilRow("Organic Carbon", "जैविक कार्बन", soilData.oc, "%", soilClassifications?.oc_status as string, soilEditing, (v) => setSoilData({ ...soilData, oc: v }))}

              {/* What it means */}
              {soilClassifications && (
                <View style={styles.soilMeaning}>
                  {soilClassifications.n_status === "LOW" && (
                    <Text style={styles.soilMeaningText}>
                      ⬆️ Your soil is low in Nitrogen — we'll recommend 20% more urea
                    </Text>
                  )}
                  {soilClassifications.p_status === "LOW" && (
                    <Text style={styles.soilMeaningText}>
                      ⬆️ Low Phosphorus — we'll recommend 25% more SSP/DAP
                    </Text>
                  )}
                  {soilClassifications.ph_status === "ACIDIC" && (
                    <Text style={styles.soilMeaningText}>
                      🧪 Acidic soil — we'll recommend lime application
                    </Text>
                  )}
                  {soilClassifications.oc_status === "LOW" && (
                    <Text style={styles.soilMeaningText}>
                      🌿 Low organic carbon — we'll recommend more FYM/compost
                    </Text>
                  )}
                </View>
              )}

              {/* Action buttons */}
              {!soilEditing ? (
                <View style={styles.soilActionRow}>
                  <TouchableOpacity style={styles.confirmBtn} onPress={() => setStep(3)}>
                    <Text style={styles.confirmBtnText}>Looks correct ✅</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editBtn} onPress={() => setSoilEditing(true)}>
                    <Text style={styles.editBtnText}>Edit values ✏️</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.saveBtn} onPress={handleSoilCorrection}>
                  <Text style={styles.saveBtnText}>Save Corrections / सुधार सहेजें ✓</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Skip */}
          <TouchableOpacity style={styles.skipBtn} onPress={() => setStep(3)}>
            <Text style={styles.skipBtnText}>Don't have one? Skip for now →</Text>
            <Text style={styles.skipBtnHi}>कार्ड नहीं है? अभी छोड़ें →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ═══════════════ STEP 4: Confirm & Start ═══════════════ */}
      {step === 3 && (
        <View>
          <Text style={styles.stepTitle}>Confirm & Start / पुष्टि करें 🚀</Text>

          <View style={styles.summaryCard}>
            <SummaryRow icon="🌾" labelEn="Crop" labelHi="फसल" value={`${selectedCrop?.labelEn || "-"} ${selectedVariety ? `(${selectedVariety.nameEn})` : ""}`} />
            <SummaryRow icon="🌿" labelEn="Field" labelHi="खेत" value={selectedField ? `${selectedField.fieldName} — ${hectaresToAcres(selectedField.fieldSizeHectares)} acres` : "-"} />
            <SummaryRow icon="🧪" labelEn="Soil Data" labelHi="मिट्टी" value={soilData ? "Applied ✓ / लागू ✓" : "Not provided / नहीं दिया"} />
            <SummaryRow icon="📅" labelEn="Season" labelHi="सीजन" value={getCurrentSeason().charAt(0).toUpperCase() + getCurrentSeason().slice(1)} />
          </View>

          {soilData && soilClassifications && (
            <View style={styles.adjustmentCard}>
              <Text style={styles.adjustmentTitle}>🧪 Soil-based adjustments will be applied</Text>
              <Text style={styles.adjustmentHi}>मिट्टी के आधार पर खाद की मात्रा में बदलाव किया जाएगा</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.startBtn, submitting && styles.startBtnDisabled]}
            onPress={handleStartSeason}
            disabled={submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.startBtnText}>🌱 Start Season / सीजन शुरू करें</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Navigation Buttons ─── */}
      {step < 3 && (
        <View style={styles.navRow}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Text style={styles.backBtnText}>← Back / पीछे</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canAdvance()}
          >
            <Text style={styles.nextBtnText}>
              {step === 2 ? "Next / आगे →" : "Next / आगे →"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  /* ─── Sub-render: Soil value row ─── */

  function renderSoilRow(
    labelEn: string, labelHi: string,
    value: number | undefined, unit: string,
    status: string | undefined,
    editing: boolean,
    onChange: (v: number) => void,
  ) {
    if (value === undefined && !editing) return null;

    return (
      <View style={styles.soilRow} key={labelEn}>
        <View style={styles.soilRowLeft}>
          <Text style={styles.soilRowLabel}>{labelEn}</Text>
          <Text style={styles.soilRowLabelHi}>{labelHi}</Text>
        </View>
        {editing ? (
          <TextInput
            style={styles.soilRowInput}
            keyboardType="numeric"
            value={value !== undefined ? String(value) : ""}
            onChangeText={(t) => { const n = parseFloat(t); if (!isNaN(n)) onChange(n); }}
            placeholder="—"
          />
        ) : (
          <Text style={styles.soilRowValue}>{value ?? "—"} {unit}</Text>
        )}
        {status && (
          <View style={[styles.statusBadge, { backgroundColor: statusColor(status) + "22" }]}>
            <Text style={[styles.statusText, { color: statusColor(status) }]}>{statusLabel(status)}</Text>
          </View>
        )}
      </View>
    );
  }
}

/* ─── Summary Row ─── */

function SummaryRow({ icon, labelEn, labelHi, value }: { icon: string; labelEn: string; labelHi: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <View style={styles.summaryTextWrap}>
        <Text style={styles.summaryLabel}>{labelEn} / {labelHi}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    </View>
  );
}

/* ═══════════════ Styles ═══════════════ */

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 64 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  loadingText: { marginTop: 12, color: "#888", fontSize: 14 },

  // Progress
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, paddingHorizontal: 8 },
  progressItem: { alignItems: "center", flex: 1 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#cfd8dc", marginBottom: 4 },
  dotActive: { backgroundColor: "#1b5e20", width: 18, height: 18, borderRadius: 9 },
  dotDone: { backgroundColor: "#2e7d32" },
  dotLabel: { fontSize: 11, color: "#888", fontWeight: "600" },
  dotLabelActive: { color: "#1b5e20", fontWeight: "800" },
  dotLabelHi: { fontSize: 9, color: "#aaa" },

  // Step title
  stepTitle: { fontSize: 22, fontWeight: "800", color: "#1b5e20", marginBottom: 16 },

  // Selection cards
  selectCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 2,
    borderColor: "#e0e0e0", elevation: 1,
    minHeight: 56,
  },
  selectCardActive: { borderColor: "#2e7d32", backgroundColor: "#e8f5e9" },
  selectIcon: { fontSize: 28, marginRight: 14 },
  selectTextWrap: { flex: 1 },
  selectLabel: { fontSize: 16, fontWeight: "700", color: "#333" },
  selectLabelHi: { fontSize: 13, color: "#666", marginTop: 2 },
  checkmark: { fontSize: 22, color: "#2e7d32", fontWeight: "800" },

  // Search
  searchInput: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, fontSize: 15,
    borderWidth: 1, borderColor: "#cfd8dc", marginBottom: 14, color: "#333",
  },

  // Subsection
  subsection: { marginTop: 16 },
  subsectionTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 10 },

  // Empty state
  emptyCard: { backgroundColor: "#fff", borderRadius: 14, padding: 24, alignItems: "center" },
  emptyText: { fontSize: 15, color: "#888", marginBottom: 14, textAlign: "center" },

  // Info card
  infoCard: { backgroundColor: "#e8f5e9", borderRadius: 14, padding: 16, marginBottom: 16 },
  infoTitle: { fontSize: 16, fontWeight: "800", color: "#1b5e20", marginBottom: 6 },
  infoText: { fontSize: 14, color: "#333", lineHeight: 20 },
  infoTextHi: { fontSize: 13, color: "#555", marginTop: 4, lineHeight: 19 },

  // Existing soil
  existingSoilCard: { backgroundColor: "#fff3e0", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#ffe0b2" },
  existingSoilTitle: { fontSize: 15, fontWeight: "700", color: "#e65100" },
  existingSoilHi: { fontSize: 13, color: "#888", marginTop: 2, marginBottom: 12 },
  existingSoilBtns: { flexDirection: "row", gap: 10 },
  keepBtn: { flex: 1, backgroundColor: "#2e7d32", borderRadius: 12, padding: 14, alignItems: "center" },
  keepBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  newPhotoBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#cfd8dc" },
  newPhotoBtnText: { color: "#333", fontSize: 14, fontWeight: "700" },

  // Camera
  cameraBtn: {
    backgroundColor: "#1b5e20", borderRadius: 14, padding: 20, alignItems: "center",
    marginBottom: 16, minHeight: 64,
  },
  cameraBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  cameraBtnHi: { color: "#a5d6a7", fontSize: 13, marginTop: 4 },

  // Soil results
  soilResultsCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 16, elevation: 1 },
  soilResultsTitle: { fontSize: 16, fontWeight: "800", color: "#333", marginBottom: 12 },
  soilRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  soilRowLeft: { flex: 1 },
  soilRowLabel: { fontSize: 14, fontWeight: "600", color: "#333" },
  soilRowLabelHi: { fontSize: 11, color: "#888" },
  soilRowValue: { fontSize: 15, fontWeight: "700", color: "#333", marginRight: 10 },
  soilRowInput: {
    width: 80, borderWidth: 1, borderColor: "#cfd8dc", borderRadius: 8,
    padding: 8, fontSize: 14, textAlign: "center", marginRight: 10, color: "#333",
  },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: "700" },

  // Soil meaning
  soilMeaning: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  soilMeaningText: { fontSize: 13, color: "#555", marginBottom: 4, lineHeight: 18 },

  // Soil action buttons
  soilActionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  confirmBtn: { flex: 1, backgroundColor: "#2e7d32", borderRadius: 12, padding: 14, alignItems: "center" },
  confirmBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  editBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#cfd8dc" },
  editBtnText: { color: "#333", fontSize: 14, fontWeight: "700" },
  saveBtn: { backgroundColor: "#1b5e20", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 14 },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Skip
  skipBtn: { alignItems: "center", paddingVertical: 16 },
  skipBtnText: { fontSize: 14, color: "#888" },
  skipBtnHi: { fontSize: 12, color: "#aaa", marginTop: 2 },

  // Summary
  summaryCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 16, elevation: 1 },
  summaryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  summaryIcon: { fontSize: 24, marginRight: 14 },
  summaryTextWrap: { flex: 1 },
  summaryLabel: { fontSize: 13, color: "#888" },
  summaryValue: { fontSize: 16, fontWeight: "700", color: "#333", marginTop: 2 },

  // Adjustment
  adjustmentCard: { backgroundColor: "#e8f5e9", borderRadius: 14, padding: 14, marginBottom: 16 },
  adjustmentTitle: { fontSize: 14, fontWeight: "700", color: "#2e7d32" },
  adjustmentHi: { fontSize: 12, color: "#555", marginTop: 2 },

  // Nav buttons
  navRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, gap: 12 },
  backBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#cfd8dc" },
  backBtnText: { color: "#333", fontSize: 15, fontWeight: "700" },
  nextBtn: { flex: 2, backgroundColor: "#1b5e20", borderRadius: 14, padding: 16, alignItems: "center", minHeight: 52 },
  nextBtnDisabled: { backgroundColor: "#a5d6a7" },
  nextBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // Start button
  startBtn: { backgroundColor: "#1b5e20", borderRadius: 14, padding: 20, alignItems: "center", minHeight: 60 },
  startBtnDisabled: { backgroundColor: "#a5d6a7" },
  startBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },

  // Secondary
  secondaryBtn: { backgroundColor: "#2e7d32", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8 },
  secondaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
