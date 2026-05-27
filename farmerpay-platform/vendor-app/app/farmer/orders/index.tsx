import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { useEffect, useState } from "react";
import { getTransactions } from "../../../src/api/modules/transaction.api";

export default function OrdersScreen() {
  const { farmerId } = useLocalSearchParams();

  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await getTransactions(50);

      if (res.success) {
        const filtered = res.data.filter(
          (tx: any) =>
            String(tx.farmerId) ===
            String(farmerId)
        );

        setOrders(filtered);
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        Orders
      </Text>

      {orders.map((order) => (
        <TouchableOpacity
          key={order.transactionId || order.id}
          style={styles.card}
          onPress={() =>
            router.push(
                `/farmer/orders/${
                    order.transactionId || order.id
                }` as any
            )
          }
        >
          <Text style={styles.amount}>
            ₹{order.amount}
          </Text>

          <Text>
            {order.transactionType}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffbeb",
    padding: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  amount: {
    fontSize: 18,
    fontWeight: "700",
  },
});