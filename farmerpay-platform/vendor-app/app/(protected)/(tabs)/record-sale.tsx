/**
 * Record Sale — Vendor records what a farmer purchased.
 * Refactored to use:
 * - src/api/modules
 * - src/hooks
 * - src/components
 * - src/utils
 *
 * Supports:
 * - Multi-item cart
 * - Farmer search
 * - Season auto-detect
 * - Success screen
 */

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";

import { formatRupees } from "../../../lib/api";

import CatalogItemChip from "../../../src/components/CatalogItemChip";
import CartItemCard from "../../../src/components/CartItemCard";
import CartSummary from "../../../src/components/CartSummary";
import FarmerSearchInput from "../../../src/components/FarmerSearchInput";
import PaymentTypeSelector from "../../../src/components/PaymentTypeSelector";
// import SeasonSelector from "../../../src/components/SeasonSelector";

import { useCatalog } from "../../../src/hooks/useCatalog";
import { useCart } from "../../../src/hooks/useCart";
import { useFarmerSearch } from "../../../src/hooks/useFarmerSearch";
import { useRecordSale } from "../../../src/hooks/useRecordSale";

import type { Farmer } from "../../../src/types/farmer.types";
import { detectSeason } from "../../../src/utils/season.util";

type PaymentType = "cash_sale" | "credit_sale";

export default function RecordSaleScreen() {
  // Catalog
  const { catalog, loading: catalogLoading } = useCatalog();

  // Farmer Search
  const [farmerQuery, setFarmerQuery] = useState("");
  const [selectedFarmer, setSelectedFarmer] =
    useState<Farmer | null>(null);

  const {
    farmers,
    loading: farmerLoading,
  } = useFarmerSearch(farmerQuery);

  // Cart
  const {
    cart,
    addToCart,
    incrementQuantity,
    decrementQuantity,
    removeFromCart,
    clearCart,
    isInCart,
    getItemQuantity,
    totalItems,
    uniqueItems,
    totalAmount,
  } = useCart();

  // Payment & Season
  const [paymentType, setPaymentType] =
    useState<PaymentType>("cash_sale");

  // const [season, setSeason] = useState(detectSeason());

  // Submit Hook
  const {
    submitSale,
    submitting,
    transaction,
    error,
    reset,
  } = useRecordSale();

  // Farmer selection
  const handleSelectFarmer = (farmer: Farmer) => {
  console.log(
    "======== SELECTING FARMER ========"
  );

  console.log("selected farmer:", farmer);

  setSelectedFarmer(farmer);

  setFarmerQuery(
    `${farmer.name} (${farmer.mobile})`
  );
};

  // Submit
  const handleSubmit = async () => {
  console.log("======== RECORD SALE CLICKED ========");

  console.log("selectedFarmer:", selectedFarmer);

  console.log("paymentType:", paymentType);

  console.log("cart:", JSON.stringify(cart, null, 2));

  console.log("cart length:", cart.length);

  const success = await submitSale({
    selectedFarmer,
    paymentType,
    cart,
  });

  console.log("======== submitSale START ========");

console.log("selectedFarmer:", selectedFarmer);

console.log("paymentType:", paymentType);

console.log("cart:", JSON.stringify(cart, null, 2));


  console.log("submit success:", success);

  console.log("hook error:", error);

  if (!success) {
    Alert.alert(
      "Error",
      error || "Failed to record sale."
    );

    return;
  }

  Alert.alert(
    "Success",
    "Sale recorded successfully."
  );
};

  // Reset form
  const handleRecordAnother = () => {
    clearCart();
    setSelectedFarmer(null);
    setFarmerQuery("");
    setPaymentType("cash_sale");
    // setSeason(detectSeason());
    reset();
  };


  // Success Screen
  if (transaction) {
    return (
      <View style={styles.successCenter}>
        <Text style={{ fontSize: 64 }}>✅</Text>

        <Text style={styles.successTitle}>
          Sale recorded!
        </Text>

        <Text style={styles.successSub}>
          Transaction #{transaction.transactionId}
        </Text>

        {selectedFarmer && (
          <Text style={styles.successSub}>
            {selectedFarmer.name} ·{" "}
            {selectedFarmer.mobile}
          </Text>
        )}

        <Text style={styles.successAmount}>
          {formatRupees(transaction.amount)}
        </Text>

        <Text style={styles.successMeta}>
          {paymentType === "credit_sale"
            ? "💳 Credit"
            : "💵 Cash"}{" "}
          {/* · {season} */}
        </Text>

        <TouchableOpacity
          style={styles.anotherBtn}
          onPress={handleRecordAnother}
        >
          <Text style={styles.anotherBtnText}>
            + Record another sale
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>
        🛒 Record a sale
      </Text>

      {/* Farmer Search */}
      <Text style={styles.label}>FARMER *</Text>
      <FarmerSearchInput
        query={farmerQuery}
        onChangeQuery={(text) => {
          setFarmerQuery(text);
          // setSelectedFarmer(null);
        }}
        farmers={farmers}
        loading={farmerLoading}
        selectedFarmer={selectedFarmer}
        onSelectFarmer={handleSelectFarmer}
      />

      {/* Catalog */}
      <Text style={styles.label}>
        SELECT ITEMS *
      </Text>

      {catalogLoading ? (
        <ActivityIndicator color="#d97706" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
        >
          {catalog.map((item) => {
  const itemId = Number(
    item.input_item_id ??
    0
  );

  return (
    <CatalogItemChip
      key={itemId}
      item={item}
      onPress={addToCart}
      isInCart={isInCart(itemId)}
      quantity={getItemQuantity(itemId)}
      formatRupees={formatRupees}
    />
  );
})}

          {catalog.length === 0 && (
            <Text
              style={{
                color: "#999",
                fontSize: 12,
              }}
            >
              No catalog items found.
            </Text>
          )}
        </ScrollView>
      )}

      {/* Cart */}
      {cart.length > 0 && (
        <>
          <Text style={styles.label}>CART</Text>

          {cart.map((cartItem) => {
            const itemId = Number(
              cartItem.item.input_item_id ??
              cartItem.item.inputItemId ??
              0
            );

            return (
              <CartItemCard
                key={itemId}
                cartItem={cartItem}
                onIncrement={() =>
                  incrementQuantity(itemId)
                }
                onDecrement={() =>
                  decrementQuantity(itemId)
                }
                onRemove={() =>
                  removeFromCart(itemId)
                }
                formatRupees={formatRupees}
              />
            );
          })}

          <CartSummary
            totalItems={totalItems}
            uniqueItems={uniqueItems}
            totalAmount={totalAmount}
            formatRupees={formatRupees}
          />
        </>
      )}

      {/* Payment */}
      <Text style={styles.label}>PAYMENT</Text>
      <PaymentTypeSelector
        value={paymentType}
        onChange={setPaymentType}
      />

      {/* Season */}
      {/* <Text style={styles.label}>SEASON</Text>
      <SeasonSelector
        value={season}
        onChange={setSeason}
      /> */}

      {/* Submit */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          (submitting || cart.length === 0) &&
            styles.submitBtnDisabled,
        ]}
        onPress={handleSubmit}
        disabled={
          submitting || cart.length === 0
        }
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>
            Record Sale
          </Text>
        )}
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
  submitBtnDisabled: { opacity: 0.5,},
  successCenter: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f0fdf4" },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#16a34a", marginTop: 12 },
  successSub: { fontSize: 14, color: "#666", marginTop: 8 },
  successAmount: { fontSize: 28, fontWeight: "800", color: "#1a1a1a", marginTop: 8 },
  successMeta: { fontSize: 12, color: "#888", marginTop: 4 },
  anotherBtn: { marginTop: 20, backgroundColor: "#d97706", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  anotherBtnText: { color: "#fff", fontWeight: "700" },
});
