/**
 * Record Purchase — Simple form to log an input purchase from a vendor.
 *
 * Query param: ?vendorId=123
 * Posts to: POST /vyapar/farmer/purchase
 */
import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Alert, ActivityIndicator,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { apiGet, apiPost, formatRupees } from "../lib/api";

const SEASONS = [
  { key: "kharif", label: "Kharif" },
  { key: "rabi", label: "Rabi" },
  { key: "zaid", label: "Zaid" },
  { key: "year_round", label: "Year-round" },
];

const PAYMENT_TYPES = [
  { key: "cash", label: "💵 Cash", color: "#16a34a" },
  { key: "credit", label: "💳 Credit", color: "#dc2626" },
  { key: "loan_linked", label: "🏦 Loan-linked", color: "#2563eb" },
];

export default function RecordPurchaseScreen() {
  const router = useRouter();
  const { vendorId } = useLocalSearchParams<{ vendorId: string }>();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [vendorName, setVendorName] = useState("");

  // Form state
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");
  const [cost, setCost] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [season, setSeason] = useState("kharif");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!vendorId) return;
    apiGet(`/vyapar/farmer/vendor/${vendorId}`)
      .then((r) => {
        if (r.success && r.data) {
          setCatalog(Array.isArray(r.data.catalog) ? r.data.catalog : []);
          setVendorName(r.data.vendor?.name || "Vendor");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [vendorId]);

  // Auto-calculate cost when item or quantity changes
  useEffect(() => {
    if (selectedItem && quantity) {
      const q = parseInt(quantity, 10) || 1;
      setCost(String(selectedItem.sellingPrice * q));
    }
  }, [selectedItem, quantity]);

  const handleSubmit = async () => {
    if (!selectedItem) { Alert.alert("Select an item", "Choose what you purchased from the catalog."); return; }
    if (!quantity || parseInt(quantity, 10) <= 0) { Alert.alert("Enter quantity", "How many units did you buy?"); return; }

    setSubmitting(true);
    try {
      const r = await apiPost("/vyapar/farmer/purchase", {
        vendorId: parseInt(vendorId!, 10),
        items: [{
          inputItemId: selectedItem.inputItemId,
          inputPackId: selectedItem.inputPackId,
          quantity: parseInt(quantity, 10),
        }],
        paymentType,
        season,
      });
      if (r.success) {
        setSubmitted(true);
      } else {
        Alert.alert("Error", r.message || "Failed to record purchase.");
      }
    } catch {
      Alert.alert("Error", "Could not connect. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <>
      <Stack.Screen options={{ title: "Record Purchase", headerStyle: { backgroundColor: "#d97706" }, headerTintColor: "#fff" }} />
      <View style={styles.center}><ActivityIndicator size="large" color="#d97706" /></View>
    </>
  );

  if (submitted) return (
    <>
      <Stack.Screen options={{ title: "Purchase Recorded!", headerStyle: { backgroundColor: "#16a34a" }, headerTintColor: "#fff" }} />
      <View style={styles.successCenter}>
        <Text style={{ fontSize: 64 }}>✅</Text>
        <Text style={styles.successTitle}>Purchase recorded!</Text>
        <Text style={styles.successSub}>
          {quantity}x {selectedItem?.inputItemId || "item"} from {vendorName}
        </Text>
        <Text style={styles.successAmount}>{formatRupees(parseFloat(cost || "0"))}</Text>
        <Text style={styles.successMeta}>{PAYMENT_TYPES.find(p => p.key === paymentType)?.label} · {season}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back to Vendor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.anotherBtn} onPress={() => { setSubmitted(false); setSelectedItem(null); setQuantity("1"); setCost(""); }}>
          <Text style={styles.anotherBtnText}>+ Record Another</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <>
      <Stack.Screen options={{ title: `Buy from ${vendorName}`, headerStyle: { backgroundColor: "#d97706" }, headerTintColor: "#fff" }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>🛒 What did you buy?</Text>

        {/* Item selection */}
        <Text style={styles.fieldLabel}>SELECT ITEM</Text>
        {catalog.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>No catalog items. Enter details manually below.</Text></View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {catalog.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.itemChip, selectedItem?.catalogId === item.catalogId && styles.itemChipActive]}
                onPress={() => setSelectedItem(item)}
              >
                <Text style={[styles.itemChipText, selectedItem?.catalogId === item.catalogId && styles.itemChipTextActive]}>
                  {item.inputItemId}
                </Text>
                <Text style={[styles.itemChipPrice, selectedItem?.catalogId === item.catalogId && { color: "#fff" }]}>
                  {formatRupees(item.sellingPrice)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {selectedItem && (
          <View style={styles.selectedCard}>
            <Text style={styles.selectedName}>{selectedItem.inputItemId}</Text>
            <Text style={styles.selectedMeta}>
              Pack: {selectedItem.inputPackId || "Standard"} · Price: {formatRupees(selectedItem.sellingPrice)}
              {selectedItem.mrp > selectedItem.sellingPrice && ` (MRP ${formatRupees(selectedItem.mrp)})`}
            </Text>
          </View>
        )}

        {/* Quantity */}
        <Text style={styles.fieldLabel}>QUANTITY</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(String(Math.max(1, (parseInt(quantity, 10) || 1) - 1)))}>
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.qtyInput}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            textAlign="center"
          />
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(String((parseInt(quantity, 10) || 0) + 1))}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Cost */}
        <Text style={styles.fieldLabel}>TOTAL COST (₹)</Text>
        <TextInput
          style={styles.costInput}
          value={cost}
          onChangeText={setCost}
          keyboardType="numeric"
          placeholder="Auto-calculated from catalog"
        />

        {/* Payment type */}
        <Text style={styles.fieldLabel}>PAYMENT</Text>
        <View style={styles.paymentRow}>
          {PAYMENT_TYPES.map((pt) => (
            <TouchableOpacity
              key={pt.key}
              style={[styles.paymentBtn, paymentType === pt.key && { borderColor: pt.color, backgroundColor: pt.color + "10" }]}
              onPress={() => setPaymentType(pt.key)}
            >
              <Text style={[styles.paymentBtnText, paymentType === pt.key && { color: pt.color }]}>{pt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Season */}
        <Text style={styles.fieldLabel}>SEASON</Text>
        <View style={styles.seasonRow}>
          {SEASONS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.seasonBtn, season === s.key && styles.seasonBtnActive]}
              onPress={() => setSeason(s.key)}
            >
              <Text style={[styles.seasonBtnText, season === s.key && styles.seasonBtnTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary */}
        {selectedItem && cost && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Order Summary</Text>
            <Text style={styles.summaryLine}>{quantity}x {selectedItem.inputItemId}</Text>
            <Text style={styles.summaryTotal}>{formatRupees(parseFloat(cost))}</Text>
            <Text style={styles.summaryMeta}>{PAYMENT_TYPES.find(p => p.key === paymentType)?.label} · {season}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Record Purchase</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fffbeb" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: "800", color: "#888", letterSpacing: 1, marginTop: 16, marginBottom: 6 },

  // Item selection chips
  itemChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e5e7eb", marginRight: 8, minWidth: 100 },
  itemChipActive: { backgroundColor: "#d97706", borderColor: "#d97706" },
  itemChipText: { fontSize: 12, fontWeight: "600", color: "#333" },
  itemChipTextActive: { color: "#fff" },
  itemChipPrice: { fontSize: 11, color: "#888", marginTop: 2 },
  selectedCard: { backgroundColor: "#fff", borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: "#d97706", marginBottom: 4 },
  selectedName: { fontSize: 14, fontWeight: "700", color: "#333" },
  selectedMeta: { fontSize: 11, color: "#888", marginTop: 2 },

  // Quantity
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#d1d5db", justifyContent: "center", alignItems: "center" },
  qtyBtnText: { fontSize: 20, fontWeight: "700", color: "#333" },
  qtyInput: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 12, fontSize: 18, fontWeight: "700" },

  // Cost
  costInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 14, fontSize: 18, fontWeight: "700" },

  // Payment
  paymentRow: { flexDirection: "row", gap: 8 },
  paymentBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#d1d5db", alignItems: "center" },
  paymentBtnText: { fontSize: 12, fontWeight: "700", color: "#555" },

  // Season
  seasonRow: { flexDirection: "row", gap: 8 },
  seasonBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", alignItems: "center" },
  seasonBtnActive: { backgroundColor: "#d97706", borderColor: "#d97706" },
  seasonBtnText: { fontSize: 12, fontWeight: "600", color: "#555" },
  seasonBtnTextActive: { color: "#fff" },

  // Summary
  summaryCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: "#fde68a" },
  summaryLabel: { fontSize: 11, fontWeight: "800", color: "#888", letterSpacing: 1 },
  summaryLine: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 8 },
  summaryTotal: { fontSize: 24, fontWeight: "800", color: "#d97706", marginTop: 4 },
  summaryMeta: { fontSize: 12, color: "#888", marginTop: 4 },

  // Submit
  submitBtn: { marginTop: 20, backgroundColor: "#d97706", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  // Success
  successCenter: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f0fdf4" },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#16a34a", marginTop: 12 },
  successSub: { fontSize: 14, color: "#666", marginTop: 8 },
  successAmount: { fontSize: 28, fontWeight: "800", color: "#1a1a1a", marginTop: 8 },
  successMeta: { fontSize: 12, color: "#888", marginTop: 4 },
  backBtn: { marginTop: 20, paddingVertical: 12 },
  backBtnText: { color: "#059669", fontWeight: "600", fontSize: 14 },
  anotherBtn: { paddingVertical: 8 },
  anotherBtnText: { color: "#d97706", fontWeight: "600", fontSize: 13 },

  emptyCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, alignItems: "center" },
  emptyText: { color: "#999", fontSize: 13 },
});
