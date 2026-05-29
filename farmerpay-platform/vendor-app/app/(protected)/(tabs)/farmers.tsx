import {
  useEffect,
  useState,
  useCallback,
} from "react";

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import { formatRupees } from "../../../src/utils/currency";

import { farmerApi } from "../../../src/api/modules/farmer.api";

import type {
  Farmer,
} from "../../../src/types/farmer.types";

export default function MyFarmersScreen() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [farmers, setFarmers] =
    useState<Farmer[]>([]);

  const load = useCallback(async () => {
    try {
      const data =
        await farmerApi.getMyFarmers();

      setFarmers(data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={
        styles.content
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          colors={["#d97706"]}
        />
      }
    >
      <Text style={styles.sectionLabel}>
        MY FARMERS ({farmers.length})
      </Text>

      {farmers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={{ fontSize: 40 }}>
            👥
          </Text>

          <Text style={styles.emptyTitle}>
            No farmers yet
          </Text>

          <Text style={styles.emptyText}>
            Add farmers to start
            tracking customers.
          </Text>
        </View>
      ) : (
        farmers.map((f, i) => (
          <TouchableOpacity
            key={i}
            style={styles.farmerCard}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent:
                  "space-between",
                marginBottom: 4,
              }}
            >
              <Text
                style={styles.farmerName}
              >
                {f.name}
              </Text>

              <Text
                style={
                  styles.farmerTotal
                }
              >
                {formatRupees(
                  f.totalValue || 0
                )}
              </Text>
            </View>

            <Text
              style={styles.farmerMobile}
            >
              📞 {f.mobile}
            </Text>

            <View
              style={styles.farmerStats}
            >
              <Text
                style={styles.statText}
              >
                📋{" "}
                {f.transactionCount || 0}{" "}
                orders
              </Text>

              {f.currentBalance > 0 && (
                <Text
                  style={[
                    styles.statText,
                    {
                      color: "#dc2626",
                      fontWeight: "700",
                    },
                  ]}
                >
                  💳 Owes:{" "}
                  {formatRupees(
                    f.currentBalance
                  )}
                </Text>
              )}
            </View>
          </TouchableOpacity>
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
    paddingBottom: 120,
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
    marginBottom: 8,
  },

  farmerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },

  farmerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
  },

  farmerTotal: {
    fontSize: 15,
    fontWeight: "700",
    color: "#d97706",
  },

  farmerMobile: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },

  farmerStats: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },

  statText: {
    fontSize: 11,
    color: "#888",
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