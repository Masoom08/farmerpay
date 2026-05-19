import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { apiGet, apiPost } from "../lib/api";

type Scope = "FARM" | "POND" | "VESSEL";
type PayMode = "CASH" | "UPI" | "BANK" | "CREDIT";
type BuyerType = "WHOLESALER" | "AUCTION" | "DIRECT" | "EXPORTER" | "COOPERATIVE" | "RESTAURANT" | "OTHER";

const REVENUE_CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: "FISH_SALE_WHOLESALE",  label: "Wholesale", icon: "🏪" },
  { value: "FISH_SALE_AUCTION",    label: "Auction",   icon: "🔨" },
  { value: "FISH_SALE_DIRECT",     label: "Direct",    icon: "🤝" },
  { value: "FISH_SALE_COOPERATIVE",label: "Co-op",     icon: "🏛️" },
  { value: "FISH_SALE_EXPORT",     label: "Export",    icon: "🚢" },
  { value: "BYPRODUCT_SALE",       label: "Byproduct", icon: "📦" },
  { value: "POND_LEASE_INCOME",    label: "Lease",     icon: "📜" },
  { value: "SUBSIDY",              label: "Subsidy",   icon: "🏛️" },
  { value: "INSURANCE_PAYOUT",     label: "Insurance", icon: "🛡️" },
  { value: "OTHER",                label: "Other",     icon: "📋" },
];

const BUYER_TYPES: BuyerType[] = ["WHOLESALER", "AUCTION", "DIRECT", "EXPORTER", "COOPERATIVE", "RESTAURANT", "OTHER"];

const today = () => new Date().toISOString().slice(0, 10);

export default function FisheryLogRevenue() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [ponds, setPonds] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [opType, setOpType] = useState<"INLAND" | "SEA" | "BOTH">("INLAND");

  const [category, setCategory] = useState<string>("FISH_SALE_WHOLESALE");
  const [scope, setScope] = useState<Scope>("FARM");
  const [pondId, setPondId] = useState<string | null>(null);
  const [vesselId, setVesselId] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState(today());
  const [species, setSpecies] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [ratePerKg, setRatePerKg] = useState("");
  const [amount, setAmount] = useState("");
  const [amountFormal, setAmountFormal] = useState("");
  const [amountInformal, setAmountInformal] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerType, setBuyerType] = useState<BuyerType>("WHOLESALER");
  const [payMode, setPayMode] = useState<PayMode>("CASH");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [profRes, pondsRes, vesselsRes] = await Promise.all([
          apiGet("/roots/fishery/v2/profile"),
          apiGet("/roots/fishery/v2/ponds"),
          apiGet("/roots/fishery/v2/vessels"),
        ]);
        if (profRes.success && profRes.data) setOpType(profRes.data.operation_type || "INLAND");
        if (pondsRes.success) setPonds(pondsRes.data || []);
        if (vesselsRes.success) setVessels(vesselsRes.data || []);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    const q = parseFloat(quantityKg);
    const r = parseFloat(ratePerKg);
    if (!isNaN(q) && !isNaN(r)) setAmount((q * r).toFixed(2));
  }, [quantityKg, ratePerKg]);

  const showInland = opType === "INLAND" || opType === "BOTH";
  const showSea = opType === "SEA" || opType === "BOTH";

  const save = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      Alert.alert("Missing", "Enter an amount greater than 0");
      return;
    }
    if (scope === "POND" && !pondId) {
      Alert.alert("Missing", "Select a pond");
      return;
    }
    if (scope === "VESSEL" && !vesselId) {
      Alert.alert("Missing", "Select a vessel");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        eventDate,
        scope,
        category,
        amount: amt,
        amountFormal: amountFormal ? parseFloat(amountFormal) : amt,
        amountInformal: amountInformal ? parseFloat(amountInformal) : 0,
        species: species || null,
        quantityKg: quantityKg ? parseFloat(quantityKg) : null,
        ratePerKg: ratePerKg ? parseFloat(ratePerKg) : null,
        buyerName: buyerName || null,
        buyerType,
        paymentMode: payMode,
        notes: notes || null,
      };
      if (scope === "POND") body.pondId = pondId;
      if (scope === "VESSEL") body.vesselId = vesselId;

      const res = await apiPost("/roots/fishery/v2/revenue-events", body);
      if (res.success) {
        Alert.alert("Saved", "Sale logged successfully", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", res.message || "Failed to save");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Log Sale / बिक्री दर्ज करें</Text>
      </View>

      {/* Category */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Sale Type / बिक्री प्रकार</Text>
        <View style={s.grid}>
          {REVENUE_CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[s.catCard, category === c.value && s.catCardSel]}
              onPress={() => setCategory(c.value)}
              activeOpacity={0.7}
            >
              <Text style={s.catIcon}>{c.icon}</Text>
              <Text style={[s.catLabel, category === c.value && s.catLabelSel]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Scope */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Source / स्रोत</Text>
        <View style={s.chipRow}>
          <TouchableOpacity style={[s.chip, scope === "FARM" && s.chipSel]} onPress={() => { setScope("FARM"); setPondId(null); setVesselId(null); }}>
            <Text style={[s.chipText, scope === "FARM" && s.chipTextSel]}>Farm-level</Text>
          </TouchableOpacity>
          {showInland && (
            <TouchableOpacity style={[s.chip, scope === "POND" && s.chipSel]} onPress={() => { setScope("POND"); setVesselId(null); }}>
              <Text style={[s.chipText, scope === "POND" && s.chipTextSel]}>From pond</Text>
            </TouchableOpacity>
          )}
          {showSea && (
            <TouchableOpacity style={[s.chip, scope === "VESSEL" && s.chipSel]} onPress={() => { setScope("VESSEL"); setPondId(null); }}>
              <Text style={[s.chipText, scope === "VESSEL" && s.chipTextSel]}>From vessel</Text>
            </TouchableOpacity>
          )}
        </View>
        {scope === "POND" && (
          <View style={{ marginTop: 10 }}>
            <Text style={s.fieldLabel}>Select pond</Text>
            <View style={s.chipRow}>
              {ponds.map((p) => (
                <TouchableOpacity key={p.pond_uuid} style={[s.chip, pondId === p.pond_uuid && s.chipSel]} onPress={() => setPondId(p.pond_uuid)}>
                  <Text style={[s.chipText, pondId === p.pond_uuid && s.chipTextSel]}>{p.pond_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        {scope === "VESSEL" && (
          <View style={{ marginTop: 10 }}>
            <Text style={s.fieldLabel}>Select vessel</Text>
            <View style={s.chipRow}>
              {vessels.map((v) => (
                <TouchableOpacity key={v.vessel_uuid} style={[s.chip, vesselId === v.vessel_uuid && s.chipSel]} onPress={() => setVesselId(v.vessel_uuid)}>
                  <Text style={[s.chipText, vesselId === v.vessel_uuid && s.chipTextSel]}>{v.vessel_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Catch details */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Catch & Amount / मछली और राशि</Text>

        <Text style={s.fieldLabel}>Date</Text>
        <TextInput style={s.input} value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" />

        <Text style={s.fieldLabel}>Species / प्रजाति</Text>
        <TextInput style={s.input} value={species} onChangeText={setSpecies} placeholder="e.g., Rohu, Mackerel" />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Quantity (kg)</Text>
            <TextInput style={s.input} value={quantityKg} onChangeText={setQuantityKg} placeholder="450" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Rate (₹/kg)</Text>
            <TextInput style={s.input} value={ratePerKg} onChangeText={setRatePerKg} placeholder="130" keyboardType="numeric" />
          </View>
        </View>

        <Text style={s.fieldLabel}>Total Amount (₹) *</Text>
        <TextInput style={[s.input, { fontWeight: "700" }]} value={amount} onChangeText={setAmount} placeholder="58500" keyboardType="numeric" />

        <Text style={s.fieldHelp}>Formal = receipted, Informal = cash without bill</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Formal (₹)</Text>
            <TextInput style={s.input} value={amountFormal} onChangeText={setAmountFormal} placeholder="0" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Informal (₹)</Text>
            <TextInput style={s.input} value={amountInformal} onChangeText={setAmountInformal} placeholder="0" keyboardType="numeric" />
          </View>
        </View>
      </View>

      {/* Buyer */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Buyer / खरीदार</Text>
        <Text style={s.fieldLabel}>Buyer Name</Text>
        <TextInput style={s.input} value={buyerName} onChangeText={setBuyerName} placeholder="e.g., Mysuru wholesale market" />
        <Text style={s.fieldLabel}>Buyer Type</Text>
        <View style={s.chipRow}>
          {BUYER_TYPES.map((b) => (
            <TouchableOpacity key={b} style={[s.chip, buyerType === b && s.chipSel]} onPress={() => setBuyerType(b)}>
              <Text style={[s.chipText, buyerType === b && s.chipTextSel]}>{b}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.fieldLabel}>Payment Mode</Text>
        <View style={s.chipRow}>
          {(["CASH", "UPI", "BANK", "CREDIT"] as PayMode[]).map((m) => (
            <TouchableOpacity key={m} style={[s.chip, payMode === m && s.chipSel]} onPress={() => setPayMode(m)}>
              <Text style={[s.chipText, payMode === m && s.chipTextSel]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.fieldLabel}>Notes</Text>
        <TextInput style={[s.input, { minHeight: 60 }]} value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
      </View>

      <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Sale / सहेजें</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  back: { fontSize: 28, color: "#00695c", fontWeight: "700" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#00695c" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardLabel: { fontSize: 12, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#555", marginTop: 10, marginBottom: 4 },
  fieldHelp: { fontSize: 11, color: "#999", marginTop: 10, fontStyle: "italic" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: "#fafafa" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catCard: { width: "22%", aspectRatio: 1, borderRadius: 12, borderWidth: 1.5, borderColor: "#e0e0e0", backgroundColor: "#fafafa", justifyContent: "center", alignItems: "center", padding: 6 },
  catCardSel: { borderColor: "#00695c", backgroundColor: "#e0f2f1" },
  catIcon: { fontSize: 22, marginBottom: 4 },
  catLabel: { fontSize: 10, fontWeight: "600", color: "#666", textAlign: "center" },
  catLabelSel: { color: "#00695c" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fafafa" },
  chipSel: { borderColor: "#00695c", backgroundColor: "#e0f2f1" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#666" },
  chipTextSel: { color: "#00695c" },
  saveBtn: { backgroundColor: "#00695c", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
