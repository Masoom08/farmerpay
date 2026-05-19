/**
 * Krishi Bazaar — My Vendors, Recent Purchases & Sathi-Vendor Bridge
 *
 * Farmer's marketplace hub for input purchases and vendor relationships.
 */
import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { apiGet, apiPost, formatRupees } from "../lib/api";

const TYPE_LABELS: Record<string, string> = {
  seeds_distributor: "Seeds", fertilizer_supplier: "Fertilizer",
  pesticide_dealer: "Pesticide", equipment_supplier: "Equipment",
  multipurpose_dealer: "Multipurpose", aggregator: "Aggregator",
  multipurpose_aggregator: "Aggregator+",
};

const TYPE_EMOJI: Record<string, string> = {
  seeds_distributor: "🌱", fertilizer_supplier: "🧪", pesticide_dealer: "🧴",
  equipment_supplier: "🚜", multipurpose_dealer: "🏪", aggregator: "📦",
  multipurpose_aggregator: "🏬",
};

const PAYMENT_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: "Paid", color: "#16a34a", bg: "#f0fdf4" },
  partial_paid: { label: "Partial", color: "#d97706", bg: "#fffbeb" },
  credit_given: { label: "Credit", color: "#dc2626", bg: "#fef2f2" },
  pending: { label: "Pending", color: "#6b7280", bg: "#f3f4f6" },
};

export default function KrishiBazaarScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sathiVendor, setSathiVendor] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [v, p, sv] = await Promise.all([
        apiGet("/vyapar/farmer/my-vendors").catch(() => ({ success: false, data: [] })),
        apiGet("/vyapar/farmer/purchases?limit=10").catch(() => ({ success: false, data: [] })),
        apiGet("/vyapar/farmer/sathi-vendor").catch(() => ({ success: false, data: null })),
      ]);
      setVendors(Array.isArray(v.data) ? v.data : []);
      setPurchases(Array.isArray(p.data) ? p.data : []);
      setSathiVendor(sv.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return (
    <>
      <Stack.Screen options={{ title: "Krishi Bazaar", headerStyle: { backgroundColor: "#d97706" }, headerTintColor: "#fff" }} />
      <View style={styles.center}><ActivityIndicator size="large" color="#d97706" /></View>
    </>
  );

  return (
    <>
      <Stack.Screen options={{ title: "Krishi Bazaar", headerStyle: { backgroundColor: "#d97706" }, headerTintColor: "#fff" }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={["#d97706"]} />}
      >
        <View style={styles.header}>
          <Text style={styles.moduleTag}>KRISHI BAZAAR</Text>
          <Text style={styles.title}>🏪 My Vendors & Purchases</Text>
          <Text style={styles.subtitle}>Track your input purchases, credit, and vendor relationships</Text>
        </View>

        {/* Add Vendor Button */}
        <TouchableOpacity style={styles.addVendorBtn} onPress={() => router.push("/add-vendor" as any)}>
          <Text style={styles.addVendorIcon}>➕</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.addVendorTitle}>Add a new vendor</Text>
            <Text style={styles.addVendorSub}>Register your local input seller or aggregator</Text>
          </View>
          <Text style={{ color: "#d97706", fontSize: 20 }}>›</Text>
        </TouchableOpacity>

        {/* Sathi-Vendor Banner */}
        {sathiVendor?.isSathiVendor && (
          <TouchableOpacity
            style={styles.sathiBanner}
            onPress={() => router.push(`/vendor-detail?vendorId=${sathiVendor.vendor.id}` as any)}
          >
            <Text style={styles.sathiBannerIcon}>🤝🏪</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.sathiBannerTitle}>
                Your Sathi {sathiVendor.sathiName} also sells inputs!
              </Text>
              <Text style={styles.sathiBannerSub}>
                {TYPE_LABELS[sathiVendor.vendor.vendorType] || "Vendor"} · ⭐ {sathiVendor.vendor.rating.toFixed(1)} · Tap to view catalog →
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* My Vendors */}
        <Text style={styles.sectionLabel}>MY VENDORS ({vendors.length})</Text>
        {vendors.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 40 }}>🏪</Text>
            <Text style={styles.emptyTitle}>No vendors yet</Text>
            <Text style={styles.emptyText}>Record a purchase to start tracking your vendor relationships.</Text>
          </View>
        ) : (
          vendors.map((v) => (
            <TouchableOpacity
              key={v.vendorId}
              style={styles.vendorCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/vendor-detail?vendorId=${v.vendorId}` as any)}
            >
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={styles.vendorAvatar}>
                  <Text style={{ fontSize: 24 }}>{TYPE_EMOJI[v.vendorType] || "🏪"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vendorName}>{v.name}</Text>
                  <Text style={styles.vendorType}>{TYPE_LABELS[v.vendorType] || v.vendorType}</Text>
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                    <Text style={styles.vendorMeta}>💰 {formatRupees(v.totalPurchases)}</Text>
                    <Text style={styles.vendorMeta}>📋 {v.transactionCount} orders</Text>
                    <Text style={styles.vendorMeta}>⭐ {v.vendorRating?.toFixed(1) || "New"}</Text>
                  </View>
                  {v.creditBalance > 0 && (
                    <Text style={styles.creditBadge}>💳 Credit: {formatRupees(v.creditBalance)}</Text>
                  )}
                  {/* Make Sathi button */}
                  <TouchableOpacity
                    style={styles.makeSathiBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      Alert.alert(
                        "Make Sathi?",
                        `Register ${v.name} as your Sathi (Community Resource Person)? They can help you with loans, insurance & KYC.`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Yes, make Sathi",
                            onPress: async () => {
                              try {
                                const r = await apiPost("/vyapar/farmer/make-sathi", { vendorId: v.vendorId });
                                if (r.success) Alert.alert("Done!", `${v.name} is now your Sathi!`);
                                else Alert.alert("Info", r.message || "Could not register as Sathi.");
                              } catch { Alert.alert("Error", "Failed. Try again."); }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.makeSathiBtnText}>🤝 Make Sathi</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ color: "#d97706", fontSize: 20, alignSelf: "center" }}>›</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Recent Purchases */}
        <Text style={styles.sectionLabel}>RECENT PURCHASES</Text>
        {purchases.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No purchases recorded yet.</Text>
          </View>
        ) : (
          purchases.map((p) => {
            const badge = PAYMENT_BADGE[p.paymentStatus] || PAYMENT_BADGE.pending;
            return (
              <View key={p.id} style={styles.purchaseCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={styles.purchaseVendor}>{p.vendorName}</Text>
                  <Text style={styles.purchaseAmount}>{formatRupees(p.amount)}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <Text style={styles.purchaseDate}>{p.date}</Text>
                  <View style={[styles.paymentBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.paymentBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                  {p.season && <Text style={styles.purchaseSeason}>{p.season}</Text>}
                  <Text style={styles.purchaseItems}>{p.itemCount} item{p.itemCount !== 1 ? "s" : ""}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fffbeb" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { marginBottom: 16 },
  moduleTag: { fontSize: 11, fontWeight: "900", color: "#d97706", letterSpacing: 2 },
  title: { fontSize: 22, fontWeight: "800", color: "#1a1a1a", marginTop: 4 },
  subtitle: { fontSize: 13, color: "#666", marginTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#888", letterSpacing: 1, marginBottom: 8, marginTop: 16 },

  // Sathi-vendor banner
  sathiBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#ecfdf5", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: "#6ee7b7", marginBottom: 8 },
  sathiBannerIcon: { fontSize: 28 },
  sathiBannerTitle: { fontSize: 14, fontWeight: "700", color: "#059669" },
  sathiBannerSub: { fontSize: 11, color: "#666", marginTop: 2 },

  // Vendor cards
  vendorCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  vendorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#fffbeb", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#fde68a" },
  vendorName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  vendorType: { fontSize: 11, color: "#d97706", fontWeight: "700", marginTop: 2 },
  vendorMeta: { fontSize: 11, color: "#888" },
  creditBadge: { fontSize: 11, color: "#dc2626", fontWeight: "600", marginTop: 4, backgroundColor: "#fef2f2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" },

  // Purchase list
  purchaseCard: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8 },
  purchaseVendor: { fontSize: 13, fontWeight: "600", color: "#333" },
  purchaseAmount: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  purchaseDate: { fontSize: 11, color: "#888" },
  paymentBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  paymentBadgeText: { fontSize: 10, fontWeight: "700" },
  purchaseSeason: { fontSize: 10, color: "#d97706", fontWeight: "600", backgroundColor: "#fffbeb", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  purchaseItems: { fontSize: 10, color: "#888" },

  // Add vendor button
  addVendorBtn: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: "#d97706" },
  addVendorIcon: { fontSize: 24, width: 40, textAlign: "center" },
  addVendorTitle: { fontSize: 14, fontWeight: "700", color: "#d97706" },
  addVendorSub: { fontSize: 11, color: "#888", marginTop: 2 },

  // Make Sathi button on vendor card
  makeSathiBtn: { marginTop: 8, backgroundColor: "#ecfdf5", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignSelf: "flex-start", borderWidth: 1, borderColor: "#6ee7b7" },
  makeSathiBtnText: { fontSize: 11, fontWeight: "700", color: "#059669" },

  // Empty states
  emptyCard: { backgroundColor: "#fff", borderRadius: 14, padding: 24, alignItems: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginTop: 8 },
  emptyText: { color: "#999", textAlign: "center", marginTop: 6, fontSize: 13 },
});
