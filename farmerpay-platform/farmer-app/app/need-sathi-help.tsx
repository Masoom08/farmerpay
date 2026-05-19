/**
 * Need Sathi Help — Raise a ticket/intervention request
 *
 * Farmer describes the problem, picks a category, and the Sathi gets
 * notified via SMS/push. Creates a SathiIssueFlag on the backend.
 */
import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Alert, ActivityIndicator, Linking,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { apiGet, apiPost } from "../lib/api";

const HELP_CATEGORIES = [
  { key: "loan_help", emoji: "💰", label: "Loan application help", desc: "Need help filling loan form or gathering documents" },
  { key: "insurance_help", emoji: "🛡️", label: "Insurance enrollment", desc: "PMFBY, livestock, or health policy signup" },
  { key: "kyc_update", emoji: "📝", label: "KYC / profile update", desc: "Aadhaar, bank passbook, or address change" },
  { key: "repayment_issue", emoji: "📅", label: "Repayment difficulty", desc: "Can't pay EMI on time, need restructuring" },
  { key: "claim_follow_up", emoji: "📋", label: "Insurance claim follow-up", desc: "Claim filed but no response" },
  { key: "field_visit", emoji: "🚜", label: "Request field visit", desc: "Need Sathi to visit my farm" },
  { key: "other", emoji: "❓", label: "Other issue", desc: "Anything else you need help with" },
];

export default function NeedSathiHelpScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sathiMobile, setSathiMobile] = useState<string | null>(null);

  // Try to get Sathi mobile for direct call option
  useState(() => {
    apiGet("/choice/my-intermediary").then((r) => {
      if (r.success) setSathiMobile(r.data?.mobile || r.data?.intermediary?.mobile);
    }).catch(() => {});
  });

  const handleSubmit = async () => {
    if (!category) { Alert.alert("Select a category", "Please choose what you need help with."); return; }
    if (!description.trim()) { Alert.alert("Add details", "Please describe your issue briefly."); return; }

    setSubmitting(true);
    try {
      const r = await apiPost("/sathi/issues", {
        issueType: category,
        severity: urgency === "urgent" ? "high" : "medium",
        description: description.trim(),
      });
      if (r.success) {
        setSubmitted(true);
      } else {
        Alert.alert("Error", r.message || "Failed to submit. Try calling your Sathi directly.");
      }
    } catch {
      Alert.alert("Error", "Could not connect. Try calling your Sathi directly.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <Stack.Screen options={{ title: "Help Requested", headerStyle: { backgroundColor: "#059669" }, headerTintColor: "#fff" }} />
        <View style={styles.successContainer}>
          <Text style={{ fontSize: 64 }}>✅</Text>
          <Text style={styles.successTitle}>Help request sent!</Text>
          <Text style={styles.successText}>Your Sathi has been notified and will contact you shortly.</Text>

          {sathiMobile && (
            <View style={styles.callCard}>
              <Text style={styles.callLabel}>Can't wait? Call your Sathi directly:</Text>
              <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${sathiMobile}`)}>
                <Text style={styles.callBtnText}>📞 Call Sathi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.whatsappBtn} onPress={() => Linking.openURL(`https://wa.me/91${sathiMobile.replace(/^\+?91/, "")}`)}>
                <Text style={styles.whatsappBtnText}>💬 WhatsApp</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Back to My Sathi</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Need Sathi Help", headerStyle: { backgroundColor: "#dc2626" }, headerTintColor: "#fff" }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>🆘 What do you need help with?</Text>
        <Text style={styles.subtitle}>Your Sathi will be notified immediately</Text>

        {/* Category selection */}
        {HELP_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.catCard, category === cat.key && styles.catCardActive]}
            onPress={() => setCategory(cat.key)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 24 }}>{cat.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.catLabel, category === cat.key && styles.catLabelActive]}>{cat.label}</Text>
              <Text style={styles.catDesc}>{cat.desc}</Text>
            </View>
            {category === cat.key && <Text style={{ fontSize: 20 }}>✓</Text>}
          </TouchableOpacity>
        ))}

        {/* Description */}
        <Text style={styles.fieldLabel}>Describe your issue</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Tell your Sathi what you need help with..."
          placeholderTextColor="#aaa"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Urgency */}
        <Text style={styles.fieldLabel}>How urgent?</Text>
        <View style={styles.urgencyRow}>
          <TouchableOpacity
            style={[styles.urgencyBtn, urgency === "normal" && styles.urgencyActive]}
            onPress={() => setUrgency("normal")}
          >
            <Text style={[styles.urgencyText, urgency === "normal" && styles.urgencyTextActive]}>🕐 Normal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.urgencyBtn, urgency === "urgent" && styles.urgencyUrgentActive]}
            onPress={() => setUrgency("urgent")}
          >
            <Text style={[styles.urgencyText, urgency === "urgent" && styles.urgencyTextUrgent]}>🚨 Urgent</Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Send Help Request</Text>
          )}
        </TouchableOpacity>

        {/* Direct contact fallback */}
        {sathiMobile && (
          <View style={styles.directCard}>
            <Text style={styles.directLabel}>Or contact your Sathi directly:</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity style={styles.directBtn} onPress={() => Linking.openURL(`tel:${sathiMobile}`)}>
                <Text style={styles.directBtnText}>📞 Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.directBtn} onPress={() => Linking.openURL(`sms:${sathiMobile}`)}>
                <Text style={styles.directBtnText}>✉️ SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.directBtn} onPress={() => Linking.openURL(`https://wa.me/91${sathiMobile.replace(/^\+?91/, "")}`)}>
                <Text style={styles.directBtnText}>💬 WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fef2f2" },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginTop: 8 },
  subtitle: { fontSize: 13, color: "#666", marginTop: 4, marginBottom: 16 },

  catCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: "#e5e7eb" },
  catCardActive: { borderColor: "#dc2626", backgroundColor: "#fef2f2" },
  catLabel: { fontSize: 14, fontWeight: "700", color: "#333" },
  catLabelActive: { color: "#dc2626" },
  catDesc: { fontSize: 11, color: "#888", marginTop: 2 },

  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#555", marginTop: 16, marginBottom: 6, letterSpacing: 0.5 },
  textArea: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 14, fontSize: 14, minHeight: 100 },

  urgencyRow: { flexDirection: "row", gap: 10 },
  urgencyBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#d1d5db", alignItems: "center" },
  urgencyActive: { borderColor: "#059669", backgroundColor: "#ecfdf5" },
  urgencyUrgentActive: { borderColor: "#dc2626", backgroundColor: "#fef2f2" },
  urgencyText: { fontWeight: "700", fontSize: 13, color: "#555" },
  urgencyTextActive: { color: "#059669" },
  urgencyTextUrgent: { color: "#dc2626" },

  submitBtn: { marginTop: 20, backgroundColor: "#dc2626", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  directCard: { marginTop: 20, backgroundColor: "#fff", borderRadius: 12, padding: 14 },
  directLabel: { fontSize: 12, color: "#888", fontWeight: "600" },
  directBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#f3f4f6", alignItems: "center" },
  directBtnText: { fontWeight: "700", fontSize: 12, color: "#333" },

  // Success state
  successContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#ecfdf5" },
  successTitle: { fontSize: 22, fontWeight: "800", color: "#059669", marginTop: 16 },
  successText: { fontSize: 14, color: "#666", textAlign: "center", marginTop: 8, lineHeight: 20 },
  callCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginTop: 20, width: "100%", alignItems: "center" },
  callLabel: { fontSize: 12, color: "#888", fontWeight: "600", marginBottom: 10 },
  callBtn: { backgroundColor: "#059669", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, marginBottom: 8, width: "100%", alignItems: "center" },
  callBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  whatsappBtn: { backgroundColor: "#25D366", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, width: "100%", alignItems: "center" },
  whatsappBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  backBtn: { marginTop: 20, paddingVertical: 12 },
  backBtnText: { color: "#059669", fontWeight: "600", fontSize: 14 },
});
