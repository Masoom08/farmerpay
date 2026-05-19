import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { apiGet, apiPost } from "../lib/api";
import * as ImagePicker from "expo-image-picker";
import { extractTextFromImage, parseSoilHealthCard } from "../lib/ocrService";
import VoiceInputButton from "../components/VoiceInputButton";

// ─── Types ─────────────────────────────────────────────────────────

interface SoilParameter {
  name: string;
  value: number;
  unit: string;
  status: "low" | "medium" | "high";
}

interface Advisory {
  parameter: string;
  status: "low" | "medium" | "high";
  severity: "critical" | "high" | "medium" | "low";
  adviceEn: string;
  adviceHi: string;
}

interface SoilHealthSummary {
  hasData: boolean;
  testDate?: string;
  labName?: string;
  healthScore?: number;
  classification?: "Healthy" | "Moderate" | "Poor";
  parameters?: SoilParameter[];
  advisories?: Advisory[];
}

interface FormData {
  ph: string;
  organicCarbon: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  sulphur: string;
  boron: string;
  iron: string;
  labName: string;
  testDate: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function scoreColor(score: number): string {
  if (score >= 70) return "#2e7d32";
  if (score >= 40) return "#f9a825";
  return "#c62828";
}

function statusColor(status: string): string {
  if (status === "high") return "#2e7d32";
  if (status === "medium") return "#f9a825";
  return "#c62828";
}

function severityColor(severity: string): string {
  if (severity === "critical") return "#c62828";
  if (severity === "high") return "#e65100";
  if (severity === "medium") return "#1565c0";
  return "#2e7d32";
}

function classificationColor(c: string): string {
  if (c === "Healthy") return "#2e7d32";
  if (c === "Moderate") return "#f9a825";
  return "#c62828";
}

// ─── Main Component ────────────────────────────────────────────────

export default function SoilHealthScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<SoilHealthSummary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [scanning, setScanning] = useState(false);

  // ─── OCR Scan SHC Card ──────────────────────────────────────────
  const handleScanSHC = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        if (typeof window !== "undefined") window.alert("Camera permission needed to scan SHC card");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;

      setScanning(true);
      const text = await extractTextFromImage(result.assets[0].uri);
      const parsed = parseSoilHealthCard(text);

      setForm((f) => ({
        ...f,
        ph: parsed.ph || f.ph,
        nitrogen: parsed.nitrogen || f.nitrogen,
        phosphorus: parsed.phosphorus || f.phosphorus,
        potassium: parsed.potassium || f.potassium,
        sulphur: parsed.sulphur || f.sulphur,
        iron: parsed.iron || f.iron,
        boron: parsed.boron || f.boron,
        organicCarbon: parsed.organicCarbon || f.organicCarbon,
      }));

      const filled = Object.values(parsed).filter(Boolean).length;
      if (typeof window !== "undefined") {
        window.alert(filled > 0
          ? `Scanned! ${filled} values auto-filled. Please review and correct if needed.`
          : "Could not read values clearly. Please enter manually or try a clearer photo."
        );
      }
    } catch (e: any) {
      if (typeof window !== "undefined") window.alert(e?.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };
  const [form, setForm] = useState<FormData>({
    ph: "",
    organicCarbon: "",
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    sulphur: "",
    boron: "",
    iron: "",
    labName: "",
    testDate: todayStr(),
  });

  // ─── Fetch Summary ──────────────────────────────────────────────

  const fetchSummary = useCallback(async () => {
    try {
      // Phase 1: read the FarmerPay-owned SHC from the new endpoint and
      // adapt it to the existing summary shape so the rest of this screen
      // (parameters list, advisories) keeps rendering unchanged.
      const res = await apiGet("/farmer/soil-health-card/me");
      const card = res?.data?.soilHealthCard;
      if (res?.success && card) {
        setSummary({
          hasData: true,
          testDate: card.card_issue_date || card.created_at,
          labName: card.card_reference_no || "",
          parameters: [],
          advisories: [],
        });
        setForm((f) => ({
          ...f,
          ph: card.ph != null ? String(card.ph) : "",
          organicCarbon: card.organic_carbon != null ? String(card.organic_carbon) : "",
          nitrogen: card.nitrogen_n != null ? String(card.nitrogen_n) : "",
          phosphorus: card.phosphorus_p != null ? String(card.phosphorus_p) : "",
          potassium: card.potassium_k != null ? String(card.potassium_k) : "",
          sulphur: card.sulphur_s != null ? String(card.sulphur_s) : "",
          boron: card.boron_b != null ? String(card.boron_b) : "",
          iron: card.iron_fe != null ? String(card.iron_fe) : "",
        }));
        setShowForm(false);
      } else {
        setSummary({ hasData: false });
        setShowForm(true);
      }
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED") {
        router.replace("/login");
        return;
      }
      setSummary({ hasData: false });
      setShowForm(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSummary();
  };

  // ─── Validation & Submit ────────────────────────────────────────

  const validate = (): string | null => {
    const ph = parseFloat(form.ph);
    if (isNaN(ph) || ph < 3 || ph > 11) return "pH must be between 3 and 11 / pH 3 से 11 के बीच होना चाहिए";

    const oc = parseFloat(form.organicCarbon);
    if (isNaN(oc) || oc < 0 || oc > 5) return "Organic Carbon must be 0-5% / कार्बनिक कार्बन 0-5% होना चाहिए";

    const n = parseFloat(form.nitrogen);
    if (isNaN(n) || n < 0 || n > 1000) return "Nitrogen must be 0-1000 kg/ha / नाइट्रोजन 0-1000 किग्रा/हेक्टेयर";

    const p = parseFloat(form.phosphorus);
    if (isNaN(p) || p < 0 || p > 500) return "Phosphorus must be 0-500 kg/ha / फॉस्फोरस 0-500 किग्रा/हेक्टेयर";

    const k = parseFloat(form.potassium);
    if (isNaN(k) || k < 0 || k > 1000) return "Potassium must be 0-1000 kg/ha / पोटेशियम 0-1000 किग्रा/हेक्टेयर";

    if (form.sulphur) {
      const s = parseFloat(form.sulphur);
      if (isNaN(s) || s < 0 || s > 100) return "Sulphur must be 0-100 ppm / सल्फर 0-100 ppm";
    }
    if (form.boron) {
      const b = parseFloat(form.boron);
      if (isNaN(b) || b < 0 || b > 10) return "Boron must be 0-10 ppm / बोरोन 0-10 ppm";
    }
    if (form.iron) {
      const fe = parseFloat(form.iron);
      if (isNaN(fe) || fe < 0 || fe > 50) return "Iron must be 0-50 ppm / आयरन 0-50 ppm";
    }

    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Validation Error / सत्यापन त्रुटि", err);
      return;
    }

    setSubmitting(true);
    try {
      // Phase 1: persist to the FarmerPay-owned SHC table via the new
      // /farmer/soil-health-card endpoint. Field names match the multipart
      // form-data shape the controller expects.
      const body: any = {
        ph: parseFloat(form.ph),
        organicCarbon: parseFloat(form.organicCarbon),
        nitrogenN: parseFloat(form.nitrogen),
        phosphorusP: parseFloat(form.phosphorus),
        potassiumK: parseFloat(form.potassium),
        cardIssueDate: form.testDate || todayStr(),
      };
      if (form.sulphur) body.sulphurS = parseFloat(form.sulphur);
      if (form.boron) body.boronB = parseFloat(form.boron);
      if (form.iron) body.ironFe = parseFloat(form.iron);
      if (form.labName) body.cardReferenceNo = form.labName;

      const res = await apiPost("/farmer/soil-health-card", body);
      if (res.success && res.data) {
        setSummary(res.data);
        setShowForm(false);
        Alert.alert("Success / सफल", "Soil health data saved! / मृदा स्वास्थ्य डेटा सहेजा गया!");
      } else {
        Alert.alert("Error / त्रुटि", res.message || "Failed to save data / डेटा सहेजने में विफल");
      }
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED") {
        router.replace("/login");
        return;
      }
      Alert.alert("Error / त्रुटि", "Network error. Please try again. / नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Form Field Component ──────────────────────────────────────

  const FormField = ({
    label,
    labelHi,
    value,
    field,
    guideline,
    optional,
    step,
  }: {
    label: string;
    labelHi: string;
    value: string;
    field: keyof FormData;
    guideline?: string;
    optional?: boolean;
    step?: string;
  }) => (
    <View style={s.fieldContainer}>
      <Text style={s.fieldLabel}>
        {label} / {labelHi}
        {optional ? " (Optional / वैकल्पिक)" : " *"}
      </Text>
      {guideline && <Text style={s.guideline}>{guideline}</Text>}
      <TextInput
        style={s.input}
        value={value}
        onChangeText={(t) => setForm({ ...form, [field]: t })}
        keyboardType={field === "labName" || field === "testDate" ? "default" : "decimal-pad"}
        placeholder={label}
        placeholderTextColor="#999"
      />
    </View>
  );

  // ─── Parameter Bar ─────────────────────────────────────────────

  const ParameterBar = ({ param }: { param: SoilParameter }) => {
    const barWidth = Math.min(Math.max((param.value / getMaxForParam(param.name)) * 100, 5), 100);
    return (
      <View style={s.paramRow}>
        <View style={s.paramHeader}>
          <Text style={s.paramName}>{param.name}</Text>
          <View style={[s.statusBadge, { backgroundColor: statusColor(param.status) }]}>
            <Text style={s.statusBadgeText}>{param.status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={s.barBg}>
          <View
            style={[s.barFill, { width: `${barWidth}%`, backgroundColor: statusColor(param.status) }]}
          />
        </View>
        <Text style={s.paramValue}>
          {param.value} {param.unit}
        </Text>
      </View>
    );
  };

  function getMaxForParam(name: string): number {
    const n = name.toLowerCase();
    if (n.includes("ph")) return 11;
    if (n.includes("organic") || n.includes("carbon")) return 5;
    if (n.includes("nitrogen")) return 500;
    if (n.includes("phosphorus")) return 100;
    if (n.includes("potassium")) return 500;
    if (n.includes("sulphur")) return 100;
    if (n.includes("boron")) return 10;
    if (n.includes("iron")) return 50;
    return 100;
  }

  // ─── Advisory Card ─────────────────────────────────────────────

  const AdvisoryCard = ({ adv }: { adv: Advisory }) => (
    <View style={s.advisoryCard}>
      <View style={s.advisoryHeader}>
        <Text style={s.advisoryParam}>{adv.parameter}</Text>
        <View style={s.advisoryBadges}>
          <View style={[s.statusBadge, { backgroundColor: statusColor(adv.status) }]}>
            <Text style={s.statusBadgeText}>{adv.status.toUpperCase()}</Text>
          </View>
          <View style={[s.severityBadge, { backgroundColor: severityColor(adv.severity) }]}>
            <Text style={s.statusBadgeText}>{adv.severity.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      <Text style={s.adviceEn}>{adv.adviceEn}</Text>
      <Text style={s.adviceHi}>{adv.adviceHi}</Text>
    </View>
  );

  // ─── Score Circle ──────────────────────────────────────────────

  const ScoreCircle = ({ score }: { score: number }) => (
    <View style={[s.scoreCircle, { borderColor: scoreColor(score) }]}>
      <Text style={[s.scoreNumber, { color: scoreColor(score) }]}>{score}</Text>
      <Text style={s.scoreLabel}>/ 100</Text>
    </View>
  );

  // ─── Loading ───────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1b5e20" />
        <Text style={s.loadingText}>Loading Soil Health Data... / मृदा स्वास्थ्य डेटा लोड हो रहा है...</Text>
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1b5e20"]} />}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>{"< Back"}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Soil Health Card</Text>
        <Text style={s.headerSubtitle}>मृदा स्वास्थ्य कार्ड</Text>
      </View>

      {/* ─── Summary View ─────────────────────────────────────── */}
      {!showForm && summary?.hasData && (
        <View>
          {/* Score */}
          <View style={s.card}>
            <View style={s.scoreSection}>
              <ScoreCircle score={summary.healthScore ?? 0} />
              <View style={s.scoreInfo}>
                <View
                  style={[
                    s.classBadge,
                    { backgroundColor: classificationColor(summary.classification ?? "Poor") },
                  ]}
                >
                  <Text style={s.classBadgeText}>{summary.classification}</Text>
                </View>
                {summary.testDate && (
                  <Text style={s.metaText}>Test Date / परीक्षण तिथि: {summary.testDate}</Text>
                )}
                {summary.labName && (
                  <Text style={s.metaText}>Lab / प्रयोगशाला: {summary.labName}</Text>
                )}
              </View>
            </View>
          </View>

          {/* NPK Parameters */}
          {summary.parameters && summary.parameters.length > 0 && (
            <View style={s.card}>
              <Text style={s.sectionTitle}>Soil Parameters / मृदा पैरामीटर</Text>
              {summary.parameters.map((p, i) => (
                <ParameterBar key={i} param={p} />
              ))}
            </View>
          )}

          {/* Advisories */}
          {summary.advisories && summary.advisories.length > 0 && (
            <View style={s.card}>
              <Text style={s.sectionTitle}>Advisories / सलाह</Text>
              {summary.advisories.map((adv, i) => (
                <AdvisoryCard key={i} adv={adv} />
              ))}
            </View>
          )}

          {/* Update Button */}
          <TouchableOpacity style={s.primaryBtn} onPress={() => setShowForm(true)}>
            <Text style={s.primaryBtnText}>Update Soil Test / मृदा परीक्षण अपडेट करें</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Entry Form ───────────────────────────────────────── */}
      {showForm && (
        <View>
          <View style={s.card}>
            <Text style={s.formTitle}>Soil Health Card / मृदा स्वास्थ्य कार्ड</Text>

            {/* OCR Scan Button */}
            <TouchableOpacity
              style={{ backgroundColor: "#e8f5e9", borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 14, borderWidth: 1.5, borderColor: "#2e7d32" }}
              onPress={handleScanSHC}
              disabled={scanning}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 28, marginBottom: 4 }}>{scanning ? "⏳" : "📷"}</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#2e7d32" }}>
                {scanning ? "Scanning... / स्कैन हो रहा है..." : "Scan SHC Card / कार्ड स्कैन करें"}
              </Text>
              <Text style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                Take a photo — values will auto-fill / फोटो लें — मान अपने आप भर जाएंगे
              </Text>
            </TouchableOpacity>

            <Text style={s.formInstructions}>
              Or enter values manually / या मूल्य मैन्युअली दर्ज करें
            </Text>

            <FormField
              label="pH"
              labelHi="पीएच"
              value={form.ph}
              field="ph"
              guideline="Ideal: 6.0-7.5 / आदर्श: 6.0-7.5"
              step="0.1"
            />
            <FormField
              label="Organic Carbon %"
              labelHi="कार्बनिक कार्बन %"
              value={form.organicCarbon}
              field="organicCarbon"
              guideline="Low <0.4, Medium 0.4-0.75, High >0.75"
              step="0.01"
            />
            <FormField
              label="Nitrogen kg/ha"
              labelHi="नाइट्रोजन किग्रा/हेक्टेयर"
              value={form.nitrogen}
              field="nitrogen"
              guideline="Low <140, Medium 140-280"
            />
            <FormField
              label="Phosphorus kg/ha"
              labelHi="फॉस्फोरस किग्रा/हेक्टेयर"
              value={form.phosphorus}
              field="phosphorus"
              guideline="Low <11, Medium 11-25"
            />
            <FormField
              label="Potassium kg/ha"
              labelHi="पोटेशियम किग्रा/हेक्टेयर"
              value={form.potassium}
              field="potassium"
              guideline="Low <110, Medium 110-280"
            />
            <FormField
              label="Sulphur ppm"
              labelHi="सल्फर पीपीएम"
              value={form.sulphur}
              field="sulphur"
              optional
            />
            <FormField
              label="Boron ppm"
              labelHi="बोरोन पीपीएम"
              value={form.boron}
              field="boron"
              optional
            />
            <FormField
              label="Iron ppm"
              labelHi="आयरन पीपीएम"
              value={form.iron}
              field="iron"
              optional
            />
            <View style={s.fieldContainer}>
              <Text style={s.fieldLabel}>Lab Name / प्रयोगशाला का नाम (Optional / वैकल्पिक)</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={form.labName}
                  onChangeText={(t) => setForm({ ...form, labName: t })}
                  placeholder="Lab Name"
                  placeholderTextColor="#999"
                />
                <VoiceInputButton onResult={(t) => setForm({ ...form, labName: t })} language="hi" />
              </View>
            </View>
            <FormField
              label="Test Date (YYYY-MM-DD)"
              labelHi="परीक्षण तिथि"
              value={form.testDate}
              field="testDate"
            />
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, submitting && s.disabledBtn]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.primaryBtnText}>Save & Get Advisory / सहेजें और सलाह पाएं</Text>
            )}
          </TouchableOpacity>

          {summary?.hasData && (
            <TouchableOpacity style={s.secondaryBtn} onPress={() => setShowForm(false)}>
              <Text style={s.secondaryBtnText}>Cancel / रद्द करें</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f8e9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f8e9" },
  loadingText: { marginTop: 12, color: "#555", fontSize: 14, textAlign: "center" },

  // Header
  header: { backgroundColor: "#1b5e20", paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16 },
  backBtn: { marginBottom: 8 },
  backText: { color: "#fff", fontSize: 16 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: "#c8e6c9", fontSize: 16, marginTop: 2 },

  // Card
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Score Section
  scoreSection: { flexDirection: "row", alignItems: "center" },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  scoreNumber: { fontSize: 32, fontWeight: "800" },
  scoreLabel: { fontSize: 14, color: "#888" },
  scoreInfo: { flex: 1 },
  classBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start" },
  classBadgeText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  metaText: { color: "#666", fontSize: 13, marginTop: 6 },

  // Section Title
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1b5e20", marginBottom: 12 },

  // Parameter Bars
  paramRow: { marginBottom: 14 },
  paramHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  paramName: { fontSize: 14, fontWeight: "600", color: "#333" },
  barBg: { height: 10, backgroundColor: "#e0e0e0", borderRadius: 5, overflow: "hidden" },
  barFill: { height: 10, borderRadius: 5 },
  paramValue: { fontSize: 12, color: "#666", marginTop: 2 },

  // Status Badge
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  // Severity Badge
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 6 },

  // Advisory Card
  advisoryCard: {
    backgroundColor: "#f9fbe7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#1b5e20",
  },
  advisoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  advisoryBadges: { flexDirection: "row" },
  advisoryParam: { fontSize: 15, fontWeight: "700", color: "#333", flex: 1 },
  adviceEn: { fontSize: 14, color: "#333", lineHeight: 20, marginBottom: 4 },
  adviceHi: { fontSize: 13, color: "#888", lineHeight: 18 },

  // Form
  formTitle: { fontSize: 19, fontWeight: "700", color: "#1b5e20", textAlign: "center" },
  formInstructions: { fontSize: 13, color: "#666", textAlign: "center", marginTop: 6, marginBottom: 16, lineHeight: 20 },
  fieldContainer: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 4 },
  guideline: { fontSize: 12, color: "#888", marginBottom: 4, fontStyle: "italic" },
  input: {
    borderWidth: 1,
    borderColor: "#c8e6c9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fafafa",
    color: "#333",
  },

  // Buttons
  primaryBtn: {
    backgroundColor: "#1b5e20",
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabledBtn: { opacity: 0.6 },
  secondaryBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1b5e20",
  },
  secondaryBtnText: { color: "#1b5e20", fontSize: 15, fontWeight: "600" },
});
