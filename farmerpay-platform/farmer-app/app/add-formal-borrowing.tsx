/**
 * Add / Edit Formal Borrowing Source.
 *
 * Multi-section form: Institution Type → Details → Loan Details.
 * Conditional fields based on institution type (bank vs PACS vs FPO vs SHG).
 * Edit mode when ?id= query param is present.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { apiGet, apiPost, apiPut } from "../lib/api";
import VoiceInputButton from "../components/VoiceInputButton";

// ─── Constants ──────────────────────────────────────────────────

const INSTITUTION_TYPES = [
  { value: "public_sector_bank", label: "Public Sector Bank", emoji: "🏦" },
  { value: "private_bank",       label: "Private Bank",       emoji: "🏦" },
  { value: "rrb",                label: "Regional Rural Bank", emoji: "🏦" },
  { value: "cooperative_bank",   label: "Co-operative Bank",  emoji: "🏦" },
  { value: "sfb",                label: "Small Finance Bank", emoji: "🏦" },
  { value: "nbfc",               label: "NBFC",               emoji: "🏦" },
  { value: "pacs",               label: "PACS",               emoji: "🏛" },
  { value: "fpo",                label: "FPO",                emoji: "🏘" },
  { value: "shg",                label: "SHG",                emoji: "👥" },
  { value: "mfi",                label: "Microfinance",       emoji: "🏦" },
];

const LOAN_CATEGORIES = [
  { group: "KCC Loans", items: [
    { value: "kcc_crop", label: "KCC - Crop" },
    { value: "kcc_allied", label: "KCC - Allied (dairy/fish/poultry)" },
    { value: "kcc_consumption", label: "KCC - Consumption" },
  ]},
  { group: "Non-KCC Agri", items: [
    { value: "crop_loan", label: "Crop Loan" },
    { value: "dairy_loan", label: "Dairy Loan" },
    { value: "livestock_loan", label: "Livestock Loan" },
    { value: "fisheries_loan", label: "Fisheries Loan" },
    { value: "horticulture_loan", label: "Horticulture Loan" },
    { value: "animal_husbandry", label: "Animal Husbandry" },
    { value: "farm_mechanization", label: "Farm Mechanization" },
    { value: "irrigation", label: "Irrigation" },
    { value: "land_development", label: "Land Development" },
    { value: "agri_processing", label: "Agri Processing" },
    { value: "warehouse_receipt", label: "Warehouse Receipt" },
    { value: "input_loan", label: "Input Loan" },
    { value: "agri_infrastructure", label: "Agri Infrastructure" },
  ]},
  { group: "Gold Loans", items: [
    { value: "agri_gold", label: "Agri Gold Loan" },
    { value: "kcc_gold", label: "KCC Gold" },
    { value: "allied_gold", label: "Allied Gold" },
    { value: "consumption_gold", label: "Consumption Gold" },
    { value: "gold_general", label: "Gold Loan (General)" },
  ]},
  { group: "Group Loans", items: [
    { value: "jlg", label: "JLG (Joint Liability)" },
    { value: "shg_group_loan", label: "SHG Group Loan" },
  ]},
  { group: "Other", items: [
    { value: "mudra_shishu", label: "MUDRA Shishu" },
    { value: "mudra_kishore", label: "MUDRA Kishore" },
    { value: "mudra_tarun", label: "MUDRA Tarun" },
    { value: "personal", label: "Personal / Consumption" },
    { value: "other", label: "Other" },
  ]},
];

const BANK_TYPES = new Set(["public_sector_bank", "private_bank", "rrb", "cooperative_bank", "sfb", "nbfc", "mfi"]);
const isGoldLoan = (lt: string) => ["agri_gold", "kcc_gold", "allied_gold", "consumption_gold", "gold_general"].includes(lt);

export default function AddFormalBorrowing() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);

  // Form state
  const [sourceType, setSourceType] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [memberId, setMemberId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [loanType, setLoanType] = useState("");
  const [sanctionAmount, setSanctionAmount] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [repaymentType, setRepaymentType] = useState("emi");
  const [goldWeight, setGoldWeight] = useState("");
  const [goldPurity, setGoldPurity] = useState("22k");

  // Load existing data for edit mode
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await apiGet("/farmer/borrowing-sources");
        const src = (res?.data?.sources || []).find((s: any) => s.id === parseInt(id!));
        if (src) {
          setSourceType(src.source_type || "");
          setSourceName(src.source_name || "");
          setBranchName(src.branch_name || "");
          setMemberId(src.member_id || "");
          setGroupName(src.group_name || "");
          setLoanType(src.loan_type || "");
          setSanctionAmount(src.sanction_amount ? String(src.sanction_amount) : "");
          setOutstandingAmount(src.outstanding_amount ? String(src.outstanding_amount) : "");
          setInterestRate(src.interest_rate_pct ? String(src.interest_rate_pct) : "");
          setRepaymentType(src.repayment_type || "emi");
          setGoldWeight(src.gold_weight_grams ? String(src.gold_weight_grams) : "");
          setGoldPurity(src.gold_purity_carat || "22k");
        }
      } catch { /* ignore */ }
      finally { setLoadingEdit(false); }
    })();
  }, [id, isEdit]);

  const onSave = async () => {
    if (!sourceType) { Alert.alert("Required", "Select institution type"); return; }
    if (!loanType) { Alert.alert("Required", "Select loan category"); return; }

    setSaving(true);
    try {
      const body: any = {
        sourceType,
        sourceName: sourceName || undefined,
        branchName: branchName || undefined,
        memberId: memberId || undefined,
        groupName: groupName || undefined,
        loanType,
        sanctionAmount: sanctionAmount ? parseFloat(sanctionAmount) : undefined,
        outstandingAmount: outstandingAmount ? parseFloat(outstandingAmount) : undefined,
        interestRatePct: interestRate ? parseFloat(interestRate) : undefined,
        interestPeriod: "yearly",
        repaymentType,
      };

      if (isGoldLoan(loanType)) {
        body.goldWeightGrams = goldWeight ? parseFloat(goldWeight) : undefined;
        body.goldPurityCarat = goldPurity;
      }

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
            // Reset form
            setSourceType(""); setSourceName(""); setBranchName("");
            setAccountNumber(""); setIfscCode(""); setMemberId("");
            setGroupName(""); setLoanType(""); setSanctionAmount("");
            setOutstandingAmount(""); setInterestRate(""); setRepaymentType("emi");
            setGoldWeight(""); setGoldPurity("22k");
          }},
          { text: "Back to Home", style: "cancel", onPress: () => router.replace("/(tabs)" as any) },
        ]
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loadingEdit) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2e7d32" /></View>;
  }

  const showBankFields = BANK_TYPES.has(sourceType);
  const showPacsFields = sourceType === "pacs";
  const showFpoFields = sourceType === "fpo";
  const showShgFields = sourceType === "shg";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Section 1: Institution Type */}
        <Text style={styles.sectionHeader}>Institution Type</Text>
        <View style={styles.tileGrid}>
          {INSTITUTION_TYPES.map(t => (
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

        {/* Section 2: Institution Details (conditional) */}
        {sourceType !== "" && (
          <>
            <Text style={styles.sectionHeader}>
              {showBankFields ? "Bank Details" : showPacsFields ? "PACS Details" : showFpoFields ? "FPO Details" : showShgFields ? "SHG Details" : "Details"}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Institution / Lender Name *"
                placeholderTextColor="#999" value={sourceName} onChangeText={setSourceName} />
              <VoiceInputButton onResult={setSourceName} language="hi" />
            </View>
            <View style={{ height: 10 }} />

            {showBankFields && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Branch Name"
                    placeholderTextColor="#999" value={branchName} onChangeText={setBranchName} />
                  <VoiceInputButton onResult={setBranchName} language="hi" />
                </View>
                <View style={{ height: 10 }} />
                <TextInput style={styles.input} placeholder="Account Number *" secureTextEntry
                  placeholderTextColor="#999" value={accountNumber} onChangeText={setAccountNumber}
                  keyboardType="number-pad" maxLength={18} />
                <TextInput style={styles.input} placeholder="IFSC Code * (e.g. SBIN0001234)"
                  placeholderTextColor="#999" value={ifscCode} onChangeText={(v) => setIfscCode(v.toUpperCase())}
                  autoCapitalize="characters" maxLength={11} />
              </>
            )}
            {(showPacsFields || showFpoFields) && (
              <TextInput style={styles.input} placeholder="Member ID"
                placeholderTextColor="#999" value={memberId} onChangeText={setMemberId} />
            )}
            {showShgFields && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Group Name *"
                    placeholderTextColor="#999" value={groupName} onChangeText={setGroupName} />
                  <VoiceInputButton onResult={setGroupName} language="hi" />
                </View>
                <View style={{ height: 10 }} />
              </>
            )}
          </>
        )}

        {/* Section 3: Loan Details */}
        {sourceType !== "" && (
          <>
            <Text style={styles.sectionHeader}>Loan Category</Text>
            {LOAN_CATEGORIES.map(cat => (
              <View key={cat.group}>
                <Text style={styles.groupLabel}>{cat.group}</Text>
                <View style={styles.tileGrid}>
                  {cat.items.map(item => (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.loanTile, loanType === item.value && styles.loanTileSelected]}
                      onPress={() => setLoanType(item.value)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.loanTileText, loanType === item.value && styles.loanTileTextSelected]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            <Text style={styles.sectionHeader}>Amounts</Text>
            <TextInput style={styles.input} placeholder="Sanction Amount (₹)"
              placeholderTextColor="#999" value={sanctionAmount} onChangeText={setSanctionAmount}
              keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Outstanding Amount (₹)"
              placeholderTextColor="#999" value={outstandingAmount} onChangeText={setOutstandingAmount}
              keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Interest Rate (% per year)"
              placeholderTextColor="#999" value={interestRate} onChangeText={setInterestRate}
              keyboardType="decimal-pad" />

            <Text style={styles.sectionHeader}>Repayment Type</Text>
            <View style={styles.radioRow}>
              {["emi", "bullet", "flexi"].map(rt => (
                <TouchableOpacity
                  key={rt}
                  style={[styles.radioBtn, repaymentType === rt && styles.radioBtnSelected]}
                  onPress={() => setRepaymentType(rt)}
                >
                  <Text style={[styles.radioText, repaymentType === rt && styles.radioTextSelected]}>
                    {rt.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isGoldLoan(loanType) && (
              <>
                <Text style={styles.sectionHeader}>Gold Details</Text>
                <TextInput style={styles.input} placeholder="Gold Weight (grams)"
                  placeholderTextColor="#999" value={goldWeight} onChangeText={setGoldWeight}
                  keyboardType="decimal-pad" />
                <View style={styles.radioRow}>
                  {["22k", "20k", "18k"].map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.radioBtn, goldPurity === p && styles.radioBtnSelected]}
                      onPress={() => setGoldPurity(p)}
                    >
                      <Text style={[styles.radioText, goldPurity === p && styles.radioTextSelected]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* Save */}
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
  groupLabel: { fontSize: 12, fontWeight: "600", color: "#888", marginLeft: 4, marginTop: 10, marginBottom: 4 },

  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeTile: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: "#e0e0e0", alignItems: "center", gap: 4,
    minHeight: 56,
  },
  typeTileSelected: { borderColor: "#2e7d32", backgroundColor: "#e8f5e9" },
  tileEmoji: { fontSize: 20 },
  tileLabel: { fontSize: 12, fontWeight: "700", color: "#555", textAlign: "center" },
  tileLabelSelected: { color: "#2e7d32" },

  loanTile: {
    backgroundColor: "#fff", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: "#e0e0e0", minHeight: 40, justifyContent: "center",
  },
  loanTileSelected: { borderColor: "#2e7d32", backgroundColor: "#e8f5e9" },
  loanTileText: { fontSize: 12, fontWeight: "600", color: "#555" },
  loanTileTextSelected: { color: "#2e7d32" },

  input: {
    backgroundColor: "#fafafa", borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12,
    height: 50, paddingHorizontal: 16, fontSize: 16, color: "#333", marginBottom: 10,
  },

  radioRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  radioBtn: {
    flex: 1, backgroundColor: "#fff", borderRadius: 10, paddingVertical: 12, alignItems: "center",
    borderWidth: 1.5, borderColor: "#e0e0e0",
  },
  radioBtnSelected: { borderColor: "#2e7d32", backgroundColor: "#e8f5e9" },
  radioText: { fontSize: 13, fontWeight: "700", color: "#555" },
  radioTextSelected: { color: "#2e7d32" },

  saveBtn: {
    backgroundColor: "#2e7d32", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 20,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
