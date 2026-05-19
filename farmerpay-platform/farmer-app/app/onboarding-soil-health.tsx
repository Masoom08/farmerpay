/**
 * Onboarding Soil Health Card capture (SAGE Phase 1)
 *
 * Shown right after onboarding-activities.tsx, before the farmer ever sees
 * the Home tab. Lets the farmer either snap a photo of her physical SHC,
 * type in the structured fields manually, or skip for now. GPS is captured
 * silently in the background.
 *
 * Uploads to POST /farmer/soil-health-card (multipart, field name "file"),
 * then routes to /(tabs).
 *
 * NOTE: expo-image-picker and expo-location are not yet installed in
 * farmer-app/package.json. The screen degrades gracefully — if either
 * module is missing, the corresponding capture is silently skipped so
 * the structured-field path still works and the build does not break.
 * Once those packages are added, the screen wires them up automatically.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { getToken } from "../lib/api";

// ─── Optional native modules (load best-effort) ────────────────────

let ImagePicker: any = null;
let Location: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ImagePicker = require("expo-image-picker");
} catch {}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Location = require("expo-location");
} catch {}

const API_BASE = "http://localhost:3000/api/v1";

// ─── Soil-type catalog ─────────────────────────────────────────────

type SoilType =
  | "alluvial" | "black" | "red" | "laterite"
  | "arid" | "mountain" | "saline" | "peaty" | "other";

const SOIL_TYPES: { code: SoilType; label: string; labelHi: string }[] = [
  { code: "alluvial", label: "Alluvial", labelHi: "जलोढ़" },
  { code: "black",    label: "Black",    labelHi: "काली" },
  { code: "red",      label: "Red",      labelHi: "लाल" },
  { code: "laterite", label: "Laterite", labelHi: "लैटेराइट" },
  { code: "arid",     label: "Arid",     labelHi: "शुष्क" },
  { code: "mountain", label: "Mountain", labelHi: "पहाड़ी" },
  { code: "saline",   label: "Saline",   labelHi: "लवणीय" },
  { code: "peaty",    label: "Peaty",    labelHi: "पीटी" },
  { code: "other",    label: "Other",    labelHi: "अन्य" },
];

// ─── Component ─────────────────────────────────────────────────────

export default function OnboardingSoilHealthScreen() {
  const router = useRouter();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>("image/jpeg");
  const [soilType, setSoilType] = useState<SoilType | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [ph, setPh] = useState("");
  const [nitrogen, setNitrogen] = useState("");
  const [phosphorus, setPhosphorus] = useState("");
  const [potassium, setPotassium] = useState("");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Capture GPS silently in the background.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Location) return;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy?.Balanced ?? 3,
        });
        if (cancelled) return;
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setAccuracy(pos.coords.accuracy ?? null);
      } catch {
        /* swallow — GPS is best-effort, not required */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const takePhoto = async () => {
    if (!ImagePicker) {
      Alert.alert(
        "Photo capture not available",
        "Please use 'Enter manually' for now. Photo upload will be enabled in the next app update."
      );
      return;
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Camera permission needed", "Please grant camera access to capture your SHC.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? "Images",
        quality: 0.7,
        allowsEditing: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      setPhotoUri(asset.uri);
      setPhotoMime(asset.mimeType || "image/jpeg");
    } catch (e: any) {
      Alert.alert("Camera error", e?.message || "Could not open camera.");
    }
  };

  const submit = async () => {
    if (!photoUri && !soilType && !ph && !nitrogen && !phosphorus && !potassium) {
      Alert.alert(
        "Nothing to save",
        "Please capture a photo, pick a soil type, or enter at least one value — or tap Skip for now."
      );
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const fd = new FormData();
      if (photoUri) {
        // React Native FormData accepts { uri, name, type } objects.
        fd.append("file", {
          uri: photoUri,
          name: `shc-${Date.now()}.jpg`,
          type: photoMime,
        } as any);
      }
      if (soilType) fd.append("soilType", soilType);
      if (latitude != null) fd.append("latitude", String(latitude));
      if (longitude != null) fd.append("longitude", String(longitude));
      if (accuracy != null) fd.append("locationAccuracyM", String(accuracy));
      if (ph) fd.append("ph", ph);
      if (nitrogen) fd.append("nitrogenN", nitrogen);
      if (phosphorus) fd.append("phosphorusP", phosphorus);
      if (potassium) fd.append("potassiumK", potassium);

      const res = await fetch(`${API_BASE}/farmer/soil-health-card`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd as any,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Save failed");
      }
      router.replace("/onboarding-crops" as any);
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Could not save your soil card. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const skip = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      await fetch(`${API_BASE}/farmer/soil-health-card/skip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      }).catch(() => {});
      router.replace("/onboarding-crops" as any);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.headerEmoji}>🌱</Text>
        <Text style={styles.headerTitle}>One last thing — your Soil Health Card</Text>
        <Text style={styles.headerHi}>आपका मृदा स्वास्थ्य कार्ड</Text>
      </View>

      <Text style={styles.subcopy}>
        We'll use this to give you advice that's right for your field, not the whole tehsil.
      </Text>

      {latitude != null && (
        <View style={styles.gpsChip}>
          <Text style={styles.gpsChipText}>📍 Location captured</Text>
        </View>
      )}

      <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>
          {photoUri ? "📸 Photo captured — retake?" : "📷 Take photo of SHC"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => setShowManual((v) => !v)}
        activeOpacity={0.85}
      >
        <Text style={styles.secondaryBtnText}>
          {showManual ? "Hide manual entry" : "Enter manually"}
        </Text>
      </TouchableOpacity>

      {showManual && (
        <View style={styles.manualBlock}>
          <Text style={styles.fieldLabel}>Soil type</Text>
          <View style={styles.soilGrid}>
            {SOIL_TYPES.map((s) => {
              const active = soilType === s.code;
              return (
                <TouchableOpacity
                  key={s.code}
                  style={[styles.soilChip, active && styles.soilChipActive]}
                  onPress={() => setSoilType(s.code)}
                >
                  <Text style={[styles.soilChipLabel, active && styles.soilChipLabelActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>pH (optional)</Text>
          <TextInput
            style={styles.input}
            value={ph}
            onChangeText={setPh}
            keyboardType="numeric"
            placeholder="e.g. 6.8"
          />

          <Text style={styles.fieldLabel}>Nitrogen N (kg/ha, optional)</Text>
          <TextInput
            style={styles.input}
            value={nitrogen}
            onChangeText={setNitrogen}
            keyboardType="numeric"
            placeholder="e.g. 240"
          />

          <Text style={styles.fieldLabel}>Phosphorus P (kg/ha, optional)</Text>
          <TextInput
            style={styles.input}
            value={phosphorus}
            onChangeText={setPhosphorus}
            keyboardType="numeric"
            placeholder="e.g. 22"
          />

          <Text style={styles.fieldLabel}>Potassium K (kg/ha, optional)</Text>
          <TextInput
            style={styles.input}
            value={potassium}
            onChangeText={setPotassium}
            keyboardType="numeric"
            placeholder="e.g. 180"
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={submit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save & continue →</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={skip} disabled={submitting}>
        <Text style={styles.skipLink}>Skip for now</Text>
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
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800", textAlign: "center" },
  headerHi: { color: "#a5d6a7", fontSize: 13, marginTop: 4 },

  subcopy: { color: "#555", fontSize: 14, marginBottom: 12, lineHeight: 20 },

  gpsChip: { alignSelf: "flex-start", backgroundColor: "#e8f5e9", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  gpsChipText: { color: "#2e7d32", fontSize: 12, fontWeight: "700" },

  primaryBtn: { backgroundColor: "#2e7d32", borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 10 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  secondaryBtn: { backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: "#cfd8dc" },
  secondaryBtnText: { color: "#1b5e20", fontSize: 14, fontWeight: "700" },

  manualBlock: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#555", marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#cfd8dc", borderRadius: 10, padding: 10, fontSize: 14, color: "#222", backgroundColor: "#fafafa" },

  soilGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  soilChip: { borderWidth: 1, borderColor: "#cfd8dc", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  soilChipActive: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  soilChipLabel: { fontSize: 12, color: "#555" },
  soilChipLabelActive: { color: "#fff", fontWeight: "700" },

  submitBtn: { backgroundColor: "#1b5e20", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 16 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  skipLink: { textAlign: "center", color: "#888", fontSize: 13, marginTop: 14, textDecorationLine: "underline" },
});
