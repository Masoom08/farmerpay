import { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { apiGet, apiPost, formatRupees } from "../lib/api";

type WaterSource = "well" | "canal" | "river" | "rainwater" | "groundwater";
const WATER_SOURCES: WaterSource[] = ["well", "canal", "river", "rainwater", "groundwater"];

export default function FisheryPonds() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ponds, setPonds] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [depth, setDepth] = useState("");
  const [waterSource, setWaterSource] = useState<WaterSource>("groundwater");
  const [species, setSpecies] = useState("");
  const [constructionCost, setConstructionCost] = useState("");
  const [constructionCostFormal, setConstructionCostFormal] = useState("");
  const [constructionCostInformal, setConstructionCostInformal] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet("/roots/fishery/v2/ponds");
      if (res.success) setPonds(res.data || []);
    } catch (e) {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!name.trim() || !area) {
      Alert.alert("Missing", "Enter pond name and area");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        pondName: name.trim(),
        pondAreaHectares: parseFloat(area),
        waterSource,
        currentSpecies: species || null,
        notes: notes || null,
      };
      if (depth) body.pondDepthMeters = parseFloat(depth);
      if (constructionCost) {
        body.constructionCost = parseFloat(constructionCost);
        body.constructionDate = new Date().toISOString().slice(0, 10);
        if (constructionCostFormal) body.constructionCostFormal = parseFloat(constructionCostFormal);
        if (constructionCostInformal) body.constructionCostInformal = parseFloat(constructionCostInformal);
      }
      const res = await apiPost("/roots/fishery/v2/ponds", body);
      if (res.success) {
        Alert.alert("Saved", "Pond added successfully");
        setName(""); setArea(""); setDepth(""); setSpecies("");
        setConstructionCost(""); setConstructionCostFormal(""); setConstructionCostInformal("");
        setNotes(""); setShowForm(false);
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
        <Text style={s.headerTitle}>My Ponds / मेरे तालाब</Text>
        <TouchableOpacity onPress={() => setShowForm((v) => !v)}>
          <Text style={s.add}>{showForm ? "✕" : "+"}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={s.card}>
          <Text style={s.cardLabel}>Add New Pond / नया तालाब</Text>

          <Text style={s.fieldLabel}>Pond Name *</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g., Rohu Pond 1" />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Area (hectares) *</Text>
              <TextInput style={s.input} value={area} onChangeText={setArea} placeholder="1.2" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Depth (m)</Text>
              <TextInput style={s.input} value={depth} onChangeText={setDepth} placeholder="2.5" keyboardType="numeric" />
            </View>
          </View>

          <Text style={s.fieldLabel}>Water Source</Text>
          <View style={s.chipRow}>
            {WATER_SOURCES.map((w) => (
              <TouchableOpacity key={w} style={[s.chip, waterSource === w && s.chipSel]} onPress={() => setWaterSource(w)}>
                <Text style={[s.chipText, waterSource === w && s.chipTextSel]}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.fieldLabel}>Current Species</Text>
          <TextInput style={s.input} value={species} onChangeText={setSpecies} placeholder="e.g., Rohu, Catla" />

          <Text style={s.fieldLabel}>Construction Cost (₹)</Text>
          <TextInput style={s.input} value={constructionCost} onChangeText={setConstructionCost} placeholder="85000" keyboardType="numeric" />
          {constructionCost && (
            <>
              <Text style={s.fieldHelp}>Formal = receipted, Informal = cash without bill</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Formal (₹)</Text>
                  <TextInput style={s.input} value={constructionCostFormal} onChangeText={setConstructionCostFormal} placeholder="50000" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Informal (₹)</Text>
                  <TextInput style={s.input} value={constructionCostInformal} onChangeText={setConstructionCostInformal} placeholder="35000" keyboardType="numeric" />
                </View>
              </View>
            </>
          )}

          <Text style={s.fieldLabel}>Notes</Text>
          <TextInput style={[s.input, { minHeight: 60 }]} value={notes} onChangeText={setNotes} placeholder="Optional" multiline />

          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Pond / सहेजें</Text>}
          </TouchableOpacity>
        </View>
      )}

      {ponds.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyEmoji}>🏞️</Text>
          <Text style={s.emptyText}>No ponds yet. Tap + to add one.</Text>
        </View>
      ) : (
        ponds.map((p) => (
          <View key={p.pond_uuid} style={s.pondCard}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Text style={s.pondEmoji}>🏞️</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.pondName}>{p.pond_name || "Unnamed pond"}</Text>
                <Text style={s.pondSub}>
                  {parseFloat(p.pond_area_hectares || 0).toFixed(2)} ha · {p.water_source || "—"}
                </Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: p.status === "ACTIVE" ? "#e0f2f1" : "#fbe9e7" }]}>
                <Text style={[s.statusText, { color: p.status === "ACTIVE" ? "#00695c" : "#d84315" }]}>{p.status}</Text>
              </View>
            </View>
            {p.current_species && (
              <View style={s.pondDetail}>
                <Text style={s.pondDetailLabel}>Current cycle:</Text>
                <Text style={s.pondDetailVal}>{p.current_species}</Text>
              </View>
            )}
            {p.construction_cost && (
              <View style={s.pondDetail}>
                <Text style={s.pondDetailLabel}>Construction cost:</Text>
                <Text style={s.pondDetailVal}>{formatRupees(Number(p.construction_cost))}</Text>
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
  pondCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  pondEmoji: { fontSize: 28, marginRight: 10 },
  pondName: { fontSize: 15, fontWeight: "700", color: "#333" },
  pondSub: { fontSize: 12, color: "#888", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "700" },
  pondDetail: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  pondDetailLabel: { fontSize: 12, color: "#666" },
  pondDetailVal: { fontSize: 12, fontWeight: "600", color: "#333" },
});
