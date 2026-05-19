import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { apiGet, apiPost, formatRupees } from "../lib/api";

type Category =
  | "MILK_SALE_COOP" | "MILK_SALE_DIRECT" | "ANIMAL_SALE"
  | "CALF_SALE" | "MANURE_SALE" | "INSURANCE_PAYOUT" | "SUBSIDY" | "OTHER";

const CATS: { value: Category; label: string; icon: string }[] = [
  { value: "MILK_SALE_COOP",   label: "Milk → Coop",   icon: "🥛" },
  { value: "MILK_SALE_DIRECT", label: "Milk → Direct", icon: "🏠" },
  { value: "ANIMAL_SALE",      label: "Animal Sale",   icon: "🐄" },
  { value: "CALF_SALE",        label: "Calf Sale",     icon: "🐂" },
  { value: "MANURE_SALE",      label: "Manure",        icon: "♻️" },
  { value: "SUBSIDY",          label: "Subsidy",       icon: "🏛️" },
  { value: "INSURANCE_PAYOUT", label: "Insurance",     icon: "🛡️" },
  { value: "OTHER",            label: "Other",         icon: "📦" },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function DairyLogRevenue() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);

  const [category, setCategory] = useState<Category>("MILK_SALE_COOP");
  const [scope, setScope] = useState<"HERD" | "ANIMAL">("ANIMAL");
  const [animalId, setAnimalId] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState(today());
  const [liters, setLiters] = useState("");
  const [fat, setFat] = useState("");
  const [snf, setSnf] = useState("");
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [notes, setNotes] = useState("");

  const isMilk = category === "MILK_SALE_COOP" || category === "MILK_SALE_DIRECT";

  useEffect(() => {
    (async () => {
      const res = await apiGet("/roots/dairy/v2/animals");
      if (res.success) setAnimals(res.data || []);
    })();
  }, []);

  // auto-calc amount for milk
  useEffect(() => {
    if (isMilk) {
      const l = parseFloat(liters);
      const r = parseFloat(rate);
      if (!isNaN(l) && !isNaN(r)) setAmount((l * r).toFixed(2));
    }
  }, [liters, rate, isMilk]);

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
        payerName: payer || null,
        notes: notes || null,
      };
      if (scope === "ANIMAL") body.animalId = animalId;
      if (isMilk) {
        if (liters) body.quantityLiters = parseFloat(liters);
        if (fat) body.fatPct = parseFloat(fat);
        if (snf) body.snfPct = parseFloat(snf);
        if (rate) body.ratePerLiter = parseFloat(rate);
      }
      const res = await apiPost("/roots/dairy/v2/revenue-events", body);
      if (res.success) {
        Alert.alert("Saved", "Revenue logged successfully", [
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
        <Text style={s.headerTitle}>Log Revenue / आय दर्ज करें</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>Type / प्रकार</Text>
        <View style={s.grid}>
          {CATS.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[s.catCard, category === c.value && s.catCardSel]}
              onPress={() => setCategory(c.value)}
            >
              <Text style={s.catIcon}>{c.icon}</Text>
              <Text style={[s.catLabel, category === c.value && s.catLabelSel]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>Scope</Text>
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

      <View style={s.card}>
        <Text style={s.cardLabel}>Details / विवरण</Text>
        <Text style={s.fieldLabel}>Date</Text>
        <TextInput style={s.input} value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" />

        {isMilk && (
          <>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Liters</Text>
                <TextInput style={s.input} value={liters} onChangeText={setLiters} placeholder="12" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Rate/L (₹)</Text>
                <TextInput style={s.input} value={rate} onChangeText={setRate} placeholder="34" keyboardType="numeric" />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Fat %</Text>
                <TextInput style={s.input} value={fat} onChangeText={setFat} placeholder="4.2" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>SNF %</Text>
                <TextInput style={s.input} value={snf} onChangeText={setSnf} placeholder="8.6" keyboardType="numeric" />
              </View>
            </View>
          </>
        )}

        <Text style={s.fieldLabel}>Total Amount (₹) *</Text>
        <TextInput style={[s.input, { fontWeight: "700", fontSize: 16 }]} value={amount} onChangeText={setAmount} placeholder="408" keyboardType="numeric" />

        <Text style={s.fieldLabel}>Payer / भुगतानकर्ता</Text>
        <TextInput style={s.input} value={payer} onChangeText={setPayer} placeholder="e.g., KMF" />

        <Text style={s.fieldLabel}>Notes</Text>
        <TextInput style={[s.input, { minHeight: 50 }]} value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
      </View>

      <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Revenue / सहेजें</Text>}
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
  saveBtn: { backgroundColor: "#2e7d32", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
