import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { apiGet, apiPost, formatRupees } from "../lib/api";
import VoiceInputButton from "../components/VoiceInputButton";

type PayMode = "CASH" | "UPI" | "BANK" | "CREDIT";
type BuyerType = "WHOLESALER" | "AUCTION" | "DIRECT" | "EXPORTER" | "COOPERATIVE" | "RESTAURANT" | "OTHER";
type TripStatus = "IN_PROGRESS" | "COMPLETED" | "ABORTED";

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

export default function FisheryTrip() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vessels, setVessels] = useState<any[]>([]);
  const [vesselId, setVesselId] = useState<string | null>(null);

  // Trip fields
  const [departDate, setDepartDate] = useState(yesterday());
  const [returnDate, setReturnDate] = useState(today());
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [iceCost, setIceCost] = useState("");
  const [baitCost, setBaitCost] = useState("");
  const [crewCount, setCrewCount] = useState("");
  const [crewWagesTotal, setCrewWagesTotal] = useState("");
  const [otherCost, setOtherCost] = useState("");

  // Catch + sale
  const [catchTotalKg, setCatchTotalKg] = useState("");
  const [landingPort, setLandingPort] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [saleBuyer, setSaleBuyer] = useState("");
  const [saleBuyerType, setSaleBuyerType] = useState<BuyerType>("AUCTION");
  const [auctionCommission, setAuctionCommission] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("CASH");
  const [status, setStatus] = useState<TripStatus>("COMPLETED");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet("/roots/fishery/v2/vessels");
        if (res.success) {
          setVessels(res.data || []);
          if (res.data && res.data.length > 0) setVesselId(res.data[0].vessel_uuid);
        }
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  // Derived net P&L preview
  const costPreview =
    (parseFloat(fuelCost) || 0) +
    (parseFloat(iceCost) || 0) +
    (parseFloat(baitCost) || 0) +
    (parseFloat(crewWagesTotal) || 0) +
    (parseFloat(otherCost) || 0) +
    (parseFloat(auctionCommission) || 0);
  const revenuePreview = parseFloat(saleAmount) || 0;
  const netPreview = revenuePreview - costPreview;

  const save = async () => {
    if (!vesselId) {
      Alert.alert("Missing", "Select a vessel");
      return;
    }
    if (!departDate) {
      Alert.alert("Missing", "Enter departure date");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        vesselId,
        departDate,
        returnDate: returnDate || null,
        fuelCost: parseFloat(fuelCost) || 0,
        iceCost: parseFloat(iceCost) || 0,
        baitCost: parseFloat(baitCost) || 0,
        crewWagesTotal: parseFloat(crewWagesTotal) || 0,
        otherCost: parseFloat(otherCost) || 0,
        auctionCommission: parseFloat(auctionCommission) || 0,
        paymentMode: payMode,
        status,
        notes: notes || null,
      };
      if (fuelLiters) body.fuelLiters = parseFloat(fuelLiters);
      if (crewCount) body.crewCount = parseInt(crewCount, 10);
      if (catchTotalKg) body.catchTotalKg = parseFloat(catchTotalKg);
      if (landingPort) body.landingPort = landingPort;
      if (saleAmount) {
        body.saleAmount = parseFloat(saleAmount);
        body.saleBuyer = saleBuyer || null;
        body.saleBuyerType = saleBuyerType;
      }

      const res = await apiPost("/roots/fishery/v2/trips", body);
      if (res.success) {
        Alert.alert("Saved", "Trip logged successfully", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", res.message || "Failed to save trip");
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

  if (vessels.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.emptyEmoji}>⛵</Text>
        <Text style={s.emptyTitle}>No vessels yet</Text>
        <Text style={s.emptySub}>Add a vessel first to log trips</Text>
        <TouchableOpacity style={s.emptyBtn} onPress={() => router.replace("/fishery-vessels" as any)}>
          <Text style={s.emptyBtnText}>Add Vessel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Log Trip / यात्रा दर्ज करें</Text>
      </View>

      {/* Vessel selector */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Vessel / नौका</Text>
        <View style={s.chipRow}>
          {vessels.map((v) => (
            <TouchableOpacity key={v.vessel_uuid} style={[s.chip, vesselId === v.vessel_uuid && s.chipSel]} onPress={() => setVesselId(v.vessel_uuid)}>
              <Text style={[s.chipText, vesselId === v.vessel_uuid && s.chipTextSel]}>⛵ {v.vessel_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Dates */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Dates / तिथियाँ</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Depart *</Text>
            <TextInput style={s.input} value={departDate} onChangeText={setDepartDate} placeholder="YYYY-MM-DD" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Return</Text>
            <TextInput style={s.input} value={returnDate} onChangeText={setReturnDate} placeholder="YYYY-MM-DD" />
          </View>
        </View>
        <Text style={s.fieldLabel}>Status</Text>
        <View style={s.chipRow}>
          {(["IN_PROGRESS", "COMPLETED", "ABORTED"] as TripStatus[]).map((st) => (
            <TouchableOpacity key={st} style={[s.chip, status === st && s.chipSel]} onPress={() => setStatus(st)}>
              <Text style={[s.chipText, status === st && s.chipTextSel]}>{st.replace(/_/g, " ")}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Costs */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Trip Costs / यात्रा खर्च</Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Fuel Liters</Text>
            <TextInput style={s.input} value={fuelLiters} onChangeText={setFuelLiters} placeholder="44" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Fuel Cost (₹)</Text>
            <TextInput style={s.input} value={fuelCost} onChangeText={setFuelCost} placeholder="4200" keyboardType="numeric" />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Ice Cost (₹)</Text>
            <TextInput style={s.input} value={iceCost} onChangeText={setIceCost} placeholder="800" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Bait Cost (₹)</Text>
            <TextInput style={s.input} value={baitCost} onChangeText={setBaitCost} placeholder="400" keyboardType="numeric" />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Crew Count</Text>
            <TextInput style={s.input} value={crewCount} onChangeText={setCrewCount} placeholder="4" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Crew Wages (₹)</Text>
            <TextInput style={s.input} value={crewWagesTotal} onChangeText={setCrewWagesTotal} placeholder="3200" keyboardType="numeric" />
          </View>
        </View>

        <Text style={s.fieldLabel}>Other Cost (₹)</Text>
        <TextInput style={s.input} value={otherCost} onChangeText={setOtherCost} placeholder="200" keyboardType="numeric" />
      </View>

      {/* Catch + Sale */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Catch & Sale / पकड़ और बिक्री</Text>

        <Text style={s.fieldLabel}>Total Catch (kg)</Text>
        <TextInput style={s.input} value={catchTotalKg} onChangeText={setCatchTotalKg} placeholder="180" keyboardType="numeric" />

        <Text style={s.fieldLabel}>Landing Port</Text>
        <TextInput style={s.input} value={landingPort} onChangeText={setLandingPort} placeholder="e.g., Mangalore auction hall" />

        <Text style={s.fieldLabel}>Sale Amount (₹)</Text>
        <TextInput style={[s.input, { fontWeight: "700" }]} value={saleAmount} onChangeText={setSaleAmount} placeholder="36000" keyboardType="numeric" />

        <Text style={s.fieldLabel}>Buyer</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput style={[s.input, { flex: 1 }]} value={saleBuyer} onChangeText={setSaleBuyer} placeholder="e.g., Mangalore wholesale buyer" />
          <VoiceInputButton onResult={setSaleBuyer} language="hi" />
        </View>

        <Text style={s.fieldLabel}>Buyer Type</Text>
        <View style={s.chipRow}>
          {(["WHOLESALER", "AUCTION", "DIRECT", "EXPORTER", "COOPERATIVE"] as BuyerType[]).map((b) => (
            <TouchableOpacity key={b} style={[s.chip, saleBuyerType === b && s.chipSel]} onPress={() => setSaleBuyerType(b)}>
              <Text style={[s.chipText, saleBuyerType === b && s.chipTextSel]}>{b}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.fieldLabel}>Auction Commission (₹)</Text>
        <TextInput style={s.input} value={auctionCommission} onChangeText={setAuctionCommission} placeholder="1800" keyboardType="numeric" />

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

      {/* Net preview */}
      <View style={s.previewCard}>
        <Text style={s.previewLabel}>Trip Net Preview</Text>
        <View style={s.previewRow}>
          <Text style={s.previewItemLabel}>Revenue</Text>
          <Text style={[s.previewItemVal, { color: "#00695c" }]}>{formatRupees(revenuePreview)}</Text>
        </View>
        <View style={s.previewRow}>
          <Text style={s.previewItemLabel}>Cost</Text>
          <Text style={[s.previewItemVal, { color: "#c62828" }]}>{formatRupees(costPreview)}</Text>
        </View>
        <View style={[s.previewRow, { borderTopWidth: 1, borderTopColor: "#e0e0e0", paddingTop: 8, marginTop: 6 }]}>
          <Text style={[s.previewItemLabel, { fontWeight: "700" }]}>Net</Text>
          <Text style={[s.previewItemVal, { color: netPreview >= 0 ? "#00695c" : "#c62828", fontSize: 16 }]}>
            {formatRupees(netPreview)}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Trip / सहेजें</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5", padding: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  back: { fontSize: 28, color: "#00695c", fontWeight: "700" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#00695c" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardLabel: { fontSize: 12, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#555", marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: "#fafafa" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fafafa" },
  chipSel: { borderColor: "#00695c", backgroundColor: "#e0f2f1" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#666" },
  chipTextSel: { color: "#00695c" },
  previewCard: { backgroundColor: "#e0f2f1", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#80cbc4" },
  previewLabel: { fontSize: 12, fontWeight: "700", color: "#00695c", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  previewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  previewItemLabel: { fontSize: 13, color: "#555" },
  previewItemVal: { fontSize: 14, fontWeight: "700" },
  saveBtn: { backgroundColor: "#00695c", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  emptyEmoji: { fontSize: 64, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  emptySub: { fontSize: 13, color: "#888", marginTop: 4, marginBottom: 20 },
  emptyBtn: { backgroundColor: "#00695c", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  emptyBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
