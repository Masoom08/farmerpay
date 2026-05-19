import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  status: string;
  compact?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; fg: string; icon: string }> = {
  not_initiated: { label: "Not Connected", bg: "#f5f5f5", fg: "#888", icon: "link-outline" },
  requested: { label: "Pending Approval", bg: "#fff8e1", fg: "#f9a825", icon: "time-outline" },
  approved: { label: "Connected", bg: "#e8f5e9", fg: "#2e7d32", icon: "checkmark-circle" },
  expired: { label: "Expired", bg: "#ffebee", fg: "#c62828", icon: "alert-circle-outline" },
  revoked: { label: "Revoked", bg: "#fce4ec", fg: "#ad1457", icon: "close-circle-outline" },
  rejected: { label: "Rejected", bg: "#ffebee", fg: "#c62828", icon: "close-circle" },
};

export default function ConsentStatusBadge({ status, compact }: Props) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_initiated;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon as any} size={compact ? 14 : 16} color={config.fg} />
      <Text style={[styles.text, { color: config.fg, fontSize: compact ? 11 : 12 }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  text: { fontWeight: "600" },
});
