import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";

interface CartSummaryProps {
  totalItems: number;
  uniqueItems: number;
  totalAmount: number;
  formatRupees: (amount: number) => string;
}

const CartSummary: React.FC<CartSummaryProps> = ({
  totalItems,
  uniqueItems,
  totalAmount,
  formatRupees,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cart Summary</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Products</Text>
        <Text style={styles.value}>{uniqueItems}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Units</Text>
        <Text style={styles.value}>{totalItems}</Text>
      </View>

      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>
          {formatRupees(totalAmount)}
        </Text>
      </View>
    </View>
  );
};

export default CartSummary;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  label: {
    fontSize: 14,
    color: "#6b7280",
  },

  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 0,
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#d97706",
  },
});