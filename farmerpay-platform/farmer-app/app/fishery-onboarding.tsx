import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { apiGet, apiPost } from "../lib/api";

type OpType = "INLAND" | "SEA" | "BOTH";
type Tier = "SMALL" | "MEDIUM" | "LARGE";
type PayMode = "CASH" | "UPI" | "BANK" | "CREDIT";

const OP_TYPES: { value: OpType; label: string; labelHi: string; icon: string; desc: string }[] = [
  { value: "INLAND", label: "Inland Ponds",  labelHi: "अंतर्देशीय तालाब", icon: "🏞️", desc: "Pond-based fish farming (Rohu, Catla, Tilapia, Shrimp)" },
  { value: "SEA",    label: "Sea Fishing",   labelHi: "समुद्री मछली",    icon: "⛵", desc: "Coastal / deep-sea vessel-based fishing" },
  { value: "BOTH",   label: "Both",          labelHi: "दोनों",          icon: "🌊", desc: "Ponds + sea vessels combined" },
];

const TIERS: { value: Tier; label: string; labelHi: string; desc: string }[] = [
  { value: "SMALL",  label: "Small",  labelHi: "छोटा",  desc: "Single pond / one vessel, simple entry" },
  { value: "MEDIUM", label: "Medium", labelHi: "मध्यम", desc: "Multiple assets, daily tracking" },
  { value: "LARGE",  label: "Large",  labelHi: "बड़ा",  desc: "Large operation, weekly bulk entry" },
];

const PAY_MODES: PayMode[] = ["CASH", "UPI", "BANK", "CREDIT"];

export default function FisheryOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [opType, setOpType] = useState<OpType>("INLAND");
  const [tier, setTier] = useState<Tier>("SMALL");
  const [coopName, setCoopName] = useState("");
  const [coopMemberId, setCoopMemberId] = useState("");
  const [primaryMarket, setPrimaryMarket] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("CASH");

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet("/roots/fishery/v2/profile");
        if (res.success && res.data) {
          const p = res.data;
          setOpType((p.operation_type || "INLAND") as OpType);
          setTier((p.tier || "SMALL") as Tier);
          setCoopName(p.cooperative_name || "");
          setCoopMemberId(p.cooperative_member_id || "");
          setPrimaryMarket(p.primary_market || "");
          setPayMode((p.default_payment_mode || "CASH") as PayMode);
        }
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        operationType: opType,
        tier,
        cooperativeName: coopName || null,
        cooperativeMemberId: coopMemberId || null,
        primaryMarket: primaryMarket || null,
        defaultPaymentMode: payMode,
        currency: "INR",
      };
      const res = await apiPost("/roots/fishery/v2/profile", body);
      if (res.success) {
        Alert.alert("Saved / सहेजा गया", "Fishery profile saved successfully", [
          { text: "Continue", onPress: () => router.replace("/fishery-logbook" as any) },
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
    return <View style={s.center}><ActivityIndicator size="large" color="#00695c" /></View>;
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.headerEmoji}>🐟</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Fishery Setup</Text>
          <Text style={s.headerSub}>मत्स्य पालन प्रोफ़ाइल</Text>
        </View>
      </View>

      {/* Operation Type */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Operation Type / संचालन प्रकार</Text>
        <Text style={s.cardHelp}>What kind of fishing do you do?</Text>
        <View style={{ gap: 10, marginTop: 10 }}>
          {OP_TYPES.map((o) => {
            const sel = opType === o.value;
            return (
              <TouchableOpacity
                key={o.value}
                style={[s.optCard, sel && s.optCardSel]}
                onPress={() => setOpType(o.value)}
                activeOpacity={0.7}
              >
                <Text style={s.optIcon}>{o.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.optLabel, sel && s.optLabelSel]}>
                    {o.label} / <Text style={s.optLabelHi}>{o.labelHi}</Text>
                  </Text>
                  <Text style={s.optDesc}>{o.desc}</Text>
                </View>
                <View style={[s.radio, sel && s.radioSel]}>
                  {sel && <View style={s.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tier */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Operation Size / आकार</Text>
        <View style={{ gap: 10, marginTop: 10 }}>
          {TIERS.map((t) => {
            const sel = tier === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[s.tierCard, sel && s.tierCardSel]}
                onPress={() => setTier(t.value)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.tierLabel, sel && s.tierLabelSel]}>
                    {t.label} / <Text style={s.optLabelHi}>{t.labelHi}</Text>
                  </Text>
                  <Text style={s.optDesc}>{t.desc}</Text>
                </View>
                <View style={[s.radio, sel && s.radioSel]}>
                  {sel && <View style={s.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Cooperative */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Cooperative / सहकारी</Text>
        <Text style={s.fieldLabel}>Name</Text>
        <TextInput style={s.input} value={coopName} onChangeText={setCoopName} placeholder="e.g., Karnataka Fisheries Federation" />
        <Text style={s.fieldLabel}>Member ID</Text>
        <TextInput style={s.input} value={coopMemberId} onChangeText={setCoopMemberId} placeholder="e.g., KFF-MYS-1082" autoCapitalize="characters" />
        <Text style={s.fieldLabel}>Primary Market / प्राथमिक बाजार</Text>
        <TextInput style={s.input} value={primaryMarket} onChangeText={setPrimaryMarket} placeholder="e.g., Mysuru wholesale fish market" />
      </View>

      {/* Payment */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Default Payment Mode / भुगतान विधि</Text>
        <View style={s.chipRow}>
          {PAY_MODES.map((m) => {
            const sel = payMode === m;
            return (
              <TouchableOpacity
                key={m}
                style={[s.chip, sel && s.chipSel]}
                onPress={() => setPayMode(m)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, sel && s.chipTextSel]}>{m}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        style={[s.saveBtn, saving && { opacity: 0.6 }]}
        onPress={save}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save & Continue / सहेजें</Text>}
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
  header: { backgroundColor: "#00695c", borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  headerEmoji: { fontSize: 32 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  headerSub: { color: "#b2dfdb", fontSize: 13, marginTop: 2 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardLabel: { fontSize: 12, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  cardHelp: { fontSize: 12, color: "#999", marginBottom: 4 },
  optCard: { borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fafafa" },
  optCardSel: { borderColor: "#00695c", backgroundColor: "#e0f2f1" },
  optIcon: { fontSize: 28 },
  optLabel: { fontSize: 15, fontWeight: "700", color: "#333" },
  optLabelSel: { color: "#00695c" },
  optLabelHi: { fontSize: 13, color: "#888", fontWeight: "400" },
  optDesc: { fontSize: 11, color: "#888", marginTop: 2 },
  tierCard: { borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fafafa" },
  tierCardSel: { borderColor: "#00695c", backgroundColor: "#e0f2f1" },
  tierLabel: { fontSize: 15, fontWeight: "700", color: "#333" },
  tierLabelSel: { color: "#00695c" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#ccc", justifyContent: "center", alignItems: "center" },
  radioSel: { borderColor: "#00695c" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#00695c" },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#555", marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: "#fafafa" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fafafa" },
  chipSel: { borderColor: "#00695c", backgroundColor: "#e0f2f1" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#666" },
  chipTextSel: { color: "#00695c" },
  saveBtn: { backgroundColor: "#00695c", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 8, shadowColor: "#00695c", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
});
