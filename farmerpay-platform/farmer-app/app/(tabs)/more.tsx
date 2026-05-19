/**
 * More Tab — Persona phase simplified drawer.
 *
 * The old "module grid" of ROOTS / DICE / PULSE / SAGE / CHOICE / TRUST
 * jargon is gone. What stays:
 *   - Profile (contains the TRUST score — less prominence)
 *   - Soil Health Card
 *   - SAGE advisories archive
 *   - Settings / Language / Help
 *   - Logout
 */

import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { useRouter } from "expo-router";
import { apiLogout } from "../../lib/api";
import { setBiometricEnabled } from "../../lib/biometric";
import { getShowNumericScores, setShowNumericScores } from "../../lib/readiness";

const MENU = [
  { icon: "👤", label: "My profile", desc: "Personal details, TRUST score, KYC", route: "/trust-profile" },
  { icon: "💰", label: "My borrowing sources", desc: "Bank loans, PACS, FPO, informal debt", route: "/borrowing-sources" },
  { icon: "🔒", label: "Verification status", desc: "Identity & address verification levels", route: "/validation-status" },
  { icon: "🧪", label: "Soil health card", desc: "Test results, NPK levels, fertilizer advice", route: "/soil-health" },
  { icon: "🌱", label: "Advisories archive", desc: "All SAGE advice and acknowledgements", route: "/sage" },
  { icon: "🤝", label: "My SATHI agent", desc: "Select, call, SMS, or WhatsApp your Sathi", route: "/choice" },
  { icon: "🆘", label: "Need Sathi help", desc: "Raise a ticket — loan, insurance, KYC, field visit", route: "/need-sathi-help" },
  { icon: "⭐", label: "Rate your Sathi", desc: "Share feedback like rating an Uber driver", route: "/rate-sathi" },
  { icon: "🏪", label: "Krishi Bazaar", desc: "My vendors, purchases, inputs & credit", route: "/krishi-bazaar" },
  { icon: "📋", label: "Compliance", desc: "Consent and grievance status", route: null },
  { icon: "🌍", label: "Language", desc: "Change app language", route: null },
  { icon: "❓", label: "Help & support", desc: "Contact: 1800-XXX-XXXX", route: null },
];

export default function MoreScreen() {
  const router = useRouter();
  const [showScores, setShowScores] = useState(false);

  useEffect(() => {
    getShowNumericScores().then(setShowScores);
  }, []);

  const handleToggleScores = async (value: boolean) => {
    setShowScores(value);
    await setShowNumericScores(value);
  };

  const handleLogout = async () => {
    const confirmed = typeof window !== "undefined"
      ? window.confirm("Are you sure you want to logout?")
      : true;
    if (!confirmed) return;
    await apiLogout();
    await setBiometricEnabled(false);
    router.replace("/login");
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {MENU.map((item, i) => (
        <TouchableOpacity
          key={i}
          style={styles.menuCard}
          activeOpacity={0.7}
          onPress={() => item.route && router.push(item.route as any)}
        >
          <Text style={styles.menuIcon}>{item.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuDesc}>{item.desc}</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      ))}

      {/* Readiness preferences */}
      <View style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>Loan Readiness</Text>
        <View style={styles.settingsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Show numeric scores</Text>
            <Text style={styles.menuDesc}>Display raw numbers on your readiness screen</Text>
          </View>
          <Switch
            value={showScores}
            onValueChange={handleToggleScores}
            trackColor={{ false: "#ddd", true: "#a5d6a7" }}
            thumbColor={showScores ? "#2e7d32" : "#f4f3f4"}
            accessibilityLabel="Show numeric scores on readiness screen"
          />
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>FarmerPay v1.0 · Built with ❤️ for Indian farmers</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  menuCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 8,
    flexDirection: "row", alignItems: "center", gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  menuIcon: { fontSize: 24 },
  menuLabel: { fontSize: 14, fontWeight: "700", color: "#333" },
  menuDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  menuArrow: { fontSize: 22, color: "#ccc" },
  settingsCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginTop: 16, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  settingsTitle: { fontSize: 11, fontWeight: "600", color: "#888", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 },
  settingsRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  logoutBtn: { backgroundColor: "#fbe9e7", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 16 },
  logoutText: { color: "#c62828", fontSize: 15, fontWeight: "700" },
  version: { textAlign: "center", fontSize: 11, color: "#ccc", marginTop: 20 },
});
