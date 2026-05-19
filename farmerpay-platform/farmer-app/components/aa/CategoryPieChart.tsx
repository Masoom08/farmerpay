import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";

interface Slice {
  category: string;
  amount: number;
  percentage: number;
}

interface Props {
  data: Slice[];
  size?: number;
  title?: string;
}

const COLORS = [
  "#2e7d32", "#558b2f", "#9e9d24", "#f9a825", "#ef6c00",
  "#e65100", "#c62828", "#6a1b9a", "#1565c0", "#00695c",
];

export default function CategoryPieChart({ data, size = 180, title }: Props) {
  if (!data || data.length === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - 20) / 2;
  let currentAngle = -90;

  const slices = data
    .filter(d => d.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage);

  const paths = slices.map((slice, i) => {
    const angle = (slice.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;

    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return <Path key={i} d={d} fill={COLORS[i % COLORS.length]} />;
  });

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Svg width={size} height={size}>{paths}</Svg>
      <View style={styles.legend}>
        {slices.slice(0, 6).map((s, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: COLORS[i % COLORS.length] }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {formatCategory(s.category)}
            </Text>
            <Text style={styles.legendPct}>{Math.round(s.percentage)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, alignItems: "center" },
  title: { fontSize: 14, fontWeight: "700", color: "#1b5e20", marginBottom: 10, alignSelf: "flex-start" },
  legend: { marginTop: 12, width: "100%" },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { flex: 1, fontSize: 12, color: "#444" },
  legendPct: { fontSize: 12, fontWeight: "600", color: "#1a1a2e" },
});
