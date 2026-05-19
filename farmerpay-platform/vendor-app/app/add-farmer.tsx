/**
 * Add Farmer — Vendor registers a new farmer customer.
 * Creates user + farmer_profile if needed, then links via vendor_farmer_links.
 */
import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, Switch } from "react-native";
import { Stack, useRouter } from "expo-router";
import { apiPost } from "../lib/api";

export default function AddFarmerScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [village, setVillage] = useState("");
  const [giveCredit, setGiveCredit] = useState(false);
  const [creditLimit, setCreditLimit] = useState("5000");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert("Name required"); return; }
    if (!mobile.trim() || mobile.replace(/\D/g, "").length < 10) { Alert.alert("Enter valid 10-digit mobile"); return; }

    setSubmitting(true);
    try {
      const r = await apiPost("/vyapar/farmer/register-farmer", {
        name: name.trim(),
        mobile: mobile.replace(/\D/g, "").slice(-10),
        village: village.trim(),
        giveCredit,
        creditLimit: giveCredit ? parseFloat(creditLimit) || 5000 : 0,
      });
      if (r.success) {
        setResult(r.data);
        setSubmitted(true);
      } else {
        Alert.alert("Error", r.message || "Failed to register farmer.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Connection failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <Stack.Screen options={{ title: "Farmer Added!", headerStyle: { backgroundColor: "#16a34a" }, headerTintColor: "#fff" }} />
        <View style={styles.successCenter}>
          <Text style={{ fontSize: 64 }}>✅</Text>
          <Text style={styles.successTitle}>Farmer registered!</Text>
          <Text style={styles.successSub}>{name} ({mobile})</Text>
          {village ? <Text style={styles.successVillage}>📍 {village}</Text> : null}
          {giveCredit && (
            <View style={styles.creditBadge}>
              <Text style={styles.creditBadgeText}>💳 Credit limit: ₹{creditLimit} set</Text>
            </View>
          )}
          <TouchableOpacity style={styles.anotherBtn} onPress={() => { setSubmitted(false); setName(""); setMobile(""); setVillage(""); setGiveCredit(false); }}>
            <Text style={styles.anotherBtnText}>+ Add another farmer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Add Farmer", headerStyle: { backgroundColor: "#d97706" }, headerTintColor: "#fff" }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>👤 Register a new farmer</Text>
        <Text style={styles.subtitle}>Add a farmer customer to your network</Text>

        <Text style={styles.label}>FARMER NAME *</Text>
        <TextInput style={styles.input} placeholder="e.g. Ramesh Kumar" value={name} onChangeText={setName} autoCapitalize="words" />

        <Text style={styles.label}>MOBILE NUMBER *</Text>
        <TextInput style={styles.input} placeholder="10-digit mobile" value={mobile} onChangeText={(t) => setMobile(t.replace(/[^0-9+]/g, ""))} keyboardType="phone-pad" maxLength={13} />

        <Text style={styles.label}>VILLAGE / AREA</Text>
        <TextInput style={styles.input} placeholder="e.g. Kothapally" value={village} onChangeText={setVillage} autoCapitalize="words" />

        {/* Credit toggle */}
        <View style={styles.creditToggle}>
          <View style={{ flex: 1 }}>
            <Text style={styles.creditToggleTitle}>💳 Set up credit for this farmer?</Text>
            <Text style={styles.creditToggleSub}>Allow them to buy on credit from your shop</Text>
          </View>
          <Switch
            value={giveCredit}
            onValueChange={setGiveCredit}
            trackColor={{ false: "#d1d5db", true: "#fde68a" }}
            thumbColor={giveCredit ? "#d97706" : "#9ca3af"}
          />
        </View>

        {giveCredit && (
          <View style={styles.creditSection}>
            <Text style={styles.label}>CREDIT LIMIT (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="5000"
              value={creditLimit}
              onChangeText={setCreditLimit}
              keyboardType="numeric"
            />
            <Text style={styles.creditNote}>
              Farmer can buy up to this amount on credit. You can adjust later.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.submitText}>{giveCredit ? "Register Farmer + Set Credit" : "Register Farmer"}</Text>
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
  label: { fontSize: 11, fontWeight: "800", color: "#888", letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 14, fontSize: 15 },

  creditToggle: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fef3c7", borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: "#fde68a" },
  creditToggleTitle: { fontSize: 14, fontWeight: "700", color: "#92400e" },
  creditToggleSub: { fontSize: 11, color: "#666", marginTop: 2 },
  creditSection: { backgroundColor: "#fffbeb", borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: "#fde68a" },
  creditNote: { fontSize: 11, color: "#888", marginTop: 6 },

  submitBtn: { marginTop: 24, backgroundColor: "#d97706", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  successCenter: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f0fdf4" },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#16a34a", marginTop: 12 },
  successSub: { fontSize: 16, color: "#333", marginTop: 8 },
  successVillage: { fontSize: 13, color: "#666", marginTop: 4 },
  creditBadge: { backgroundColor: "#fef3c7", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 12, borderWidth: 1, borderColor: "#fde68a" },
  creditBadgeText: { color: "#92400e", fontWeight: "700", fontSize: 13 },
  anotherBtn: { marginTop: 20, backgroundColor: "#d97706", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  anotherBtnText: { color: "#fff", fontWeight: "700" },
  backBtn: { marginTop: 12, paddingVertical: 8 },
  backBtnText: { color: "#888", fontWeight: "600", fontSize: 13 },
});
