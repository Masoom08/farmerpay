/**
 * Catalog & Inventory — Vendor manages products, stock, prices.
 */
import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, Modal, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { formatRupees } from "../../../src/utils/currency";
import { useCatalog } from "../../../src/hooks/useCatalog";
import {
  addCatalogItem,
  updateCatalogStock,
} from "../../../src/api/modules/catalog.api";

export default function CatalogScreen() {
  // const [items, setItems] = useState<any[]>([]);
  // const [loading, setLoading] = useState(true);
  const {
  catalog: items,
  loading,
  error,
  refetch,
} = useCatalog();
  const [refreshing, setRefreshing] = useState(false);
  const [addModal, setAddModal] = useState(false);

  // Add form
  const [newItemId, setNewItemId] = useState("");
  const [newPackId, setNewPackId] = useState("");
  const [newMrp, setNewMrp] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("100");
  const [adding, setAdding] = useState(false);

  

  

  const handleAdd = async () => {
    if (!newItemId.trim()) { Alert.alert("Enter item name"); return; }
    if (!newPrice.trim()) { Alert.alert("Enter selling price"); return; }

    setAdding(true);
    try {
      const r = await addCatalogItem({
      itemId: newItemId.trim(),
      packId: newPackId.trim(),
      mrp: parseFloat(newMrp) || parseFloat(newPrice),
      sellingPrice: parseFloat(newPrice),
      stock: parseInt(newStock, 10) || 100,
    });
      if (r.success) {
        Alert.alert("Added!", `${newItemId} added to catalog.`);
        setAddModal(false);
        setNewItemId(""); setNewPackId(""); setNewMrp(""); setNewPrice(""); setNewStock("100");
        await refetch();
      } else {
        Alert.alert("Error", r.message || "Failed to add.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Connection failed.");
    } finally {
      setAdding(false);
    }
  };

  const updateStock = async (catalogId: number, currentStock: number, delta: number) => {
    const newStockVal = Math.max(0, currentStock + delta);
    try {
      await updateCatalogStock(catalogId, { stockQuantity: newStockVal });
      await refetch();
    } catch {
      Alert.alert("Error", "Failed to update stock.");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#d97706" /></View>;

  if (error) {
  return (
    <View style={styles.center}>
      <Text>{error}</Text>
    </View>
  );
}

  const stockColor = (status: string) => {
    if (status === "in_stock") return "#16a34a";
    if (status === "low_stock") return "#d97706";
    return "#dc2626";
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} 
        onRefresh={async () => {
          setRefreshing(true);
          await refetch();
          setRefreshing(false);
        }} 
        colors={["#d97706"]} />}
      >
        {/* Add button */}
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
          <Text style={styles.addBtnText}>➕ Add new product</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>MY CATALOG ({items.length} items)</Text>

        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 40 }}>📦</Text>
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptyText}>Add items to your catalog so farmers can buy from you.</Text>
          </View>
        ) : (
          items.map((item, i) => {
           const id =
  item.input_item_id || `item-${i}`;

const pack =
  item.input_pack_id || "Standard";

const mrp = Number(
  item.mrp_rupees || 0
);

const price = Number(
  item.vendor_selling_price || 0
);

const stock =
  item.stock_quantity ?? 0;

const status =
  item.availability_status ||
  "in_stock";

const catId = item.id || 0;

            return (
              <View key={i} style={styles.itemCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{id}</Text>
                    <Text style={styles.itemPack}>Pack: {pack}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.itemPrice}>{formatRupees(price)}</Text>
                    {mrp > price && <Text style={styles.itemMrp}>MRP {formatRupees(mrp)}</Text>}
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={[styles.stockBadge, { color: stockColor(status) }]}>
                    {status === "in_stock" ? "✓ In Stock" : status === "low_stock" ? "⚠ Low Stock" : "✗ Out of Stock"}
                    {" "}({stock})
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TouchableOpacity style={styles.stockBtn} onPress={() => updateStock(catId, stock, -10)}>
                      <Text style={styles.stockBtnText}>-10</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.stockBtn} onPress={() => updateStock(catId, stock, 10)}>
                      <Text style={styles.stockBtnText}>+10</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add product modal */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Product</Text>

            <Text style={styles.label}>Item Name *</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. DAP-FERTILIZER" value={newItemId} onChangeText={setNewItemId} autoCapitalize="characters" />

            <Text style={styles.label}>Pack Id</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. PK-1, PACK-2" value={newPackId} onChangeText={setNewPackId} />

            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>MRP (₹)</Text>
                <TextInput style={styles.modalInput} placeholder="MRP" value={newMrp} onChangeText={setNewMrp} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Your Price (₹) *</Text>
                <TextInput style={styles.modalInput} placeholder="Selling price" value={newPrice} onChangeText={setNewPrice} keyboardType="numeric" />
              </View>
            </View>

            <Text style={styles.label}>Initial Stock</Text>
            <TextInput style={styles.modalInput} placeholder="100" value={newStock} onChangeText={setNewStock} keyboardType="numeric" />

            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#f3f4f6" }]} onPress={() => setAddModal(false)}>
                <Text style={{ color: "#666", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#d97706" }]} onPress={handleAdd} disabled={adding}>
                {adding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Add Item</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fffbeb" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#888", letterSpacing: 1, marginBottom: 8 },

  addBtn: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: "#d97706", borderStyle: "dashed", alignItems: "center" },
  addBtnText: { color: "#d97706", fontWeight: "700", fontSize: 14 },

  itemCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8 },
  itemName: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  itemPack: { fontSize: 11, color: "#888", marginTop: 2 },
  itemPrice: { fontSize: 16, fontWeight: "800", color: "#d97706" },
  itemMrp: { fontSize: 10, color: "#999", textDecorationLine: "line-through" },
  stockBadge: { fontSize: 12, fontWeight: "600" },
  stockBtn: { backgroundColor: "#f3f4f6", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  stockBtnText: { fontSize: 11, fontWeight: "700", color: "#555" },

  emptyCard: { backgroundColor: "#fff", borderRadius: 14, padding: 24, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginTop: 8 },
  emptyText: { color: "#999", textAlign: "center", marginTop: 6, fontSize: 13 },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#333", textAlign: "center", marginBottom: 12 },
  label: { fontSize: 11, fontWeight: "700", color: "#555", marginTop: 8, marginBottom: 4 },
  modalInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 12, fontSize: 14 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
});
