import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Share } from "react-native";
import { getShareableSummary } from "../../lib/drishti";

interface Props { runUuid: string }

export default function DrishtiShareButton({ runUuid }: Props) {
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      const summary = await getShareableSummary(runUuid);
      await Share.share({
        message: summary.whatsapp_text || summary.summary_text,
        title: "DRISHTI Scenario Result",
      });
    } catch (err: any) {
      Alert.alert("Share Failed", err.message || "Could not generate summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handleShare} disabled={loading} activeOpacity={0.8}>
      <Text style={styles.btnText}>{loading ? "Generating..." : "📤 Share via WhatsApp"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { backgroundColor: "#25D366", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 12 },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
