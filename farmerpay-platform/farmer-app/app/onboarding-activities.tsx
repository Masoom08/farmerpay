/**
 * Onboarding Activities — Single-screen multi-select
 *
 * Shown right after first successful login. Farmer picks all livelihood
 * activities they do (agri + non-agri), and we submit immediately. Tier
 * (herd size, pond area, etc.) and income are NOT captured here — that
 * friction is pushed into each ROOTS section as an inline micro-prompt
 * when the farmer actually opens it, so onboarding stays ~10 seconds.
 *
 * Rationale:
 *   - Persona classification only needs the COUNT of agri activities,
 *     not tier or income. So step 2/3 of the old wizard were pure drag.
 *   - Indian smallholder farmers on 3G + low literacy don't tolerate
 *     3-step wizards well; single-screen checklists convert much better.
 *   - Tier is captured in-context later via a 3-button card inside each
 *     section (dairy/fishery/etc.) so farmers only answer it when they're
 *     already looking at that section's content.
 *
 * POSTs to /farmer/activity-subscriptions with just { activityCode,
 * priorityRank } items, then routes to /(tabs).
 */

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiPost } from "../lib/api";

// ─── Activity catalog ───────────────────────────────────────────────

type ActivityCode =
  | "CROP" | "DAIRY" | "FISHERY" | "HORTI"
  | "POULTRY" | "GOATERY"
  | "LABOUR_WAGE" | "SHOP_BUSINESS" | "REMITTANCE" | "OTHER";

type ActivityDef = {
  code: ActivityCode;
  icon: string;
  label: string;
  labelHi: string;
};

const ACTIVITIES: ActivityDef[] = [
  { code: "CROP",          icon: "🌾", label: "Crop farming",    labelHi: "फसल खेती" },
  { code: "DAIRY",         icon: "🐄", label: "Dairy",           labelHi: "डेयरी" },
  { code: "FISHERY",       icon: "🐟", label: "Fishery",         labelHi: "मत्स्य पालन" },
  { code: "HORTI",         icon: "🍎", label: "Horticulture",    labelHi: "बागवानी" },
  { code: "POULTRY",       icon: "🐔", label: "Poultry",         labelHi: "मुर्गी पालन" },
  { code: "GOATERY",       icon: "🐐", label: "Goatery",         labelHi: "बकरी पालन" },
  { code: "LABOUR_WAGE",   icon: "👷", label: "Wage labour",     labelHi: "मजदूरी" },
  { code: "SHOP_BUSINESS", icon: "🏪", label: "Shop / business", labelHi: "दुकान/व्यवसाय" },
  { code: "REMITTANCE",    icon: "💸", label: "Remittance",      labelHi: "विप्रेषण" },
  { code: "OTHER",         icon: "➕", label: "Other",           labelHi: "अन्य" },
];

// ─── Component ──────────────────────────────────────────────────────

export default function OnboardingActivitiesScreen() {
  const router = useRouter();
  const [picked, setPicked] = useState<ActivityCode[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (code: ActivityCode) => {
    setPicked((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const submit = async () => {
    if (picked.length === 0) {
      Alert.alert("Pick at least one", "Select all activities you're engaged in.");
      return;
    }
    setSubmitting(true);
    try {
      const items = picked.map((code, i) => ({
        activityCode: code,
        priorityRank: i + 1,
      }));
      const r = await apiPost("/farmer/activity-subscriptions", {
        source: "FARMER_DECLARED",
        items,
      });
      if (!r?.success) throw new Error(r?.message || "Failed to save");
      // Phase 2A: SHC is only meaningful for farmers whose activities touch
      // the ground — CROP or HORTI. Pure dairy / poultry / goatery / sheep /
      // fishery / labour / shop / remittance farmers bypass SHC entirely
      // and land on the Farm tab.
      const needsSoilContext =
        picked.includes("CROP") || picked.includes("HORTI");
      router.replace(
        (needsSoilContext ? "/onboarding-soil-health" : "/(tabs)") as any
      );
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Could not save your activities. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.headerEmoji}>🌾</Text>
        <Text style={styles.headerTitle}>Tell us about your farm</Text>
        <Text style={styles.headerHi}>अपने खेत के बारे में बताएं</Text>
      </View>

      <Text style={styles.stepTitle}>What activities do you do?</Text>
      <Text style={styles.stepSub}>
        Pick all that apply · You can change this later · आप बाद में बदल सकते हैं
      </Text>

      {ACTIVITIES.map((act) => {
        const active = picked.includes(act.code);
        return (
          <TouchableOpacity
            key={act.code}
            style={[styles.actCard, active && styles.actCardActive]}
            onPress={() => toggle(act.code)}
            activeOpacity={0.7}
          >
            <Text style={styles.actIcon}>{act.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actLabel, active && styles.actLabelActive]}>{act.label}</Text>
              <Text style={styles.actHi}>{act.labelHi}</Text>
            </View>
            <View style={[styles.checkbox, active && styles.checkboxActive]}>
              {active && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={submit}
        activeOpacity={0.8}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>
            Continue →   ({picked.length} selected)
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footer}>
        We'll ask for details (size, count) when you open each section.
      </Text>
    </ScrollView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 48 },

  headerCard: { backgroundColor: "#1b5e20", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 20 },
  headerEmoji: { fontSize: 36, marginBottom: 4 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerHi: { color: "#a5d6a7", fontSize: 13, marginTop: 2 },

  stepTitle: { fontSize: 16, fontWeight: "800", color: "#333", marginBottom: 4 },
  stepSub: { fontSize: 12, color: "#888", marginBottom: 14 },

  actCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, borderWidth: 2, borderColor: "transparent" },
  actCardActive: { borderColor: "#2e7d32", backgroundColor: "#f1f8e9" },
  actIcon: { fontSize: 26 },
  actLabel: { fontSize: 15, fontWeight: "700", color: "#333" },
  actLabelActive: { color: "#1b5e20" },
  actHi: { fontSize: 11, color: "#888", marginTop: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#ccc", justifyContent: "center", alignItems: "center" },
  checkboxActive: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "800" },

  primaryBtn: { backgroundColor: "#2e7d32", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 16 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  footer: { textAlign: "center", fontSize: 11, color: "#bbb", marginTop: 20 },
});
