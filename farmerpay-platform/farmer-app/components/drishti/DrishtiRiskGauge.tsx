import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface Props { score: number; size?: number; label?: string }

export default function DrishtiRiskGauge({ score, size = 100, label }: Props) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  const color = score <= 30 ? "#2e7d32" : score <= 50 ? "#e67e22" : score <= 70 ? "#e65100" : "#c62828";
  const ratingLabel = score <= 25 ? "Low Risk" : score <= 45 ? "Moderate" : score <= 65 ? "Elevated" : score <= 80 ? "High" : "Critical";

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#f0f0f0" strokeWidth={8} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={8} fill="none"
          strokeDasharray={`${circumference}`} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={[styles.score, { color }]}>{Math.round(score)}</Text>
        <Text style={styles.label}>{label || ratingLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  center: { position: "absolute", justifyContent: "center", alignItems: "center" },
  score: { fontSize: 24, fontWeight: "800" },
  label: { fontSize: 10, color: "#888", fontWeight: "600" },
});
