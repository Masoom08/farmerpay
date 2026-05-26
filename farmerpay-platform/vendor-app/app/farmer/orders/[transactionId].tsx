import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import { useLocalSearchParams } from "expo-router";

import { useEffect, useState } from "react";

import {
  getTransactionDetails,
} from "../../../src/api/modules/sales.api";

import { formatRupees } from "../../../src/utils/currency";

export default function OrderDetailScreen() {
  const { transactionId } =
    useLocalSearchParams();

  const [loading, setLoading] =
    useState(true);

  const [order, setOrder] =
    useState<any>(null);

  useEffect(() => {
    loadOrder();
  }, []);

  const loadOrder = async () => {
    try {
      const res =
        await getTransactionDetails(
          String(transactionId)
        );

      console.log(
        "ORDER DETAILS",
        JSON.stringify(res, null, 2)
      );

      if (res.success) {
        setOrder(res.data);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#d97706"
        />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text>Order not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        Order #{order.id}
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>
          Amount
        </Text>

        <Text style={styles.value}>
          {formatRupees(
            Number(
              order.amount ||
                order.transaction_amount ||
                0
            )
          )}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>
          Type
        </Text>

        <Text style={styles.value}>
          {order.transactionType ||
            order.transaction_type}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>
          Status
        </Text>

        <Text style={styles.value}>
          {order.status ||
            order.transaction_status}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>
          Date
        </Text>

        <Text style={styles.value}>
          {order.transactionDate ||
            order.transaction_date}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffbeb",
    padding: 16,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 20,
    color: "#1a1a1a",
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  label: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },

  value: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
});