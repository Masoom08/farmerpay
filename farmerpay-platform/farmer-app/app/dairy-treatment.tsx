import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { apiGet, apiPost } from "../lib/api";

type TreatmentType = "VACCINATION" | "DEWORMING" | "MASTITIS" | "FEVER" | "INJURY" | "REPRODUCTIVE" | "NUTRITIONAL" | "OTHER";
type VetType = "GOVT" | "PRIVATE" | "PARAVET" | "SELF";
type Outcome = "RECOVERED" | "IMPROVING" | "NO_CHANGE" | "WORSENED" | "DIED";
type PayMode = "CASH" | "UPI" | "BANK" | "CREDIT";

const TREATMENTS: { value: TreatmentType; label: string; icon: string }[] = [
  { value: "VACCINATION",  label: "Vaccine",     icon: "💉" },
  { value: "DEWORMING",    label: "Deworm",      icon: "🪱" },
  { value: "MASTITIS",     label: "Mastitis",    icon: "🩹" },
  { value: "FEVER",        label: "Fever",       icon: "🌡️" },
  { value: "INJURY",       label: "Injury",      icon: "🩸" },
  { value: "REPRODUCTIVE", label: "Reproductive", icon: "🤰" },
  { value: "NUTRITIONAL",  label: "Nutrition",   icon: "🥗" },
  { value: "OTHER",        label: "Other",       icon: "📦" },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function DairyTreatment() {
  const router = useRouter();
  const [animals, setAnimals] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [animalId, setAnimalId] = useState<string | null>(null);
  const [treatmentDate, setTreatmentDate] = useState(today());
  const [treatmentType, setTreatmentType] = useState<TreatmentType>("OTHER");
  const [condition, setCondition] = useState("");
  const [vetName, setVetName] = useState("");
  const [vetType, setVetType] = useState<VetType>("PRIVATE");
  const [medicineCost, setMedicineCost] = useState("");
  const [vetFee, setVetFee] = useState("");
  const [otherCost, setOtherCost] = useState("");
  const [costFormal, setCostFormal] = useState("");
  const [costInformal, setCostInformal] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("CASH");
  const [outcome, setOutcome] = useState<Outcome>("IMPROVING");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const res = await apiGet("/roots/dairy/v2/animals");
      if (res.success) setAnimals(res.data || []);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const body: any = {
        animalId,
        treatmentDate,
        treatmentType,
        condition: condition || null,
        vetName: vetName || null,
        vetType,
        medicineCost: medicineCost ? parseFloat(medicineCost) : 0,
        vetFee: vetFee ? parseFloat(vetFee) : 0,
        otherCost: otherCost ? parseFloat(otherCost) : 0,
        costFormal: costFormal ? parseFloat(costFormal) : 0,
        costInformal: costInformal ? parseFloat(costInformal) : 0,
        paymentMode: payMode,
        outcome,
        notes: notes || null,
      };
      const res = await apiPost("/roots/dairy/v2/treatment", body);
      if (res.success) {
        Alert.alert("Saved", "Treatment logged", [{ text: "OK", onPress: () => router.back() }]);
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
        <Text style={s.headerTitle}>Vet Treatment / उपचार</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>Animal (optional for herd-wide)</Text>
        <View style={s.chipRow}>
          <TouchableOpacity style={[s.chip, !animalId && s.chipSel]} onPress={() => setAnimalId(null)}>
            <Text style={[s.chipText, !animalId && s.chipTextSel]}>Herd-wide</Text>
          </TouchableOpacity>
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

      <View style={s.card}>
        <Text style={s.cardLabel}>Treatment Type / प्रकार</Text>
        <View style={s.grid}>
          {TREATMENTS.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[s.catCard, treatmentType === t.value && s.catCardSel]}
              onPress={() => setTreatmentType(t.value)}
            >
              <Text style={s.catIcon}>{t.icon}</Text>
              <Text style={[s.catLabel, treatmentType === t.value && s.catLabelSel]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.fieldLabel}>Date</Text>
        <TextInput style={s.input} value={treatmentDate} onChangeText={setTreatmentDate} placeholder="YYYY-MM-DD" />

        <Text style={s.fieldLabel}>Condition / रोग</Text>
        <TextInput style={s.input} value={condition} onChangeText={setCondition} placeholder="e.g., Mild mastitis" />

        <Text style={s.fieldLabel}>Vet Name</Text>
        <TextInput style={s.input} value={vetName} onChangeText={setVetName} placeholder="e.g., Dr Basavaraj" />

        <Text style={s.fieldLabel}>Vet Type</Text>
        <View style={s.chipRow}>
          {(["GOVT", "PRIVATE", "PARAVET", "SELF"] as VetType[]).map((v) => (
            <TouchableOpacity key={v} style={[s.chip, vetType === v && s.chipSel]} onPress={() => setVetType(v)}>
              <Text style={[s.chipText, vetType === v && s.chipTextSel]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>Costs / लागत</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Medicine</Text>
            <TextInput style={s.input} value={medicineCost} onChangeText={setMedicineCost} placeholder="420" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Vet Fee</Text>
            <TextInput style={s.input} value={vetFee} onChangeText={setVetFee} placeholder="300" keyboardType="numeric" />
          </View>
        </View>
        <Text style={s.fieldLabel}>Other</Text>
        <TextInput style={s.input} value={otherCost} onChangeText={setOtherCost} placeholder="50" keyboardType="numeric" />

        <Text style={s.fieldHelp}>Formal = receipted; Informal = cash</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Formal (₹)</Text>
            <TextInput style={s.input} value={costFormal} onChangeText={setCostFormal} placeholder="0" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Informal (₹)</Text>
            <TextInput style={s.input} value={costInformal} onChangeText={setCostInformal} placeholder="0" keyboardType="numeric" />
          </View>
        </View>

        <Text style={s.fieldLabel}>Payment</Text>
        <View style={s.chipRow}>
          {(["CASH", "UPI", "BANK", "CREDIT"] as PayMode[]).map((m) => (
            <TouchableOpacity key={m} style={[s.chip, payMode === m && s.chipSel]} onPress={() => setPayMode(m)}>
              <Text style={[s.chipText, payMode === m && s.chipTextSel]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.fieldLabel}>Outcome</Text>
        <View style={s.chipRow}>
          {(["RECOVERED", "IMPROVING", "NO_CHANGE", "WORSENED", "DIED"] as Outcome[]).map((o) => (
            <TouchableOpacity key={o} style={[s.chipSmall, outcome === o && s.chipSel]} onPress={() => setOutcome(o)}>
              <Text style={[s.chipTextSmall, outcome === o && s.chipTextSel]}>{o.replace("_", " ")}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.fieldLabel}>Notes</Text>
        <TextInput style={[s.input, { minHeight: 50 }]} value={notes} onChangeText={setNotes} multiline />
      </View>

      <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Treatment / सहेजें</Text>}
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
  chipSmall: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fafafa" },
  chipSel: { borderColor: "#2e7d32", backgroundColor: "#e8f5e9" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#666" },
  chipTextSmall: { fontSize: 10, fontWeight: "600", color: "#666" },
  chipTextSel: { color: "#1b5e20" },
  saveBtn: { backgroundColor: "#2e7d32", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
