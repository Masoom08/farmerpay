/**
 * Add / Edit Informal Borrowing Source.
 *
 * Covers: family/friends, money lender, adathiya, input seller credit,
 * landlord, other. Simple single-section form.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { apiGet, apiPost, apiPut } from "../lib/api";
import VoiceInputButton from "../components/VoiceInputButton";

const SOURCE_TYPES = [
  { value: "family_friends",      label: "Family / Friends",  emoji: "👨‍👩‍👧" },
  { value: "money_lender",        label: "Money Lender",      emoji: "💰" },
  { value: "adathiya",            label: "Adathiya / Trader",  emoji: "🏪" },
  { value: "input_seller_credit", label: "Input Seller Credit", emoji: "🏪" },
  { value: "landlord",            label: "Landlord",           emoji: "🏠" },
  { value: "other",               label: "Other",              emoji: "📋" },
];

const COLLATERAL_TYPES = [
  { value: "none",            label: "Nothing (unsecured)" },
  { value: "harvest_promise", label: "Next harvest promise" },
  { value: "gold",            label: "Gold / jewellery" },
  { value: "land",            label: "Land (oral agreement)" },
  { value: "crop_standing",   label: "Crop standing in field" },
  { value: "other",           label: "Other" },
];

const INTEREST_PERIODS = [
  { value: "monthly", label: "Per month" },
  { value: "yearly",  label: "Per year" },
  { value: "flat",    label: "Flat (one-time)" },
  { value: "none",    label: "No interest" },
];

export default function AddInformalBorrowing() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);

  const [sourceType, setSourceType] = useState("");
  const [lenderName, setLenderName] = useState("");
  const [borrowedAmount, setBorrowedAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [interestPeriod, setInterestPeriod] = useState("monthly");
  const [collateralType, setCollateralType] = useState("none");

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await apiGet("/farmer/borrowing-sources");
        const src = (res?.data?.sources || []).find((s: any) => s.id === parseInt(id!));
        if (src) {
          setSourceType(src.source_type || "");
          setLenderName(src.lender_name || src.source_name || "");
          setBorrowedAmount(src.borrowed_amount ? String(src.borrowed_amount) : src.outstanding_amount ? String(src.outstanding_amount) : "");
          setInterestRate(src.interest_rate_pct ? String(src.interest_rate_pct) : "");
          setInterestPeriod(src.interest_period || "monthly");
          setCollateralType(src.collateral_type || "none");
        }
      } catch { /* ignore */ }
      finally { setLoadingEdit(false); }
    })();
  }, [id, isEdit]);

  const onSave = async () => {
    if (!sourceType) { Alert.alert("Required", "Select source type"); return; }
    if (!borrowedAmount) { Alert.alert("Required", "Enter amount borrowed"); return; }

    setSaving(true);
    try {
      const body: any = {
        sourceType,
        sourceName: lenderName || undefined,
        lenderName: lenderName || undefined,
        borrowedAmount: parseFloat(borrowedAmount),
        outstandingAmount: parseFloat(borrowedAmount),
        interestRatePct: interestRate ? parseFloat(interestRate) : undefined,
        interestPeriod,
        collateralType,
      };

      if (isEdit) {
        await apiPut(`/farmer/borrowing-sources/${id}`, body);
      } else {
        await apiPost("/farmer/borrowing-sources", body);
      }
      Alert.alert(
        "Data Saved",
        isEdit ? "Borrowing source updated successfully." : "Borrowing source added successfully.",
        [
          { text: "Add Another", onPress: () => {
            setSourceType(""); setLenderName(""); setBorrowedAmount("");
            setInterestRate(""); setInterestPeriod("monthly"); setCollateralType("none");
          }},
          { text: "Back to Home", style: "cancel", onPress: () => router.replace("/(tabs)" as any) },
        ]
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save");
    } finally { setSaving(false); }
  };

  if (loadingEdit) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2e7d32" /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.sectionHeader}>Who did you borrow from?</Text>
        <View style={styles.tileGrid}>
          {SOURCE_TYPES.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeTile, sourceType === t.value && styles.typeTileSelected]}
              onPress={() => setSourceType(t.value)}
              activeOpacity={0.85}
            >
              <Text style={styles.tileEmoji}>{t.emoji}</Text>
              <Text style={[styles.tileLabel, sourceType === t.value && styles.tileLabelSelected]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {sourceType !== "" && (
          <>
            <Text style={styles.sectionHeader}>Details</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Name (person / shop)"
                placeholderTextColor="#999" value={lenderName} onChangeText={setLenderName} />
              <VoiceInputButton onResult={setLenderName} language="hi" />
            </View>
            <View style={{ height: 10 }} />
            <TextInput style={styles.input} placeholder="Amount borrowed (₹) *"
              placeholderTextColor="#999" value={borrowedAmount} onChangeText={setBorrowedAmount}
              keyboardType="numeric" />

            <Text style={styles.sectionHeader}>Interest</Text>
            <TextInput style={styles.input} placeholder="Interest rate (%)"
              placeholderTextColor="#999" value={interestRate} onChangeText={setInterestRate}
              keyboardType="decimal-pad" />
            <View style={styles.radioRow}>
              {INTEREST_PERIODS.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.radioBtn, interestPeriod === p.value && styles.radioBtnSelected]}
                  onPress={() => setInterestPeriod(p.value)}
                >
                  <Text style={[styles.radioText, interestPeriod === p.value && styles.radioTextSelected]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionHeader}>Borrowed against</Text>
            {COLLATERAL_TYPES.map(c => (
              <TouchableOpacity
                key={c.value}
                style={[styles.collateralRow, collateralType === c.value && styles.collateralSelected]}
                onPress={() => setCollateralType(c.value)}
                activeOpacity={0.85}
              >
                <View style={[styles.radioDot, collateralType === c.value && styles.radioDotFilled]} />
                <Text style={[styles.collateralLabel, collateralType === c.value && { color: "#2e7d32", fontWeight: "700" }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={onSave} activeOpacity={0.85} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : isEdit ? "Update" : "Save"}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },

  sectionHeader: { fontSize: 14, fontWeight: "700", color: "#333", marginBottom: 8, marginLeft: 4, marginTop: 16 },

  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeTile: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: "#e0e0e0", alignItems: "center", gap: 4, minHeight: 56,
  },
  typeTileSelected: { borderColor: "#e65100", backgroundColor: "#fff3e0" },
  tileEmoji: { fontSize: 20 },
  tileLabel: { fontSize: 12, fontWeight: "700", color: "#555", textAlign: "center" },
  tileLabelSelected: { color: "#e65100" },

  input: {
    backgroundColor: "#fafafa", borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12,
    height: 50, paddingHorizontal: 16, fontSize: 16, color: "#333", marginBottom: 10,
  },

  radioRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  radioBtn: {
    backgroundColor: "#fff", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1.5, borderColor: "#e0e0e0",
  },
  radioBtnSelected: { borderColor: "#e65100", backgroundColor: "#fff3e0" },
  radioText: { fontSize: 12, fontWeight: "700", color: "#555" },
  radioTextSelected: { color: "#e65100" },

  collateralRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff",
    borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: "#e8e8e8",
  },
  collateralSelected: { borderColor: "#2e7d32", backgroundColor: "#e8f5e9" },
  collateralLabel: { fontSize: 14, color: "#444" },
  radioDot: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#ccc",
  },
  radioDotFilled: { borderColor: "#2e7d32", backgroundColor: "#2e7d32" },

  saveBtn: {
    backgroundColor: "#e65100", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 20,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
