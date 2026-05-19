/**
 * CHOICE — My Sathi (CRP Selection & Management)
 *
 * Farmer-facing screen to discover, select, call/SMS, rate, and change their Sathi.
 * Types: Input Seller / Bank Sakhi / BC / Insurance Sakhi / PACS Secretary / FPO Secretary
 */
import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking, RefreshControl,
} from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { apiGet, apiPost } from "../lib/api";

const TYPE_LABELS: Record<string, string> = {
  input_seller: "Input Seller",
  bank_sakhi: "Bank Sakhi",
  bc: "Business Correspondent",
  business_correspondent: "Business Correspondent",
  insurance_sakhi: "Insurance Sakhi",
  pacs_secretary: "PACS Secretary",
  fpo_secretary: "FPO Secretary",
  adathiya: "Adathiya",
  fpo_agent: "FPO Agent",
  agri_entrepreneur: "Agri Entrepreneur",
  bank_mitra: "Bank Mitra",
};

const TYPE_EMOJI: Record<string, string> = {
  input_seller: "🌾", bank_sakhi: "🏦", bc: "💳", business_correspondent: "💳",
  insurance_sakhi: "🛡️", pacs_secretary: "🏛️", fpo_secretary: "👥",
  adathiya: "📦", fpo_agent: "👥", agri_entrepreneur: "🚜", bank_mitra: "🏦",
};

// Only show the 6 core Sathi types as filter chips
const SATHI_TYPES = ["input_seller", "bank_sakhi", "bc", "insurance_sakhi", "pacs_secretary", "fpo_secretary"];

export default function ChoiceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [my, setMy] = useState<any>(null);
  const [available, setAvailable] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [mine, av] = await Promise.all([
        apiGet("/choice/my-intermediary").catch(() => ({ success: false })),
        apiGet("/choice/available" + (typeFilter ? `?type=${typeFilter}` : "")).catch(() => ({ success: false, data: [] })),
      ]);
      if (mine.success) setMy(mine.data);
      else setMy(null);
      const list = av.success && Array.isArray(av.data) ? av.data : [];
      setAvailable(list);
    } catch {
      setAvailable([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [typeFilter]);

  useEffect(() => { setLoading(true); load(); }, [typeFilter, load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const select = (id: number, name: string) => {
    Alert.alert("Select Sathi", `Confirm selecting ${name} as your Sathi?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          const r = await apiPost("/choice/select", { intermediaryId: id });
          if (r.success) { Alert.alert("Done!", `${name} is now your Sathi.`); load(); }
          else Alert.alert("Error", r.error || "Failed to select");
        },
      },
    ]);
  };

  const callSathi = (mobile: string) => Linking.openURL(`tel:${mobile}`);
  const smsSathi = (mobile: string) => Linking.openURL(`sms:${mobile}`);
  const whatsappSathi = (mobile: string) => Linking.openURL(`https://wa.me/91${mobile.replace(/^\+?91/, "")}`);

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= Math.round(rating) ? "⭐" : "☆");
    }
    return stars.join("");
  };

  if (loading) return (
    <>
      <Stack.Screen options={{ title: "My Sathi", headerStyle: { backgroundColor: "#059669" }, headerTintColor: "#fff" }} />
      <View style={styles.center}><ActivityIndicator size="large" color="#059669" /></View>
    </>
  );

  return (
    <>
      <Stack.Screen options={{ title: "My Sathi", headerStyle: { backgroundColor: "#059669" }, headerTintColor: "#fff" }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={["#059669"]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.moduleTag}>SATHI</Text>
          <Text style={styles.title}>🤝 My Community Resource Person</Text>
          <Text style={styles.subtitle}>Your trusted local helper for loans, insurance & more</Text>
        </View>

        {/* ═══ Current Sathi ═══ */}
        {my ? (
          <View style={styles.currentCard}>
            <Text style={styles.sectionLabel}>YOUR SATHI</Text>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={{ fontSize: 28 }}>{TYPE_EMOJI[my.type || my.intermediary?.type] || "🤝"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{my.name || my.intermediary?.name}</Text>
                <Text style={styles.typeLabel}>{TYPE_LABELS[my.type || my.intermediary?.type] || "Sathi"}</Text>
                {(my.rating || my.intermediary?.rating) && (
                  <Text style={styles.ratingText}>
                    {renderStars(my.rating || my.intermediary?.rating)} ({(my.rating || my.intermediary?.rating)?.toFixed(1)})
                  </Text>
                )}
                <Text style={styles.metaText}>
                  👥 {my.total_farmers_served || my.intermediary?.total_farmers_served || 0} farmers served
                  {(my.village || my.intermediary?.village) && ` · 📍 ${my.village || my.intermediary?.village}`}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#059669" }]}
                onPress={() => callSathi(my.mobile || my.intermediary?.mobile)}
              >
                <Text style={styles.actionIcon}>📞</Text>
                <Text style={styles.actionLabel}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#25D366" }]}
                onPress={() => whatsappSathi(my.mobile || my.intermediary?.mobile)}
              >
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionLabel}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#2563eb" }]}
                onPress={() => smsSathi(my.mobile || my.intermediary?.mobile)}
              >
                <Text style={styles.actionIcon}>✉️</Text>
                <Text style={styles.actionLabel}>SMS</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline]}
                onPress={() => router.push("/rate-sathi")}
              >
                <Text style={styles.btnOutlineText}>⭐ Rate Sathi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnFilled]}
                onPress={() => router.push("/need-sathi-help")}
              >
                <Text style={styles.btnFilledText}>🆘 Need Help</Text>
              </TouchableOpacity>
            </View>

            {/* Change Sathi */}
            <TouchableOpacity
              style={styles.changeLink}
              onPress={() => {
                Alert.alert("Change Sathi", "Want to request a different Sathi?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Request Change",
                    onPress: async () => {
                      const r = await apiPost("/choice/change-request", { reason: "Farmer requested change" });
                      if (r.success) Alert.alert("Requested", "Your change request has been submitted.");
                      else Alert.alert("Error", r.error || "Failed");
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.changeLinkText}>🔄 Request a different Sathi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 48, textAlign: "center" }}>🔍</Text>
            <Text style={styles.emptyTitle}>No Sathi selected yet</Text>
            <Text style={styles.emptyText}>Choose a trusted community helper from the list below. They will assist you with loans, insurance, and data entry.</Text>
          </View>
        )}

        {/* ═══ Filter Chips ═══ */}
        <Text style={styles.sectionLabel}>FIND A SATHI</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <TouchableOpacity onPress={() => setTypeFilter(null)} style={[styles.chip, !typeFilter && styles.chipActive]}>
            <Text style={[styles.chipText, !typeFilter && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {SATHI_TYPES.map((k) => (
            <TouchableOpacity key={k} onPress={() => setTypeFilter(k)} style={[styles.chip, typeFilter === k && styles.chipActive]}>
              <Text style={[styles.chipText, typeFilter === k && styles.chipTextActive]}>
                {TYPE_EMOJI[k]} {TYPE_LABELS[k]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ═══ Available List ═══ */}
        <Text style={styles.sectionLabel}>AVAILABLE NEAR YOU ({available.length})</Text>
        {available.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No Sathis found for this filter. Try "All" or check back later.</Text>
          </View>
        )}
        {available.map((item, i) => (
          <TouchableOpacity key={i} style={styles.itemCard} activeOpacity={0.7} onPress={() => select(item.id, item.name)}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={styles.avatarSm}>
                <Text style={{ fontSize: 22 }}>{TYPE_EMOJI[item.type] || "🤝"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemType}>{TYPE_LABELS[item.type] || item.type}</Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                  <Text style={styles.itemMeta}>⭐ {item.rating?.toFixed(1) || "New"}</Text>
                  <Text style={styles.itemMeta}>👥 {item.total_farmers_served || 0}</Text>
                  <Text style={styles.itemMeta}>📍 {item.proximity_label || item.village || "Nearby"}</Text>
                </View>
                {item.skills && Array.isArray(item.skills) && (
                  <View style={styles.skillsRow}>
                    {item.skills.slice(0, 4).map((s: string, j: number) => (
                      <Text key={j} style={styles.skillTag}>{s}</Text>
                    ))}
                  </View>
                )}
                {item.languages_spoken && Array.isArray(item.languages_spoken) && (
                  <Text style={styles.langText}>🗣 {item.languages_spoken.join(", ")}</Text>
                )}
              </View>
              <View style={styles.selectBadge}>
                <Text style={styles.selectText}>Select</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f0fdf4" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { marginBottom: 16 },
  moduleTag: { fontSize: 11, fontWeight: "900", color: "#059669", letterSpacing: 2 },
  title: { fontSize: 22, fontWeight: "800", color: "#1a1a1a", marginTop: 4 },
  subtitle: { fontSize: 13, color: "#666", marginTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#888", letterSpacing: 1, marginBottom: 8, marginTop: 16 },

  // Current Sathi card
  currentCard: { backgroundColor: "#ecfdf5", borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: "#6ee7b7", marginBottom: 8 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4 },
  name: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  typeLabel: { fontSize: 12, color: "#059669", fontWeight: "700", marginTop: 2 },
  ratingText: { fontSize: 12, color: "#666", marginTop: 2 },
  metaText: { fontSize: 11, color: "#888", marginTop: 4 },

  // Action buttons (call, whatsapp, sms)
  actionsGrid: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  actionIcon: { fontSize: 20 },
  actionLabel: { color: "#fff", fontWeight: "700", fontSize: 11, marginTop: 4 },

  // Rate / Help row
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: "center", flex: 1 },
  btnOutline: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#059669" },
  btnOutlineText: { color: "#059669", fontWeight: "700", fontSize: 13 },
  btnFilled: { backgroundColor: "#dc2626" },
  btnFilledText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Change link
  changeLink: { marginTop: 12, alignItems: "center" },
  changeLinkText: { color: "#888", fontSize: 12, fontWeight: "600" },

  // Empty state
  emptyCard: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginTop: 8 },
  emptyText: { color: "#999", textAlign: "center", marginTop: 6, fontSize: 13, lineHeight: 18 },

  // Filter chips
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", marginRight: 8 },
  chipActive: { backgroundColor: "#059669", borderColor: "#059669" },
  chipText: { fontSize: 12, color: "#555", fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  // Available list
  itemCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  avatarSm: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#ecfdf5", justifyContent: "center", alignItems: "center" },
  itemName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  itemType: { fontSize: 11, color: "#059669", fontWeight: "700", marginTop: 2 },
  itemMeta: { fontSize: 11, color: "#888" },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  skillTag: { fontSize: 10, color: "#059669", backgroundColor: "#ecfdf5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  langText: { fontSize: 10, color: "#888", marginTop: 4 },
  selectBadge: { backgroundColor: "#059669", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: "center" },
  selectText: { color: "#fff", fontWeight: "700", fontSize: 11 },
});
