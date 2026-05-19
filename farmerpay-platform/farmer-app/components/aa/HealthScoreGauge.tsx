import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { gradeColor, scoreColor } from "../../lib/aa";

interface Props {
  score: number;
  grade: string;
  size?: number;
}

export default function HealthScoreGauge({ score, grade, size = 160 }: Props) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference * (1 - clamped / 100);
  const color = scoreColor(score);
  const { bg: gradeBg, fg: gradeFg } = gradeColor(grade);

  const gradeLabel =
    grade === "A" ? "Excellent" :
    grade === "B" ? "Good" :
    grade === "C" ? "Moderate" :
    grade === "D" ? "Weak" : "Poor";

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#f0f0f0" strokeWidth={12} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={12} fill="none"
          strokeDasharray={`${circumference}`} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={[styles.score, { color }]}>{Math.round(clamped)}</Text>
        <View style={[styles.gradeBadge, { backgroundColor: gradeBg }]}>
          <Text style={[styles.gradeText, { color: gradeFg }]}>Grade {grade}</Text>
        </View>
        <Text style={styles.label}>{gradeLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  center: { position: "absolute", justifyContent: "center", alignItems: "center" },
  score: { fontSize: 36, fontWeight: "800" },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, marginTop: 2 },
  gradeText: { fontSize: 12, fontWeight: "700" },
  label: { fontSize: 11, color: "#888", fontWeight: "600", marginTop: 2 },
});
