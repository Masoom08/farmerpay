import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getTransactions } from "../../src/api/modules/transaction.api";
import { formatRupees } from "../../src/utils/currency";

export default function FarmerTransactionsPage() {
  const { farmerId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadTransactions();
  }, [farmerId]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const tx = await getTransactions(100);

      if (tx.success && Array.isArray(tx.data)) {
        const filtered = tx.data.filter(
          (item: any) => String(item.farmerId) === String(farmerId)
        );
        setTransactions(filtered);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = transactions.reduce(
    (sum, tx) => sum + Number(tx.amount || 0),
    0
  );

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case "cash_sale":
        return "💵";
      case "credit_sale":
        return "💳";
      case "cash_credit_sale":
        return "🪙";
      default:
        return "📦";
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d97706" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>
        TRANSACTIONS ({transactions.length})
      </Text>

      {transactions.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            👨‍🌾 {transactions[0]?.farmerName}
          </Text>

          <Text style={styles.summaryAmount}>
            {formatRupees(totalAmount)}
          </Text>

          <Text style={styles.summarySub}>
            📋 {transactions.length} Orders
          </Text>
        </View>
      )}

      {transactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={{ fontSize: 40 }}>🧾</Text>
          <Text style={styles.emptyTitle}>No transactions found</Text>
          <Text style={styles.emptyText}>
            This farmer has no transactions yet.
          </Text>
        </View>
      ) : (
        transactions.map((tx) => (
          <View key={tx.transactionId} style={styles.txCard}>
            <View style={styles.row}>
              <Text style={styles.txType}>
                {getTypeEmoji(tx.type)} {tx.type.replaceAll("_", " ")}
              </Text>
              <Text style={styles.amount}>
                {formatRupees(tx.amount)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      tx.status === "completed"
                        ? "#dcfce7"
                        : "#fef3c7",
                    color:
                      tx.status === "completed"
                        ? "#16a34a"
                        : "#d97706",
                  },
                ]}
              >
                {tx.status}
              </Text>

              <Text
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      tx.paymentStatus === "paid"
                        ? "#dcfce7"
                        : "#fee2e2",
                    color:
                      tx.paymentStatus === "paid"
                        ? "#16a34a"
                        : "#dc2626",
                  },
                ]}
              >
                {tx.paymentStatus}
              </Text>
            </View>

            <Text style={styles.date}>📅 {tx.date}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#fffbeb",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#888",
    letterSpacing: 1,
    marginBottom: 10,
  },

  summaryCard: {
    backgroundColor: "#d97706",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },

  summaryTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  summaryAmount: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 8,
  },

  summarySub: {
    color: "#fef3c7",
    marginTop: 6,
    fontSize: 12,
  },

  txCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  txType: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
    textTransform: "capitalize",
  },

  amount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#d97706",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
  },

  date: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 6,
  },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginTop: 8,
  },

  emptyText: {
    color: "#999",
    textAlign: "center",
    marginTop: 6,
    fontSize: 13,
  },
});