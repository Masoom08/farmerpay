/**
 * Add Vendor — Register a new local vendor (input seller / aggregator)
 *
 * Farmer adds their local vendor's basic details. Optionally makes
 * the vendor their Sathi too.
 */
import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Alert, ActivityIndicator, Switch,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { apiPost } from "../lib/api";

const VENDOR_TYPES = [
  { key: "seeds_distributor", emoji: "🌱", label: "Seeds Dealer" },
  { key: "fertilizer_supplier", emoji: "🧪", label: "Fertilizer Supplier" },
  { key: "pesticide_dealer", emoji: "🧴", label: "Pesticide Dealer" },
  { key: "equipment_supplier", emoji: "🚜", label: "Equipment Supplier" },
  { key: "multipurpose_dealer", emoji: "🏪", label: "Multipurpose (All inputs)" },
  { key: "aggregator", emoji: "📦", label: "Aggregator (Buys produce)" },
];

export default function AddVendorScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [vendorType, setVendorType] = useState("multipurpose_dealer");
  const [makeSathi, setMakeSathi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [newVendorId, setNewVendorId] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert("Name required", "Enter the vendor's name."); return; }
    if (!mobile.trim() || mobile.replace(/\D/g, "").length < 10) {
      Alert.alert("Mobile required", "Enter a valid 10-digit mobile number.");
      return;
    }

    setSubmitting(true);
    try {
      // Register vendor via API
      const r = await apiPost("/vyapar/farmer/add-vendor", {
        name: name.trim(),
        mobile: mobile.replace(/\D/g, "").slice(-10),
        shopName: shopName.trim() || name.trim(),
        address: address.trim(),
        vendorType,
        makeSathi,
      });

      if (r.success) {
        setNewVendorId(r.data?.vendorId || null);
        setSubmitted(true);
      } else {
        Alert.alert("Error", r.message || "Failed to register vendor.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not connect. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <Stack.Screen options={{ title: "Vendor Added!", headerStyle: { backgroundColor: "#16a34a" }, headerTintColor: "#fff" }} />
        <View style={styles.successCenter}>
          <Text style={{ fontSize: 64 }}>✅</Text>
          <Text style={styles.successTitle}>Vendor registered!</Text>
          <Text style={styles.successSub}>{name} has been added as your vendor.</Text>
          {makeSathi && (
            <View style={styles.sathiBadge}>
              <Text style={styles.sathiBadgeText}>🤝 Also registered as your Sathi</Text>
            </View>
          )}
          <TouchableOpacity style={styles.viewBtn} onPress={() => {
            if (newVendorId) router.replace(`/vendor-detail?vendorId=${newVendorId}` as any);
            else router.back();
          }}>
            <Text style={styles.viewBtnText}>View Vendor →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Back to Krishi Bazaar</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Add Vendor", headerStyle: { backgroundColor: "#d97706" }, headerTintColor: "#fff" }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>➕ Register a new vendor</Text>
        <Text style={styles.subtitle}>Add your local input seller, dealer, or aggregator</Text>

        {/* Name */}
        <Text style={styles.fieldLabel}>VENDOR / SHOP OWNER NAME *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Raju Reddy"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        {/* Mobile */}
        <Text style={styles.fieldLabel}>MOBILE NUMBER *</Text>
        <TextInput
          style={styles.input}
          placeholder="10-digit mobile"
          value={mobile}
          onChangeText={(t) => setMobile(t.replace(/[^0-9+]/g, ""))}
          keyboardType="phone-pad"
          maxLength={13}
        />

        {/* Shop Name */}
        <Text style={styles.fieldLabel}>SHOP / BUSINESS NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Raju Agri Centre"
          value={shopName}
          onChangeText={setShopName}
          autoCapitalize="words"
        />

        {/* Address */}
        <Text style={styles.fieldLabel}>SHOP ADDRESS / VILLAGE</Text>
        <TextInput
          style={[styles.input, { minHeight: 60 }]}
          placeholder="e.g. Main Road, Kothapally"
          value={address}
          onChangeText={setAddress}
          multiline
        />

        {/* Vendor Type */}
        <Text style={styles.fieldLabel}>WHAT DOES THIS VENDOR SELL?</Text>
        <View style={styles.typeGrid}>
          {VENDOR_TYPES.map((vt) => (
            <TouchableOpacity
              key={vt.key}
              style={[styles.typeCard, vendorType === vt.key && styles.typeCardActive]}
              onPress={() => setVendorType(vt.key)}
            >
              <Text style={styles.typeEmoji}>{vt.emoji}</Text>
              <Text style={[styles.typeLabel, vendorType === vt.key && styles.typeLabelActive]}>{vt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Make Sathi toggle */}
        <View style={styles.sathiToggle}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sathiToggleTitle}>🤝 Also make this vendor my Sathi?</Text>
            <Text style={styles.sathiToggleSub}>
              They can help you with loans, insurance, KYC, and data entry
            </Text>
          </View>
          <Switch
            value={makeSathi}
            onValueChange={setMakeSathi}
            trackColor={{ false: "#d1d5db", true: "#6ee7b7" }}
            thumbColor={makeSathi ? "#059669" : "#9ca3af"}
          />
        </View>

        {makeSathi && (
          <View style={styles.sathiNote}>
            <Text style={styles.sathiNoteText}>
              ✓ This vendor will be registered as your Sathi (Community Resource Person).
              They'll earn 20% commission on FarmerPay revenues from your activities.
            </Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {makeSathi ? "Register Vendor + Sathi" : "Register Vendor"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fffbeb" },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginTop: 8 },
  subtitle: { fontSize: 13, color: "#666", marginTop: 4, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: "800", color: "#888", letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 14, fontSize: 15 },

  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeCard: { width: "48%", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: "#e5e7eb" },
  typeCardActive: { borderColor: "#d97706", backgroundColor: "#fffbeb" },
  typeEmoji: { fontSize: 20 },
  typeLabel: { fontSize: 12, fontWeight: "600", color: "#555", flex: 1 },
  typeLabelActive: { color: "#d97706" },

  sathiToggle: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#ecfdf5", borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: "#6ee7b7" },
  sathiToggleTitle: { fontSize: 14, fontWeight: "700", color: "#059669" },
  sathiToggleSub: { fontSize: 11, color: "#666", marginTop: 2, lineHeight: 16 },
  sathiNote: { backgroundColor: "#f0fdf4", borderRadius: 10, padding: 12, marginTop: 8 },
  sathiNoteText: { fontSize: 12, color: "#059669", lineHeight: 18 },

  submitBtn: { marginTop: 24, backgroundColor: "#d97706", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  // Success
  successCenter: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f0fdf4" },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#16a34a", marginTop: 12 },
  successSub: { fontSize: 14, color: "#666", marginTop: 8 },
  sathiBadge: { backgroundColor: "#ecfdf5", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 12, borderWidth: 1, borderColor: "#6ee7b7" },
  sathiBadgeText: { color: "#059669", fontWeight: "700", fontSize: 13 },
  viewBtn: { marginTop: 20, backgroundColor: "#d97706", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  viewBtnText: { color: "#fff", fontWeight: "700" },
  backBtn: { marginTop: 12, paddingVertical: 8 },
  backBtnText: { color: "#888", fontWeight: "600", fontSize: 13 },
});
