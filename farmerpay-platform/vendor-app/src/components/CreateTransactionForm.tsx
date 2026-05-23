import React, { useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";

import { useCreateTransaction }
  from "../hooks/useTransactions";

interface Item {
  itemId: string;
  packId: string;
  quantity: string;
}

export default function
CreateTransactionForm() {

  const {
    handleCreateTransaction,
    loading,
  } = useCreateTransaction();

  const [farmerId, setFarmerId] =
    useState("");

  const [
    transactionType,
    setTransactionType,
  ] = useState("cash_sale");

  const [
    loanApplicationId,
    setLoanApplicationId,
  ] = useState("");

  const [items, setItems] =
    useState<Item[]>([
      {
        itemId: "",
        packId: "",
        quantity: "",
      },
    ]);

  const addItem = () => {
    setItems([
      ...items,
      {
        itemId: "",
        packId: "",
        quantity: "",
      },
    ]);
  };

  const removeItem = (
    index: number
  ) => {

    const updated = [...items];

    updated.splice(index, 1);

    setItems(updated);
  };

  const updateItem = (
    index: number,
    field: keyof Item,
    value: string
  ) => {

    const updated = [...items];

    updated[index][field] = value;

    setItems(updated);
  };

  const submit = async () => {

    if (!farmerId) {
      Alert.alert(
        "Validation",
        "Farmer ID required"
      );

      return;
    }

    for (const item of items) {

      if (
        !item.itemId ||
        !item.packId ||
        !item.quantity
      ) {

        Alert.alert(
          "Validation",
          "Fill all item fields"
        );

        return;
      }
    }

    try {

      await handleCreateTransaction({
        farmerId: Number(farmerId),

        transactionType:
          transactionType as
            | "cash_sale"
            | "credit_sale",

        loanApplicationId:
          loanApplicationId
            ? Number(
                loanApplicationId
              )
            : null,

        items: items.map((i) => ({
          itemId: i.itemId,
          packId: i.packId,

          quantity: Number(
            i.quantity
          ),
        })),
      });

      Alert.alert(
        "Success",
        "Transaction created"
      );

      setFarmerId("");

      setLoanApplicationId("");

      setItems([
        {
          itemId: "",
          packId: "",
          quantity: "",
        },
      ]);

    } catch (err: any) {

      Alert.alert(
        "Error",
        err?.message ||
          "Transaction failed"
      );
    }
  };

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <Text style={styles.title}>
        Create Transaction
      </Text>

      {/* Farmer ID */}
      <TextInput
        placeholder="Farmer ID"
        value={farmerId}
        onChangeText={setFarmerId}
        keyboardType="numeric"
        style={styles.input}
      />

      {/* Transaction Type */}
      <View style={styles.typeRow}>

        <TouchableOpacity
          style={[
            styles.typeButton,

            transactionType ===
              "cash_sale" &&
              styles.activeType,
          ]}

          onPress={() =>
            setTransactionType(
              "cash_sale"
            )
          }
        >
          <Text
            style={[
              styles.typeText,

              transactionType ===
                "cash_sale" &&
                styles.activeTypeText,
            ]}
          >
            Cash Sale
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,

            transactionType ===
              "credit_sale" &&
              styles.activeType,
          ]}

          onPress={() =>
            setTransactionType(
              "credit_sale"
            )
          }
        >
          <Text
            style={[
              styles.typeText,

              transactionType ===
                "credit_sale" &&
                styles.activeTypeText,
            ]}
          >
            Credit Sale
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loan App */}
      <TextInput
        placeholder="Loan Application ID (Optional)"
        value={loanApplicationId}
        onChangeText={
          setLoanApplicationId
        }
        keyboardType="numeric"
        style={styles.input}
      />

      {/* Items */}
      {items.map((item, index) => (

        <View
          key={index}
          style={styles.itemCard}
        >
          <View
            style={styles.itemHeader}
          >
            <Text
              style={styles.itemTitle}
            >
              Item {index + 1}
            </Text>

            {items.length > 1 && (
              <TouchableOpacity
                onPress={() =>
                  removeItem(index)
                }
              >
                <Text
                  style={
                    styles.removeText
                  }
                >
                  Remove
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            placeholder="Item ID"
            value={item.itemId}
            onChangeText={(v) =>
              updateItem(
                index,
                "itemId",
                v
              )
            }
            style={styles.input}
          />

          <TextInput
            placeholder="Pack ID"
            value={item.packId}
            onChangeText={(v) =>
              updateItem(
                index,
                "packId",
                v
              )
            }
            style={styles.input}
          />

          <TextInput
            placeholder="Quantity"
            value={item.quantity}
            onChangeText={(v) =>
              updateItem(
                index,
                "quantity",
                v
              )
            }
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
      ))}

      {/* Add Item */}
      <TouchableOpacity
        style={styles.addItemBtn}
        onPress={addItem}
      >
        <Text
          style={styles.addItemText}
        >
          + Add Another Item
        </Text>
      </TouchableOpacity>

      {/* Submit */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={submit}
        disabled={loading}
      >
        <Text
          style={styles.submitText}
        >
          {loading
            ? "Creating..."
            : "Create Transaction"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    padding: 16,
    paddingBottom: 120,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 18,
    color: "#111",
  },

  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },

  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  typeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },

  activeType: {
    backgroundColor: "#d97706",
    borderColor: "#d97706",
  },

  typeText: {
    color: "#444",
    fontWeight: "600",
  },

  activeTypeText: {
    color: "#fff",
  },

  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },

  itemHeader: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginBottom: 10,
  },

  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
  },

  removeText: {
    color: "#dc2626",
    fontWeight: "700",
  },

  addItemBtn: {
    borderWidth: 1.5,
    borderColor: "#d97706",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },

  addItemText: {
    color: "#d97706",
    fontWeight: "700",
  },

  submitBtn: {
    backgroundColor: "#d97706",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },

  submitText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});