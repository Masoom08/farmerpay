import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from "react-native";

import type { CatalogItem } from "../types/sale.types";

interface CatalogItemChipProps {
  item: CatalogItem;
  onPress: (item: CatalogItem) => void;
  isInCart?: boolean;
  quantity?: number;
  formatRupees: (amount: number) => string;
}

const CatalogItemChip: React.FC<CatalogItemChipProps> = ({
  item,
  onPress,
  isInCart = false,
  quantity = 0,
  formatRupees,
}) => {
  const itemName =
    item.item_name ||
    item.pack_name ||
    `Item ${item.input_item_id || item.inputItemId}`;

  const price =
    item.vendor_selling_price ||
    item.vendorSellingPrice ||
    0;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isInCart && styles.containerActive,
      ]}
      onPress={() => onPress(item)}
    >
      <Text
        style={[
          styles.name,
          isInCart && styles.activeText,
        ]}
        numberOfLines={2}
      >
        {itemName}
      </Text>

      <Text
        style={[
          styles.price,
          isInCart && styles.activeSubText,
        ]}
      >
        {formatRupees(price)}
      </Text>

      {isInCart && quantity > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{quantity}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default CatalogItemChip;

const styles = StyleSheet.create({
  container: {
    minWidth: 130,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    position: "relative",
  },

  containerActive: {
    backgroundColor: "#d97706",
    borderColor: "#d97706",
  },

  name: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },

  price: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },

  activeText: {
    color: "#ffffff",
  },

  activeSubText: {
    color: "#fef3c7",
  },

  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#d97706",
  },
});