import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { apiGet, apiPost } from "../lib/api";

type Tier = "SMALL" | "MEDIUM" | "LARGE";
type PayMode = "CASH" | "UPI" | "BANK" | "CREDIT";

const TIERS: { value: Tier; label: string; labelHi: string; desc: string; range: string }[] = [
  { value: "SMALL",  label: "Small",  labelHi: "छोटा",  desc: "Few animals, simple entry",     range: "1–4 animals" },
  { value: "MEDIUM", label: "Medium", labelHi: "मध्यम", desc: "Daily tracking, per-animal P&L", range: "5–10 animals" },
  { value: "LARGE",  label: "Large",  labelHi: "बड़ा",  desc: "Weekly bulk entries, herd P&L",  range: "10+ animals" },
];

const PAY_MODES: { value: PayMode; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "UPI",  label: "UPI"  },
  { value: "BANK", label: "Bank" },
  { value: "CREDIT", label: "Credit" },
];

export default function DairyOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tier, setTier] = useState<Tier>("SMALL");
  const [coopName, setCoopName] = useState("");
  const [coopMemberId, setCoopMemberId] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("CASH");
  const [expectedCount, setExpectedCount] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet("/roots/dairy/v2/profile");
        if (res.success && res.data) {
          const p = res.data;
          setTier((p.herd_tier || "SMALL") as Tier);
          setCoopName(p.cooperative_name || "");
          setCoopMemberId(p.cooperative_member_id || "");
          setPayMode((p.default_payment_mode || "CASH") as PayMode);
        }
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const body: any = {
        herdTier: tier,
        cooperativeName: coopName || null,
        cooperativeMemberId: coopMemberId || null,
        defaultPaymentMode: payMode,
        currency: "INR",
      };
      if (expectedCount) body.expectedAnimalCount = parseInt(expectedCount, 10);
      const res = await apiPost("/roots/dairy/v2/profile", body);
      if (res.success) {
        Alert.alert("Saved / सहेजा गया", "Dairy profile saved successfully", [
          { text: "Continue", onPress: () => router.replace("/dairy-logbook" as any) },
        ]);
      } else {
        Alert.alert("Error", res.message || "Failed to save profile");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.headerEmoji}>🐄</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Dairy Setup</Text>
          <Text style={s.headerSub}>डेयरी प्रोफ़ाइल</Text>
        </View>
      </View>

      {/* Tier picker */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Herd Size / झुंड का आकार</Text>
        <Text style={s.cardHelp}>Pick the tier that matches your farm size</Text>
        <View style={{ gap: 10, marginTop: 10 }}>
          {TIERS.map((t) => {
            const selected = tier === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[s.tierCard, selected && s.tierCardSel]}
                onPress={() => setTier(t.value)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.tierLabel, selected && s.tierLabelSel]}>
                    {t.label} / <Text style={s.tierLabelHi}>{t.labelHi}</Text>
                  </Text>
                  <Text style={s.tierRange}>{t.range}</Text>
                  <Text style={s.tierDesc}>{t.desc}</Text>
                </View>
                <View style={[s.radio, selected && s.radioSel]}>
                  {selected && <View style={s.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Expected count */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Expected Animal Count / पशु संख्या</Text>
        <Text style={s.cardHelp}>Optional — helps us suggest the right tier</Text>
        <TextInput
          style={s.input}
          value={expectedCount}
          onChangeText={setExpectedCount}
          placeholder="e.g., 6"
          keyboardType="number-pad"
        />
      </View>

      {/* Cooperative info */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Cooperative / सहकारी</Text>
        <Text style={s.fieldLabel}>Name / नाम</Text>
        <TextInput
          style={s.input}
          value={coopName}
          onChangeText={setCoopName}
          placeholder="e.g., KMF Bangalore Dairy Union"
        />
        <Text style={s.fieldLabel}>Member ID / सदस्य आईडी</Text>
        <TextInput
          style={s.input}
          value={coopMemberId}
          onChangeText={setCoopMemberId}
          placeholder="e.g., KMF-BLR-44821"
          autoCapitalize="characters"
        />
      </View>

      {/* Default payment mode */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Default Payment Mode / भुगतान विधि</Text>
        <View style={s.chipRow}>
          {PAY_MODES.map((m) => {
            const selected = payMode === m.value;
            return (
              <TouchableOpacity
                key={m.value}
                style={[s.chip, selected && s.chipSel]}
                onPress={() => setPayMode(m.value)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, selected && s.chipTextSel]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Save */}
      <TouchableOpacity
        style={[s.saveBtn, saving && { opacity: 0.6 }]}
        onPress={save}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.saveBtnText}>Save & Continue / सहेजें</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: "center", padding: 12 }}>
        <Text style={{ color: "#666", fontSize: 13 }}>Cancel / रद्द करें</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  header: { backgroundColor: "#1b5e20", borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  headerEmoji: { fontSize: 32 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  headerSub: { color: "#a5d6a7", fontSize: 13, marginTop: 2 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardLabel: { fontSize: 12, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  cardHelp: { fontSize: 12, color: "#999", marginBottom: 6 },
  tierCard: { borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fafafa" },
  tierCardSel: { borderColor: "#2e7d32", backgroundColor: "#e8f5e9" },
  tierLabel: { fontSize: 15, fontWeight: "700", color: "#333" },
  tierLabelSel: { color: "#1b5e20" },
  tierLabelHi: { fontSize: 13, color: "#888", fontWeight: "400" },
  tierRange: { fontSize: 12, color: "#2e7d32", fontWeight: "600", marginTop: 2 },
  tierDesc: { fontSize: 11, color: "#888", marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#ccc", justifyContent: "center", alignItems: "center" },
  radioSel: { borderColor: "#2e7d32" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2e7d32" },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#555", marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: "#fafafa", marginTop: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fafafa" },
  chipSel: { borderColor: "#2e7d32", backgroundColor: "#e8f5e9" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#666" },
  chipTextSel: { color: "#1b5e20" },
  saveBtn: { backgroundColor: "#2e7d32", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 8, shadowColor: "#2e7d32", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
});
