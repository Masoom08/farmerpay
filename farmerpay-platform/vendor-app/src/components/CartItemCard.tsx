import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import type { CartItem } from "../types/sale.types";

interface CartItemCardProps {
  cartItem: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  formatRupees: (amount: number) => string;
}

const CartItemCard: React.FC<CartItemCardProps> = ({
  cartItem,
  onIncrement,
  onDecrement,
  onRemove,
  formatRupees,
}) => {
  const item = cartItem.item;

  const itemName =
    item.item_name ||
    item.pack_name ||
    `Item ${item.input_item_id || item.inputItemId}`;

  const subtotal =
    cartItem.quantity * cartItem.price;

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name}>{itemName}</Text>
        <Text style={styles.price}>
          {formatRupees(cartItem.price)} each
        </Text>
        <Text style={styles.subtotal}>
          {formatRupees(subtotal)}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={onDecrement}
        >
          <Text style={styles.qtyButtonText}>−</Text>
        </TouchableOpacity>

        <Text style={styles.quantity}>
          {cartItem.quantity}
        </Text>

        <TouchableOpacity
          style={styles.qtyButton}
          onPress={onIncrement}
        >
          <Text style={styles.qtyButtonText}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
        >
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CartItemCard;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  info: {
    marginBottom: 12,
  },

  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  price: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
  },

  subtotal: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "800",
    color: "#d97706",
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  qtyButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },

  qtyButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  quantity: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },

  removeButton: {
    marginLeft: "auto",
  },

  removeText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "700",
  },
});