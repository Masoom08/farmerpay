/**
 * Record Sale — Vendor records what a farmer purchased.
 * Select farmer → pick items from catalog → quantity → cash/credit → done.
 */
import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { apiGet, apiPost, formatRupees } from "../../lib/api";

export default function RecordSaleScreen() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [farmerMobile, setFarmerMobile] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");
  const [paymentType, setPaymentType] = useState<"cash_sale" | "credit_sale">("cash_sale");
  const [season, setSeason] = useState("kharif");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    apiGet("/vyapar/catalog")
      .then((r) => { if (r.success && Array.isArray(r.data)) setCatalog(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cost = selectedItem ? (selectedItem.vendor_selling_price || selectedItem.vendorSellingPrice || 0) * (parseInt(quantity, 10) || 1) : 0;

  const handleSubmit = async () => {
    if (!farmerMobile || farmerMobile.replace(/\D/g, "").length < 10) { Alert.alert("Enter farmer mobile"); return; }
    if (!selectedItem) { Alert.alert("Select an item"); return; }

    setSubmitting(true);
    try {
      const r = await apiPost("/vyapar/transactions", {
        farmerId: null, // Backend resolves from mobile
        farmerMobile: farmerMobile.replace(/\D/g, "").slice(-10),
        transactionType: paymentType,
        transactionDate: new Date().toISOString().slice(0, 10),
        season,
        items: [{
          inputItemId: selectedItem.input_item_id || selectedItem.inputItemId,
          inputPackId: selectedItem.input_pack_id || selectedItem.inputPackId,
          quantity: parseInt(quantity, 10) || 1,
        }],
      });
      if (r.success) setSubmitted(true);
      else Alert.alert("Error", r.message || "Failed to record sale.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Connection failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.successCenter}>
        <Text style={{ fontSize: 64 }}>✅</Text>
        <Text style={styles.successTitle}>Sale recorded!</Text>
        <Text style={styles.successSub}>{quantity}x {selectedItem?.input_item_id || "item"} → Farmer {farmerMobile}</Text>
        <Text style={styles.successAmount}>{formatRupees(cost)}</Text>
        <Text style={styles.successMeta}>{paymentType === "credit_sale" ? "💳 Credit" : "💵 Cash"} · {season}</Text>
        <TouchableOpacity style={styles.anotherBtn} onPress={() => { setSubmitted(false); setSelectedItem(null); setFarmerMobile(""); setQuantity("1"); }}>
          <Text style={styles.anotherBtnText}>+ Record another sale</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🛒 Record a sale</Text>

      {/* Farmer mobile */}
      <Text style={styles.label}>FARMER MOBILE *</Text>
      <TextInput style={styles.input} placeholder="Farmer's 10-digit mobile" value={farmerMobile} onChangeText={(t) => setFarmerMobile(t.replace(/[^0-9+]/g, ""))} keyboardType="phone-pad" maxLength={13} />

      {/* Item selection */}
      <Text style={styles.label}>SELECT ITEM *</Text>
      {loading ? <ActivityIndicator color="#d97706" /> : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {catalog.map((item, i) => {
            const itemId = item.input_item_id || item.inputItemId || `item-${i}`;
            const price = item.vendor_selling_price || item.vendorSellingPrice || 0;
            const isSelected = selectedItem && (selectedItem.input_item_id || selectedItem.inputItemId) === itemId;
            return (
              <TouchableOpacity key={i} style={[styles.itemChip, isSelected && styles.itemChipActive]} onPress={() => setSelectedItem(item)}>
                <Text style={[styles.itemChipText, isSelected && { color: "#fff" }]}>{itemId}</Text>
                <Text style={[styles.itemChipPrice, isSelected && { color: "#fef3c7" }]}>{formatRupees(price)}</Text>
              </TouchableOpacity>
            );
          })}
          {catalog.length === 0 && <Text style={{ color: "#999", fontSize: 12 }}>No catalog items. Add items in Catalog tab first.</Text>}
        </ScrollView>
      )}

      {/* Quantity */}
      <Text style={styles.label}>QUANTITY</Text>
      <View style={styles.qtyRow}>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(String(Math.max(1, (parseInt(quantity, 10) || 1) - 1)))}>
          <Text style={styles.qtyBtnText}>−</Text>
        </TouchableOpacity>
        <TextInput style={styles.qtyInput} value={quantity} onChangeText={setQuantity} keyboardType="numeric" textAlign="center" />
        <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(String((parseInt(quantity, 10) || 0) + 1))}>
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
        <Text style={styles.totalText}>= {formatRupees(cost)}</Text>
      </View>

      {/* Payment type */}
      <Text style={styles.label}>PAYMENT</Text>
      <View style={styles.payRow}>
        <TouchableOpacity style={[styles.payBtn, paymentType === "cash_sale" && styles.payBtnActive]} onPress={() => setPaymentType("cash_sale")}>
          <Text style={[styles.payBtnText, paymentType === "cash_sale" && { color: "#16a34a" }]}>💵 Cash</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.payBtn, paymentType === "credit_sale" && styles.payBtnActiveCredit]} onPress={() => setPaymentType("credit_sale")}>
          <Text style={[styles.payBtnText, paymentType === "credit_sale" && { color: "#dc2626" }]}>💳 Credit</Text>
        </TouchableOpacity>
      </View>

      {/* Season */}
      <Text style={styles.label}>SEASON</Text>
      <View style={styles.payRow}>
        {["kharif", "rabi", "zaid"].map((s) => (
          <TouchableOpacity key={s} style={[styles.seasonBtn, season === s && styles.seasonBtnActive]} onPress={() => setSeason(s)}>
            <Text style={[styles.seasonBtnText, season === s && { color: "#fff" }]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Submit */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Record Sale</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fffbeb" },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginBottom: 16 },
  label: { fontSize: 11, fontWeight: "800", color: "#888", letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 14, fontSize: 16 },

  itemChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e5e7eb", marginRight: 8, minWidth: 100 },
  itemChipActive: { backgroundColor: "#d97706", borderColor: "#d97706" },
  itemChipText: { fontSize: 12, fontWeight: "600", color: "#333" },
  itemChipPrice: { fontSize: 11, color: "#888", marginTop: 2 },

  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#d1d5db", justifyContent: "center", alignItems: "center" },
  qtyBtnText: { fontSize: 20, fontWeight: "700" },
  qtyInput: { width: 60, backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 10, fontSize: 18, fontWeight: "700" },
  totalText: { fontSize: 18, fontWeight: "800", color: "#d97706", marginLeft: 8 },

  payRow: { flexDirection: "row", gap: 8 },
  payBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#d1d5db", alignItems: "center" },
  payBtnActive: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  payBtnActiveCredit: { borderColor: "#dc2626", backgroundColor: "#fef2f2" },
  payBtnText: { fontWeight: "700", fontSize: 13, color: "#555" },

  seasonBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", alignItems: "center" },
  seasonBtnActive: { backgroundColor: "#d97706", borderColor: "#d97706" },
  seasonBtnText: { fontSize: 12, fontWeight: "600", color: "#555" },

  submitBtn: { marginTop: 24, backgroundColor: "#d97706", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  successCenter: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f0fdf4" },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#16a34a", marginTop: 12 },
  successSub: { fontSize: 14, color: "#666", marginTop: 8 },
  successAmount: { fontSize: 28, fontWeight: "800", color: "#1a1a1a", marginTop: 8 },
  successMeta: { fontSize: 12, color: "#888", marginTop: 4 },
  anotherBtn: { marginTop: 20, backgroundColor: "#d97706", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  anotherBtnText: { color: "#fff", fontWeight: "700" },
});
