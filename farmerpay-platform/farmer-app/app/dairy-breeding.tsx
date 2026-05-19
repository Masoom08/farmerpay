import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import VoiceInputButton from "../components/VoiceInputButton";
import { apiGet, apiPost } from "../lib/api";

type ServiceType = "AI" | "NATURAL_SERVICE";
type ProviderType = "GOVT_VET" | "PRIVATE_VET" | "COOP_INSEMINATOR" | "SELF";
type PayMode = "CASH" | "UPI" | "BANK" | "CREDIT";

const today = () => new Date().toISOString().slice(0, 10);

export default function DairyBreeding() {
  const router = useRouter();
  const [animals, setAnimals] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [animalId, setAnimalId] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType>("AI");
  const [aiDate, setAiDate] = useState(today());
  const [bullCode, setBullCode] = useState("");
  const [breedUsed, setBreedUsed] = useState("");
  const [provider, setProvider] = useState("");
  const [providerType, setProviderType] = useState<ProviderType>("COOP_INSEMINATOR");
  const [serviceCharge, setServiceCharge] = useState("");
  const [transport, setTransport] = useState("");
  const [gratuity, setGratuity] = useState("");
  const [costFormal, setCostFormal] = useState("");
  const [costInformal, setCostInformal] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("CASH");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const res = await apiGet("/roots/dairy/v2/animals");
      if (res.success) setAnimals((res.data || []).filter((a: any) => a.gender === "FEMALE"));
    })();
  }, []);

  const save = async () => {
    if (!animalId) {
      Alert.alert("Missing", "Select an animal");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        animalId,
        serviceType,
        aiDate,
        bullCode: bullCode || null,
        breedUsed: breedUsed || null,
        serviceProvider: provider || null,
        serviceProviderType: providerType,
        serviceCharge: serviceCharge ? parseFloat(serviceCharge) : 0,
        transportCost: transport ? parseFloat(transport) : 0,
        gratuityCost: gratuity ? parseFloat(gratuity) : 0,
        costFormal: costFormal ? parseFloat(costFormal) : 0,
        costInformal: costInformal ? parseFloat(costInformal) : 0,
        paymentMode: payMode,
        notes: notes || null,
      };
      const res = await apiPost("/roots/dairy/v2/breeding", body);
      if (res.success) {
        Alert.alert("Saved", "Breeding event logged", [
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
        <Text style={s.headerTitle}>Breeding / प्रजनन</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>Animal / पशु</Text>
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

      <View style={s.card}>
        <Text style={s.cardLabel}>Service Type / सेवा प्रकार</Text>
        <View style={s.chipRow}>
          <TouchableOpacity style={[s.chip, serviceType === "AI" && s.chipSel]} onPress={() => setServiceType("AI")}>
            <Text style={[s.chipText, serviceType === "AI" && s.chipTextSel]}>🧪 AI (Artificial)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.chip, serviceType === "NATURAL_SERVICE" && s.chipSel]} onPress={() => setServiceType("NATURAL_SERVICE")}>
            <Text style={[s.chipText, serviceType === "NATURAL_SERVICE" && s.chipTextSel]}>🐂 Natural (Bull)</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.fieldLabel}>Service Date</Text>
        <TextInput style={s.input} value={aiDate} onChangeText={setAiDate} placeholder="YYYY-MM-DD" />

        {serviceType === "AI" ? (
          <>
            <Text style={s.fieldLabel}>Bull Code / Semen</Text>
            <TextInput style={s.input} value={bullCode} onChangeText={setBullCode} placeholder="e.g., HF-2301" autoCapitalize="characters" />
            <Text style={s.fieldLabel}>Breed Used</Text>
            <TextInput style={s.input} value={breedUsed} onChangeText={setBreedUsed} placeholder="e.g., HOLSTEIN_FRIESIAN" autoCapitalize="characters" />
          </>
        ) : (
          <>
            <Text style={s.fieldLabel}>Bull ID / Owner</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput style={[s.input, { flex: 1 }]} value={bullCode} onChangeText={setBullCode} placeholder="Village bull / owner name" />
              <VoiceInputButton onResult={setBullCode} language="hi" />
            </View>
          </>
        )}

        <Text style={s.fieldLabel}>Service Provider</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput style={[s.input, { flex: 1 }]} value={provider} onChangeText={setProvider} placeholder="e.g., KMF Cooperative" />
          <VoiceInputButton onResult={setProvider} language="hi" />
        </View>

        <Text style={s.fieldLabel}>Provider Type</Text>
        <View style={s.chipRow}>
          {(["GOVT_VET", "PRIVATE_VET", "COOP_INSEMINATOR", "SELF"] as ProviderType[]).map((p) => (
            <TouchableOpacity key={p} style={[s.chipSmall, providerType === p && s.chipSel]} onPress={() => setProviderType(p)}>
              <Text style={[s.chipTextSmall, providerType === p && s.chipTextSel]}>{p.replace(/_/g, " ")}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>Costs / लागत</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Service Charge</Text>
            <TextInput style={s.input} value={serviceCharge} onChangeText={setServiceCharge} placeholder="250" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Transport</Text>
            <TextInput style={s.input} value={transport} onChangeText={setTransport} placeholder="50" keyboardType="numeric" />
          </View>
        </View>
        <Text style={s.fieldLabel}>Gratuity / Tip</Text>
        <TextInput style={s.input} value={gratuity} onChangeText={setGratuity} placeholder="100" keyboardType="numeric" />

        <Text style={s.fieldHelp}>Receipt split (optional)</Text>
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

        <Text style={s.fieldLabel}>Payment Mode</Text>
        <View style={s.chipRow}>
          {(["CASH", "UPI", "BANK", "CREDIT"] as PayMode[]).map((m) => (
            <TouchableOpacity key={m} style={[s.chip, payMode === m && s.chipSel]} onPress={() => setPayMode(m)}>
              <Text style={[s.chipText, payMode === m && s.chipTextSel]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.fieldLabel}>Notes</Text>
        <TextInput style={[s.input, { minHeight: 50 }]} value={notes} onChangeText={setNotes} multiline />
      </View>

      <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Breeding / सहेजें</Text>}
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fafafa" },
  chipSmall: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fafafa" },
  chipSel: { borderColor: "#2e7d32", backgroundColor: "#e8f5e9" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#666" },
  chipTextSmall: { fontSize: 10, fontWeight: "600", color: "#666" },
  chipTextSel: { color: "#1b5e20" },
  saveBtn: { backgroundColor: "#2e7d32", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
