import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { apiGet, apiPost } from "../lib/api";

type Category =
  | "FEED" | "FODDER" | "MEDICINE" | "VET_TREATMENT" | "VACCINATION"
  | "LABOR" | "ELECTRICITY" | "WATER" | "HOUSING" | "EQUIPMENT"
  | "TRANSPORT" | "INSURANCE" | "OTHER";

type PayMode = "CASH" | "UPI" | "BANK" | "CREDIT";

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: "FEED",          label: "Feed",      icon: "🌾" },
  { value: "FODDER",        label: "Fodder",    icon: "🌿" },
  { value: "LABOR",         label: "Labor",     icon: "👷" },
  { value: "MEDICINE",      label: "Medicine",  icon: "💊" },
  { value: "VET_TREATMENT", label: "Vet",       icon: "💉" },
  { value: "VACCINATION",   label: "Vaccine",   icon: "🩹" },
  { value: "ELECTRICITY",   label: "Electric",  icon: "⚡" },
  { value: "WATER",         label: "Water",     icon: "💧" },
  { value: "TRANSPORT",     label: "Transport", icon: "🚚" },
  { value: "EQUIPMENT",     label: "Equipment", icon: "🔧" },
  { value: "OTHER",         label: "Other",     icon: "📦" },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function DairyLogCost() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);

  const [category, setCategory] = useState<Category>("FEED");
  const [scope, setScope] = useState<"HERD" | "ANIMAL">("HERD");
  const [animalId, setAnimalId] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState(today());
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [unitPrice, setUnitPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [amountFormal, setAmountFormal] = useState("");
  const [amountInformal, setAmountInformal] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("CASH");
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const res = await apiGet("/roots/dairy/v2/animals");
      if (res.success) setAnimals(res.data || []);
    })();
  }, []);

  // Auto-calc amount when quantity × unitPrice change
  useEffect(() => {
    const q = parseFloat(quantity);
    const p = parseFloat(unitPrice);
    if (!isNaN(q) && !isNaN(p)) {
      setAmount((q * p).toFixed(2));
    }
  }, [quantity, unitPrice]);

  const save = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      Alert.alert("Missing", "Enter an amount greater than 0");
      return;
    }
    if (scope === "ANIMAL" && !animalId) {
      Alert.alert("Missing", "Select an animal");
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
        paymentMode: payMode,
        vendorName: vendor || null,
        notes: notes || null,
      };
      if (scope === "ANIMAL") body.animalId = animalId;
      if (quantity) body.quantity = parseFloat(quantity);
      if (unit) body.unit = unit;
      if (unitPrice) body.unitPrice = parseFloat(unitPrice);

      const res = await apiPost("/roots/dairy/v2/cost-events", body);
      if (res.success) {
        Alert.alert("Saved", "Cost logged successfully", [
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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Log Expense / खर्च दर्ज करें</Text>
      </View>

      {/* Category */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Category / श्रेणी</Text>
        <View style={s.grid}>
          {CATEGORIES.map((c) => (
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
        <Text style={s.cardLabel}>Scope / दायरा</Text>
        <View style={s.chipRow}>
          <TouchableOpacity style={[s.chip, scope === "HERD" && s.chipSel]} onPress={() => { setScope("HERD"); setAnimalId(null); }}>
            <Text style={[s.chipText, scope === "HERD" && s.chipTextSel]}>Herd-level</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.chip, scope === "ANIMAL" && s.chipSel]} onPress={() => setScope("ANIMAL")}>
            <Text style={[s.chipText, scope === "ANIMAL" && s.chipTextSel]}>Specific animal</Text>
          </TouchableOpacity>
        </View>
        {scope === "ANIMAL" && (
          <View style={{ marginTop: 10 }}>
            <Text style={s.fieldLabel}>Select animal</Text>
            <View style={s.chipRow}>
              {animals.map((a) => (
                <TouchableOpacity
                  key={a.animal_uuid}
                  style={[s.chip, animalId === a.animal_uuid && s.chipSel]}
                  onPress={() => setAnimalId(a.animal_uuid)}
                >
                  <Text style={[s.chipText, animalId === a.animal_uuid && s.chipTextSel]}>
                    {a.name || a.tag_number}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Amount details */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Amount / राशि</Text>

        <Text style={s.fieldLabel}>Date</Text>
        <TextInput style={s.input} value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Quantity</Text>
            <TextInput style={s.input} value={quantity} onChangeText={setQuantity} placeholder="12" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Unit</Text>
            <TextInput style={s.input} value={unit} onChangeText={setUnit} placeholder="kg" />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Unit Price (₹)</Text>
            <TextInput style={s.input} value={unitPrice} onChangeText={setUnitPrice} placeholder="32" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Total (₹) *</Text>
            <TextInput style={[s.input, { fontWeight: "700" }]} value={amount} onChangeText={setAmount} placeholder="384" keyboardType="numeric" />
          </View>
        </View>

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

      {/* Payment & vendor */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Payment / भुगतान</Text>
        <View style={s.chipRow}>
          {(["CASH", "UPI", "BANK", "CREDIT"] as PayMode[]).map((m) => (
            <TouchableOpacity key={m} style={[s.chip, payMode === m && s.chipSel]} onPress={() => setPayMode(m)}>
              <Text style={[s.chipText, payMode === m && s.chipTextSel]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.fieldLabel}>Vendor / विक्रेता</Text>
        <TextInput style={s.input} value={vendor} onChangeText={setVendor} placeholder="e.g., Local agri store" />
        <Text style={s.fieldLabel}>Notes</Text>
        <TextInput style={[s.input, { minHeight: 60 }]} value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
      </View>

      <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Expense / सहेजें</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  back: { fontSize: 28, color: "#1b5e20", fontWeight: "700" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1b5e20" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardLabel: { fontSize: 12, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#555", marginTop: 10, marginBottom: 4 },
  fieldHelp: { fontSize: 11, color: "#999", marginTop: 10, fontStyle: "italic" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: "#fafafa" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catCard: { width: "22%", aspectRatio: 1, borderRadius: 12, borderWidth: 1.5, borderColor: "#e0e0e0", backgroundColor: "#fafafa", justifyContent: "center", alignItems: "center", padding: 6 },
  catCardSel: { borderColor: "#2e7d32", backgroundColor: "#e8f5e9" },
  catIcon: { fontSize: 22, marginBottom: 4 },
  catLabel: { fontSize: 10, fontWeight: "600", color: "#666", textAlign: "center" },
  catLabelSel: { color: "#1b5e20" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fafafa" },
  chipSel: { borderColor: "#2e7d32", backgroundColor: "#e8f5e9" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#666" },
  chipTextSel: { color: "#1b5e20" },
  saveBtn: { backgroundColor: "#2e7d32", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
