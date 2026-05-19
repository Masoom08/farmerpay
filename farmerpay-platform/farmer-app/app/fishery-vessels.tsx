import { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { apiGet, apiPost, formatRupees } from "../lib/api";

type VesselType = "CATAMARAN" | "MECHANIZED_BOAT" | "TRAWLER" | "CANOE" | "OTHER";
type FuelType = "DIESEL" | "PETROL" | "KEROSENE" | "NONE";

const VESSEL_TYPES: VesselType[] = ["CATAMARAN", "MECHANIZED_BOAT", "TRAWLER", "CANOE", "OTHER"];
const FUEL_TYPES: FuelType[] = ["DIESEL", "PETROL", "KEROSENE", "NONE"];

export default function FisheryVessels() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vessels, setVessels] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [regNum, setRegNum] = useState("");
  const [vesselType, setVesselType] = useState<VesselType>("MECHANIZED_BOAT");
  const [lengthM, setLengthM] = useState("");
  const [engineHp, setEngineHp] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("DIESEL");
  const [crewSize, setCrewSize] = useState("");
  const [homePort, setHomePort] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [purchaseCostFormal, setPurchaseCostFormal] = useState("");
  const [purchaseCostInformal, setPurchaseCostInformal] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet("/roots/fishery/v2/vessels");
      if (res.success) setVessels(res.data || []);
    } catch (e) {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resetForm = () => {
    setName(""); setRegNum(""); setVesselType("MECHANIZED_BOAT"); setLengthM("");
    setEngineHp(""); setFuelType("DIESEL"); setCrewSize(""); setHomePort("");
    setPurchaseCost(""); setPurchaseCostFormal(""); setPurchaseCostInformal(""); setNotes("");
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Missing", "Enter vessel name");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        vesselName: name.trim(),
        registrationNumber: regNum || null,
        vesselType,
        fuelType,
        homePort: homePort || null,
        notes: notes || null,
        acquisitionMode: "PURCHASED",
      };
      if (lengthM) body.lengthMeters = parseFloat(lengthM);
      if (engineHp) body.engineHp = parseFloat(engineHp);
      if (crewSize) body.crewSize = parseInt(crewSize, 10);
      if (purchaseCost) {
        body.purchaseCost = parseFloat(purchaseCost);
        body.purchaseDate = new Date().toISOString().slice(0, 10);
        if (purchaseCostFormal) body.purchaseCostFormal = parseFloat(purchaseCostFormal);
        if (purchaseCostInformal) body.purchaseCostInformal = parseFloat(purchaseCostInformal);
      }
      const res = await apiPost("/roots/fishery/v2/vessels", body);
      if (res.success) {
        Alert.alert("Saved", "Vessel added successfully");
        resetForm();
        setShowForm(false);
        load();
      } else {
        Alert.alert("Error", res.message || "Failed to save");
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
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>My Vessels / मेरी नौकाएँ</Text>
        <TouchableOpacity onPress={() => setShowForm((v) => !v)}>
          <Text style={s.add}>{showForm ? "✕" : "+"}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={s.card}>
          <Text style={s.cardLabel}>Add New Vessel / नई नौका</Text>

          <Text style={s.fieldLabel}>Vessel Name *</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g., Ganga Matha" />

          <Text style={s.fieldLabel}>Registration Number</Text>
          <TextInput style={s.input} value={regNum} onChangeText={setRegNum} placeholder="e.g., KA-MYS-FSH-4421" autoCapitalize="characters" />

          <Text style={s.fieldLabel}>Vessel Type</Text>
          <View style={s.chipRow}>
            {VESSEL_TYPES.map((v) => (
              <TouchableOpacity key={v} style={[s.chip, vesselType === v && s.chipSel]} onPress={() => setVesselType(v)}>
                <Text style={[s.chipText, vesselType === v && s.chipTextSel]}>{v.replace(/_/g, " ")}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Length (m)</Text>
              <TextInput style={s.input} value={lengthM} onChangeText={setLengthM} placeholder="9.5" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Engine HP</Text>
              <TextInput style={s.input} value={engineHp} onChangeText={setEngineHp} placeholder="75" keyboardType="numeric" />
            </View>
          </View>

          <Text style={s.fieldLabel}>Fuel Type</Text>
          <View style={s.chipRow}>
            {FUEL_TYPES.map((f) => (
              <TouchableOpacity key={f} style={[s.chip, fuelType === f && s.chipSel]} onPress={() => setFuelType(f)}>
                <Text style={[s.chipText, fuelType === f && s.chipTextSel]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Crew Size</Text>
              <TextInput style={s.input} value={crewSize} onChangeText={setCrewSize} placeholder="4" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Home Port</Text>
              <TextInput style={s.input} value={homePort} onChangeText={setHomePort} placeholder="Mangalore" />
            </View>
          </View>

          <Text style={s.fieldLabel}>Purchase Cost (₹)</Text>
          <TextInput style={s.input} value={purchaseCost} onChangeText={setPurchaseCost} placeholder="480000" keyboardType="numeric" />
          {purchaseCost && (
            <>
              <Text style={s.fieldHelp}>Formal = receipted, Informal = cash without bill</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Formal (₹)</Text>
                  <TextInput style={s.input} value={purchaseCostFormal} onChangeText={setPurchaseCostFormal} placeholder="300000" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Informal (₹)</Text>
                  <TextInput style={s.input} value={purchaseCostInformal} onChangeText={setPurchaseCostInformal} placeholder="180000" keyboardType="numeric" />
                </View>
              </View>
            </>
          )}

          <Text style={s.fieldLabel}>Notes</Text>
          <TextInput style={[s.input, { minHeight: 60 }]} value={notes} onChangeText={setNotes} placeholder="Optional" multiline />

          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Vessel / सहेजें</Text>}
          </TouchableOpacity>
        </View>
      )}

      {vessels.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyEmoji}>⛵</Text>
          <Text style={s.emptyText}>No vessels yet. Tap + to add one.</Text>
        </View>
      ) : (
        vessels.map((v) => (
          <View key={v.vessel_uuid} style={s.vesselCard}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Text style={s.vesselEmoji}>⛵</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.vesselName}>{v.vessel_name || "Unnamed vessel"}</Text>
                <Text style={s.vesselSub}>
                  {(v.vessel_type || "").replace(/_/g, " ")} · {v.home_port || "—"}
                </Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: v.status === "ACTIVE" ? "#e0f2f1" : "#fbe9e7" }]}>
                <Text style={[s.statusText, { color: v.status === "ACTIVE" ? "#00695c" : "#d84315" }]}>{v.status}</Text>
              </View>
            </View>
            {v.registration_number && (
              <View style={s.vesselDetail}>
                <Text style={s.vesselDetailLabel}>Reg:</Text>
                <Text style={s.vesselDetailVal}>{v.registration_number}</Text>
              </View>
            )}
            {v.engine_hp && (
              <View style={s.vesselDetail}>
                <Text style={s.vesselDetailLabel}>Engine:</Text>
                <Text style={s.vesselDetailVal}>{v.engine_hp} HP {v.fuel_type ? `· ${v.fuel_type}` : ""}</Text>
              </View>
            )}
            {v.purchase_cost && (
              <View style={s.vesselDetail}>
                <Text style={s.vesselDetailLabel}>Purchase cost:</Text>
                <Text style={s.vesselDetailVal}>{formatRupees(Number(v.purchase_cost))}</Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  back: { fontSize: 28, color: "#00695c", fontWeight: "700", width: 40 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#00695c" },
  add: { fontSize: 28, color: "#00695c", fontWeight: "700", width: 40, textAlign: "right" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardLabel: { fontSize: 12, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#555", marginTop: 10, marginBottom: 4 },
  fieldHelp: { fontSize: 11, color: "#999", marginTop: 6, fontStyle: "italic" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: "#fafafa" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fafafa" },
  chipSel: { borderColor: "#00695c", backgroundColor: "#e0f2f1" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#666" },
  chipTextSel: { color: "#00695c" },
  saveBtn: { backgroundColor: "#00695c", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 14 },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  emptyCard: { backgroundColor: "#fff", borderRadius: 16, padding: 32, alignItems: "center" },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: 13, color: "#888" },
  vesselCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  vesselEmoji: { fontSize: 28, marginRight: 10 },
  vesselName: { fontSize: 15, fontWeight: "700", color: "#333" },
  vesselSub: { fontSize: 12, color: "#888", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "700" },
  vesselDetail: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  vesselDetailLabel: { fontSize: 12, color: "#666" },
  vesselDetailVal: { fontSize: 12, fontWeight: "600", color: "#333" },
});
