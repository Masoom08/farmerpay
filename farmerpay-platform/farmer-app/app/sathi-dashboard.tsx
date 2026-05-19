/**
 * Sathi Dashboard — mobile view
 *
 * Shown to a logged-in Sathi (CRP) as a lightweight summary of their
 * beneficiaries, commissions, incentive progress, open issues, and nudges.
 * Mirrors the web dashboard at /dashboard/sathi.
 */
import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { apiGet } from "../lib/api";

type Overview = {
  beneficiaries: { total: number; counted: number };
  commission: { mtdPaise: number; lifetimePaise: number; currentPeriod: string };
  incentive: {
    thresholdTarget: number;
    currentQuarterCount: number;
    progressPercent: number;
    latestPayout: { amountPaise: number; status: string } | null;
  };
  issues: { open: number; critical: number };
  nudges: { sent: number; convertedToAction: number; conversionRate: number };
};

const rupees = (paise: number) => {
  const rs = Math.round(paise / 100);
  return "\u20B9" + rs.toLocaleString("en-IN");
};

export default function SathiDashboardScreen() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const r = await apiGet("/sathi/dashboard/overview");
      if (r.success) {
        setOverview(r.data);
        setError(null);
      } else {
        setError(r.message || "Not a registered Sathi");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Sathi Dashboard",
            headerStyle: { backgroundColor: "#6a1b9a" },
            headerTintColor: "#fff",
          }}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6a1b9a" />
        </View>
      </>
    );
  }

  if (error || !overview) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Sathi Dashboard",
            headerStyle: { backgroundColor: "#6a1b9a" },
            headerTintColor: "#fff",
          }}
        />
        <View style={styles.center}>
          <Text style={styles.err}>{error || "No dashboard data"}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Sathi Dashboard",
          headerStyle: { backgroundColor: "#6a1b9a" },
          headerTintColor: "#fff",
        }}
      />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        {/* KPI cards */}
        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.label}>Beneficiaries</Text>
            <Text style={styles.value}>{overview.beneficiaries.total}</Text>
            <Text style={styles.subtle}>
              {overview.beneficiaries.counted} counted
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Commission (MTD)</Text>
            <Text style={styles.value}>{rupees(overview.commission.mtdPaise)}</Text>
            <Text style={styles.subtle}>
              Lifetime {rupees(overview.commission.lifetimePaise)}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.label}>Open Issues</Text>
            <Text style={styles.value}>{overview.issues.open}</Text>
            <Text style={styles.subtle}>
              {overview.issues.critical} critical
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Nudges sent</Text>
            <Text style={styles.value}>{overview.nudges.sent}</Text>
            <Text style={styles.subtle}>
              {overview.nudges.convertedToAction} converted
              ({overview.nudges.conversionRate}%)
            </Text>
          </View>
        </View>

        {/* Incentive progress */}
        <View style={styles.bigCard}>
          <Text style={styles.label}>100-Beneficiary Incentive</Text>
          <Text style={styles.value}>
            {overview.incentive.currentQuarterCount} / {overview.incentive.thresholdTarget}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${overview.incentive.progressPercent}%` },
              ]}
            />
          </View>
          <Text style={styles.subtle}>
            10% bonus on top of your 20% commission once you enroll 100 beneficiaries in the quarter.
          </Text>
          {overview.incentive.latestPayout && (
            <Text style={styles.subtle}>
              Last bonus: {rupees(overview.incentive.latestPayout.amountPaise)}
              ({overview.incentive.latestPayout.status})
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push("/choice")}
        >
          <Text style={styles.actionTxt}>Go to My Farmers</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  err: { color: "#c62828", fontSize: 14, textAlign: "center" },
  row: { flexDirection: "row", padding: 8, gap: 8 },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  bigCard: {
    margin: 8,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
  },
  label: { fontSize: 12, color: "#666", marginBottom: 6 },
  value: { fontSize: 22, fontWeight: "700", color: "#111" },
  subtle: { fontSize: 11, color: "#888", marginTop: 4 },
  progressBar: {
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 4,
    marginTop: 10,
    marginBottom: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6a1b9a",
  },
  actionBtn: {
    margin: 16,
    padding: 14,
    backgroundColor: "#6a1b9a",
    borderRadius: 8,
    alignItems: "center",
  },
  actionTxt: { color: "#fff", fontWeight: "600" },
});
