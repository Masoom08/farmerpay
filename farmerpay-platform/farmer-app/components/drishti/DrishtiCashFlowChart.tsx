import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import type { CashFlowMonth } from "../../lib/drishti";

interface Props { data: CashFlowMonth[]; height?: number }

export default function DrishtiCashFlowChart({ data, height = 200 }: Props) {
  if (!data || data.length === 0) return null;

  const width = Dimensions.get("window").width - 60;
  const padding = { top: 10, bottom: 30, left: 10, right: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(d => Math.max(d.inflows?.total || 0, d.outflows?.total || 0)), 1);
  const barW = (chartW / data.length) * 0.35;
  const gap = chartW / data.length;
  const scale = (v: number) => (v / maxVal) * chartH;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monthly Cash Flow</Text>
      <Svg width={width} height={height}>
        {/* Zero line */}
        <Line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH} stroke="#ddd" strokeWidth={1} />

        {data.map((m, i) => {
          const x = padding.left + i * gap + gap * 0.15;
          const inflowH = scale(m.inflows?.total || 0);
          const outflowH = scale(m.outflows?.total || 0);
          const baseY = padding.top + chartH;

          return (
            <React.Fragment key={i}>
              {/* Inflow bar (green, going up) */}
              <Rect x={x} y={baseY - inflowH} width={barW} height={inflowH} fill="rgba(45,134,89,0.75)" rx={2} />
              {/* Outflow bar (red, next to it) */}
              <Rect x={x + barW + 2} y={baseY - outflowH} width={barW} height={outflowH} fill="rgba(198,40,40,0.6)" rx={2} />
              {/* Month label */}
              <SvgText x={x + barW} y={baseY + 14} fontSize={9} fill="#888" textAnchor="middle">
                {m.monthName || m.month?.slice(5)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "rgba(45,134,89,0.75)" }]} /><Text style={styles.legendText}>Inflows</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: "rgba(198,40,40,0.6)" }]} /><Text style={styles.legendText}>Outflows</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12 },
  title: { fontSize: 14, fontWeight: "700", color: "#1b5e20", marginBottom: 8 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: "#666" },
});
