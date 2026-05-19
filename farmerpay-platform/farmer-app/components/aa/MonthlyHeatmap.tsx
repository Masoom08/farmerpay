import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import { MONTH_NAMES } from "../../lib/aa";

interface MonthData {
  month: number;
  income: number;
  expense: number;
}

interface Props {
  monthlyData: MonthData[];
  height?: number;
}

export default function MonthlyHeatmap({ monthlyData, height = 200 }: Props) {
  if (!monthlyData || monthlyData.length === 0) return null;

  const width = Dimensions.get("window").width - 60;
  const pad = { top: 10, bottom: 30, left: 10, right: 10 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const maxVal = Math.max(...monthlyData.map(d => Math.max(d.income, d.expense)), 1);
  const barW = (chartW / 12) * 0.35;
  const gap = chartW / 12;
  const scale = (v: number) => (v / maxVal) * chartH;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monthly Income vs Expense</Text>
      <Svg width={width} height={height}>
        <Line x1={pad.left} y1={pad.top + chartH} x2={pad.left + chartW} y2={pad.top + chartH} stroke="#ddd" strokeWidth={1} />
        {monthlyData.map((m, i) => {
          const x = pad.left + i * gap + gap * 0.15;
          const incH = scale(m.income);
          const expH = scale(m.expense);
          const baseY = pad.top + chartH;
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={baseY - incH} width={barW} height={incH} fill="rgba(45,134,89,0.75)" rx={2} />
              <Rect x={x + barW + 2} y={baseY - expH} width={barW} height={expH} fill="rgba(198,40,40,0.6)" rx={2} />
              <SvgText x={x + barW} y={baseY + 14} fontSize={8} fill="#888" textAnchor="middle">
                {MONTH_NAMES[(m.month - 1) % 12]}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "rgba(45,134,89,0.75)" }]} />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "rgba(198,40,40,0.6)" }]} />
          <Text style={styles.legendText}>Expense</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12 },
  title: { fontSize: 14, fontWeight: "700", color: "#1b5e20", marginBottom: 8 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: "#666" },
});
