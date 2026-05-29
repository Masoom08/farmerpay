/**
 * Give Credit — Vendor extends credit to a farmer.
 * Creates/updates vendor_credit_ledger entry.
 */
import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { formatRupees } from "../../src/utils/currency";

import { farmerApi } from "../../src/api/modules/farmer.api";

const CREDIT_REASONS = [
  { key: "input_purchase", emoji: "🌱", label: "Input purchase on credit" },
  { key: "season_advance", emoji: "📅", label: "Season advance (will pay after harvest)" },
  { key: "equipment_emi", emoji: "🚜", label: "Equipment on installment" },
  { key: "emergency", emoji: "🆘", label: "Emergency / personal need" },
  { key: "other", emoji: "📝", label: "Other" },
];

export default function GiveCreditScreen() {
  const router = useRouter();
  const { farmerId, farmerName } = useLocalSearchParams<{ farmerId?: string; farmerName?: string }>();

  const [mobile, setMobile] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("input_purchase");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    const farmerMobile = farmerId ? "" : mobile.replace(/\D/g, "").slice(-10);
    if (!farmerId && farmerMobile.length < 10) { Alert.alert("Enter farmer mobile"); return; }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert("Enter credit amount"); return; }

    setSubmitting(true);
    try {
      const r = await await farmerApi.giveCredit({
  farmerId: farmerId
    ? parseInt(farmerId, 10)
    : null,

  farmerMobile:
    farmerMobile || null,

  amount: parseFloat(amount),

  reason,

  notes: notes.trim(),

  dueDate: dueDate || null,
});

setSubmitted(true);
      
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Connection failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <Stack.Screen options={{ title: "Credit Given!", headerStyle: { backgroundColor: "#16a34a" }, headerTintColor: "#fff" }} />
        <View style={styles.successCenter}>
          <Text style={{ fontSize: 64 }}>💳</Text>
          <Text style={styles.successTitle}>Credit extended!</Text>
          <Text style={styles.successAmount}>{formatRupees(parseFloat(amount))}</Text>
          <Text style={styles.successSub}>to {farmerName || `Farmer ${mobile}`}</Text>
          <Text style={styles.successReason}>{CREDIT_REASONS.find(r => r.key === reason)?.label}</Text>
          {dueDate ? <Text style={styles.successDue}>Due: {dueDate}</Text> : null}

          <TouchableOpacity style={styles.anotherBtn} onPress={() => { setSubmitted(false); setAmount(""); setNotes(""); setMobile(""); }}>
            <Text style={styles.anotherBtnText}>+ Give more credit</Text>
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
      <Stack.Screen options={{ title: "Give Credit", headerStyle: { backgroundColor: "#d97706" }, headerTintColor: "#fff" }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>💳 Extend credit to a farmer</Text>

        {/* Farmer selection */}
        {farmerName ? (
          <View style={styles.farmerCard}>
            <Text style={styles.farmerCardName}>👤 {farmerName}</Text>
            <Text style={styles.farmerCardId}>ID: {farmerId}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>FARMER MOBILE *</Text>
            <TextInput style={styles.input} placeholder="Farmer's 10-digit mobile" value={mobile} onChangeText={(t) => setMobile(t.replace(/[^0-9+]/g, ""))} keyboardType="phone-pad" maxLength={13} />
          </>
        )}

        {/* Amount */}
        <Text style={styles.label}>CREDIT AMOUNT (₹) *</Text>
        <TextInput style={styles.amountInput} placeholder="0" value={amount} onChangeText={setAmount} keyboardType="numeric" />

        {/* Reason */}
        <Text style={styles.label}>REASON</Text>
        {CREDIT_REASONS.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.reasonCard, reason === r.key && styles.reasonCardActive]}
            onPress={() => setReason(r.key)}
          >
            <Text style={styles.reasonEmoji}>{r.emoji}</Text>
            <Text style={[styles.reasonLabel, reason === r.key && styles.reasonLabelActive]}>{r.label}</Text>
            {reason === r.key && <Text style={{ color: "#d97706" }}>✓</Text>}
          </TouchableOpacity>
        ))}

        {/* Due date */}
        <Text style={styles.label}>DUE DATE (optional)</Text>
        <TextInput style={styles.input} placeholder="YYYY-MM-DD (e.g. 2026-10-15)" value={dueDate} onChangeText={setDueDate} />

        {/* Notes */}
        <Text style={styles.label}>NOTES (optional)</Text>
        <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="Any additional details..." value={notes} onChangeText={setNotes} multiline={true} />

        {/* Summary */}
        {amount && parseFloat(amount) > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Credit Summary</Text>
            <Text style={styles.summaryAmount}>{formatRupees(parseFloat(amount))}</Text>
            <Text style={styles.summaryMeta}>
              {CREDIT_REASONS.find(r => r.key === reason)?.label}
              {dueDate ? ` · Due: ${dueDate}` : " · No due date set"}
            </Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Confirm Credit</Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fffbeb" },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginBottom: 16 },
  label: { fontSize: 11, fontWeight: "800", color: "#888", letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 14, fontSize: 15 },
  amountInput: { backgroundColor: "#fff", borderWidth: 2, borderColor: "#d97706", borderRadius: 12, padding: 16, fontSize: 28, fontWeight: "800", textAlign: "center", color: "#d97706" },

  farmerCard: { backgroundColor: "#ecfdf5", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#6ee7b7" },
  farmerCardName: { fontSize: 16, fontWeight: "700", color: "#059669" },
  farmerCardId: { fontSize: 11, color: "#888", marginTop: 2 },

  reasonCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1.5, borderColor: "#e5e7eb" },
  reasonCardActive: { borderColor: "#d97706", backgroundColor: "#fffbeb" },
  reasonEmoji: { fontSize: 18 },
  reasonLabel: { flex: 1, fontSize: 13, fontWeight: "600", color: "#555" },
  reasonLabelActive: { color: "#d97706" },

  summaryCard: { backgroundColor: "#fef3c7", borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: "#fde68a" },
  summaryLabel: { fontSize: 11, fontWeight: "800", color: "#92400e", letterSpacing: 1 },
  summaryAmount: { fontSize: 28, fontWeight: "800", color: "#92400e", marginTop: 4 },
  summaryMeta: { fontSize: 12, color: "#92400e", marginTop: 4 },

  submitBtn: { marginTop: 20, backgroundColor: "#d97706", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  successCenter: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#fffbeb" },
  successTitle: { fontSize: 22, fontWeight: "800", color: "#92400e", marginTop: 12 },
  successAmount: { fontSize: 32, fontWeight: "800", color: "#d97706", marginTop: 8 },
  successSub: { fontSize: 14, color: "#666", marginTop: 4 },
  successReason: { fontSize: 12, color: "#888", marginTop: 4 },
  successDue: { fontSize: 12, color: "#d97706", fontWeight: "600", marginTop: 4 },
  anotherBtn: { marginTop: 20, backgroundColor: "#d97706", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  anotherBtnText: { color: "#fff", fontWeight: "700" },
  backBtn: { marginTop: 12, paddingVertical: 8 },
  backBtnText: { color: "#888", fontWeight: "600", fontSize: 13 },
});
