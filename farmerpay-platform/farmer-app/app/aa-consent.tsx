import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { initiateConsent, getConsentStatus, checkConsent, type ConsentStatus } from "../lib/aa";
import ConsentStatusBadge from "../components/aa/ConsentStatusBadge";

export default function AAConsentScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(useCallback(() => {
    loadStatus();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []));

  const loadStatus = async () => {
    try {
      const status = await getConsentStatus();
      setConsent(status);
    } catch { /* ignore */ }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const result = await initiateConsent({ provider: "setu", monthsBack: 12 });
      if (result.status === "already_active") {
        Alert.alert("Already Connected", "Your bank account is already linked.");
        router.push("/aa-health");
        return;
      }
      if (result.redirectUrl) {
        await Linking.openURL(result.redirectUrl);
        // Start polling for approval
        startPolling(result.consentUuid);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to initiate consent");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (uuid: string) => {
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const status = await checkConsent(uuid);
        if (status.status === "approved") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setPolling(false);
          setConsent(status);
          Alert.alert("Success!", "Bank account connected. View your financial health score.", [
            { text: "View Score", onPress: () => router.push("/aa-health") },
          ]);
        } else if (status.status === "rejected") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setPolling(false);
          setConsent(status);
          Alert.alert("Consent Denied", "You denied the consent request. You can try again.");
        }
      } catch { /* continue polling */ }
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setPolling(false);
      }
    }, 300000);
  };

  const isConnected = consent?.status === "approved";

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={48} color="#2e7d32" />
        <Text style={styles.heading}>Account Aggregator</Text>
        <Text style={styles.subheading}>
          Securely share your bank statement data to unlock financial insights
        </Text>
      </View>

      {/* Current status */}
      {consent ? (
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <ConsentStatusBadge status={consent.status} />
        </View>
      ) : null}

      {/* Benefits */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Why connect?</Text>
        {BENEFITS.map((b, i) => (
          <View key={i} style={styles.benefitRow}>
            <Ionicons name={b.icon as any} size={20} color="#2e7d32" />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>{b.title}</Text>
              <Text style={styles.benefitDesc}>{b.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Security note */}
      <View style={[styles.card, { backgroundColor: "#e8f5e9" }]}>
        <View style={styles.securityRow}>
          <Ionicons name="lock-closed" size={18} color="#1b5e20" />
          <Text style={styles.securityText}>
            RBI-regulated. Your bank never shares login credentials. You control what data is shared and can revoke anytime.
          </Text>
        </View>
      </View>

      {/* Action */}
      {isConnected ? (
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/aa-health")}>
          <Ionicons name="analytics" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>View Financial Health</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.primaryBtn, (loading || polling) && styles.disabledBtn]}
          onPress={handleConnect}
          disabled={loading || polling}
        >
          {loading || polling ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="link" size={20} color="#fff" />
          )}
          <Text style={styles.primaryBtnText}>
            {polling ? "Waiting for approval..." : loading ? "Connecting..." : "Connect My Bank"}
          </Text>
        </TouchableOpacity>
      )}

      {polling ? (
        <Text style={styles.pollingHint}>
          Complete the consent in your bank's app. We'll detect it automatically.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const BENEFITS = [
  { icon: "pulse-outline", title: "Financial Health Score", desc: "See your 0-100 score based on real bank data" },
  { icon: "cash-outline", title: "Better Loan Terms", desc: "Banks offer better rates with verified income" },
  { icon: "flash-outline", title: "Faster Approval", desc: "Skip manual document uploads — instant verification" },
  { icon: "leaf-outline", title: "Seasonal EMI Planning", desc: "Pay EMI when you have income, skip lean months" },
];

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 20, paddingTop: 10 },
  heading: { fontSize: 22, fontWeight: "800", color: "#1b5e20", marginTop: 10 },
  subheading: { fontSize: 14, color: "#666", textAlign: "center", marginTop: 6, paddingHorizontal: 20 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 },
  statusLabel: { fontSize: 13, color: "#666", fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a2e", marginBottom: 12 },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  benefitText: { flex: 1 },
  benefitTitle: { fontSize: 14, fontWeight: "600", color: "#1a1a2e" },
  benefitDesc: { fontSize: 12, color: "#666", marginTop: 2 },
  securityRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  securityText: { flex: 1, fontSize: 12, color: "#1b5e20", lineHeight: 18 },
  primaryBtn: { backgroundColor: "#2e7d32", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabledBtn: { opacity: 0.7 },
  pollingHint: { textAlign: "center", fontSize: 12, color: "#888", marginTop: 10 },
});
