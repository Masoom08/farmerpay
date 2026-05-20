import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

type PaymentType = "cash_sale" | "credit_sale";

interface PaymentTypeSelectorProps {
  value: PaymentType;
  onChange: (value: PaymentType) => void;
}

const PaymentTypeSelector: React.FC<
  PaymentTypeSelectorProps
> = ({ value, onChange }) => {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[
          styles.button,
          value === "cash_sale" && styles.cashActive,
        ]}
        onPress={() => onChange("cash_sale")}
      >
        <Text
          style={[
            styles.text,
            value === "cash_sale" && styles.cashText,
          ]}
        >
          💵 Cash
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          value === "credit_sale" &&
            styles.creditActive,
        ]}
        onPress={() => onChange("credit_sale")}
      >
        <Text
          style={[
            styles.text,
            value === "credit_sale" &&
              styles.creditText,
          ]}
        >
          💳 Credit
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default PaymentTypeSelector;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },

  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    alignItems: "center",
  },

  text: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4b5563",
  },

  cashActive: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },

  creditActive: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },

  cashText: {
    color: "#16a34a",
  },

  creditText: {
    color: "#dc2626",
  },
});