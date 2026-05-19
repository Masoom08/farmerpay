import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { apiGet, formatRupees } from "../lib/api";

type Range = 7 | 14 | 30 | 90;
type View4 = "farm" | "pond" | "vessel" | "trip";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const CAT_COLORS: Record<string, string> = {
  FEED: "#00897b", FINGERLINGS: "#26a69a", POND_PREP: "#4db6ac",
  AERATION_ELECTRICITY: "#f9a825", WATER_MGMT: "#0288d1",
  HARVEST_LABOR: "#1565c0", HEALTH_TREATMENT: "#c62828",
  FUEL: "#e64a19", ICE: "#0097a7", BAIT: "#6d4c41",
  NETS_GEAR: "#5d4037", CREW_WAGES: "#1565c0",
  BOAT_MAINTENANCE: "#455a64", AUCTION_COMMISSION: "#6a1b9a",
  LANDING_FEES: "#7b1fa2", POND_CONSTRUCTION: "#4e342e",
  VESSEL_PURCHASE: "#3e2723", LABOR: "#1976d2", LICENSE: "#00838f",
  INSURANCE: "#00838f", EQUIPMENT: "#455a64", TRANSPORT: "#5d4037",
  OTHER: "#616161",
};

export default function FisheryPnl() {
  const router = useRouter();
  const [range, setRange] = useState<Range>(14);
  const [view, setView] = useState<View4>("farm");
  const [opType, setOpType] = useState<"INLAND" | "SEA" | "BOTH">("INLAND");
  const [loading, setLoading] = useState(true);
  const [farm, setFarm] = useState<any>(null);
  const [perPond, setPerPond] = useState<any[]>([]);
  const [perVessel, setPerVessel] = useState<any[]>([]);
  const [perTrip, setPerTrip] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const start = daysAgo(range);
      const end = daysAgo(0);
      const profRes = await apiGet("/roots/fishery/v2/profile");
      if (profRes.success && profRes.data) setOpType(profRes.data.operation_type || "INLAND");
      const [f, p, v, t] = await Promise.all([
        apiGet(`/roots/fishery/v2/pnl/farm?startDate=${start}&endDate=${end}`),
        apiGet(`/roots/fishery/v2/pnl/per-pond?startDate=${start}&endDate=${end}`),
        apiGet(`/roots/fishery/v2/pnl/per-vessel?startDate=${start}&endDate=${end}`),
        apiGet(`/roots/fishery/v2/pnl/per-trip?startDate=${start}&endDate=${end}`),
      ]);
      if (f.success) setFarm(f.data);
      if (p.success) setPerPond(p.data || []);
      if (v.success) setPerVessel(v.data || []);
      if (t.success) setPerTrip(t.data || []);
    } catch (e) {}
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#00695c" /></View>;
  }

  const showInland = opType === "INLAND" || opType === "BOTH";
  const showSea = opType === "SEA" || opType === "BOTH";

  const totalCost = Number(farm?.totalCost || 0);
  const totalRev = Number(farm?.totalRevenue || 0);
  const net = Number(farm?.netProfit ?? (totalRev - totalCost));
  const netColor = net >= 0 ? "#00695c" : "#c62828";

  const costCats = Object.entries(farm?.costByCategory || {})
    .sort((a: any, b: any) => b[1] - a[1]) as [string, number][];
  const maxCat = costCats[0]?.[1] || 1;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>P&L / लाभ-हानि</Text>
      </View>

      {/* Range selector */}
      <View style={s.chipRow}>
        {([7, 14, 30, 90] as Range[]).map((r) => (
          <TouchableOpacity key={r} style={[s.chip, range === r && s.chipSel]} onPress={() => setRange(r)}>
            <Text style={[s.chipText, range === r && s.chipTextSel]}>{r}d</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* View toggle */}
      <View style={[s.viewToggleRow, { marginTop: 10 }]}>
        <TouchableOpacity style={[s.toggleBtn, view === "farm" && s.toggleBtnSel]} onPress={() => setView("farm")}>
          <Text style={[s.toggleText, view === "farm" && s.toggleTextSel]}>Farm</Text>
        </TouchableOpacity>
        {showInland && (
          <TouchableOpacity style={[s.toggleBtn, view === "pond" && s.toggleBtnSel]} onPress={() => setView("pond")}>
            <Text style={[s.toggleText, view === "pond" && s.toggleTextSel]}>Pond</Text>
          </TouchableOpacity>
        )}
        {showSea && (
          <TouchableOpacity style={[s.toggleBtn, view === "vessel" && s.toggleBtnSel]} onPress={() => setView("vessel")}>
            <Text style={[s.toggleText, view === "vessel" && s.toggleTextSel]}>Vessel</Text>
          </TouchableOpacity>
        )}
        {showSea && (
          <TouchableOpacity style={[s.toggleBtn, view === "trip" && s.toggleBtnSel]} onPress={() => setView("trip")}>
            <Text style={[s.toggleText, view === "trip" && s.toggleTextSel]}>Trip</Text>
          </TouchableOpacity>
        )}
      </View>

      {view === "farm" && (
        <>
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>Net Profit</Text>
            <Text style={[s.summaryNet, { color: netColor === "#00695c" ? "#fff" : "#ffcdd2" }]}>{formatRupees(net)}</Text>
            <View style={s.summaryRow}>
              <View style={s.summaryBox}>
                <Text style={s.summaryBoxLabel}>Revenue</Text>
                <Text style={s.summaryBoxVal}>{formatRupees(totalRev)}</Text>
              </View>
              <View style={s.summaryBox}>
                <Text style={s.summaryBoxLabel}>Cost</Text>
                <Text style={s.summaryBoxVal}>{formatRupees(totalCost)}</Text>
              </View>
            </View>
            <View style={[s.summaryRow, { marginTop: 8 }]}>
              <View style={s.summaryBox}>
                <Text style={s.summaryBoxLabel}>Formal</Text>
                <Text style={s.summaryBoxVal}>{formatRupees(Number(farm?.formalCost || 0))}</Text>
              </View>
              <View style={s.summaryBox}>
                <Text style={s.summaryBoxLabel}>Informal</Text>
                <Text style={s.summaryBoxVal}>{formatRupees(Number(farm?.informalCost || 0))}</Text>
              </View>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardLabel}>Cost Breakdown / खर्च विवरण</Text>
            {costCats.length === 0 ? (
              <Text style={s.empty}>No costs recorded in this period</Text>
            ) : (
              costCats.map(([cat, amt]) => {
                const color = CAT_COLORS[cat] || "#616161";
                const pct = (amt / maxCat) * 100;
                return (
                  <View key={cat} style={{ marginBottom: 10 }}>
                    <View style={s.catRow}>
                      <Text style={[s.catName, { color }]}>{cat.replace(/_/g, " ")}</Text>
                      <Text style={s.catAmount}>{formatRupees(amt)}</Text>
                    </View>
                    <View style={s.bar}>
                      <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </>
      )}

      {view === "pond" && (
        <View>
          {perPond.length === 0 ? (
            <View style={s.card}><Text style={s.empty}>No pond data</Text></View>
          ) : (
            perPond.map((p: any) => {
              const n = Number(p.netProfit);
              const color = n >= 0 ? "#00695c" : "#c62828";
              return (
                <View key={p.pondUuid} style={s.assetCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <Text style={s.assetEmoji}>🏞️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.assetName}>{p.pondName || "Unnamed pond"}</Text>
                      <Text style={s.assetSub}>
                        {Number(p.pondAreaHectares || 0).toFixed(2)} ha · {p.currentSpecies || "—"}
                      </Text>
                    </View>
                    <Text style={[s.assetNet, { color }]}>{formatRupees(n)}</Text>
                  </View>
                  <View style={s.detailBox}>
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Revenue:</Text>
                      <Text style={[s.detailVal, { color: "#00695c" }]}>{formatRupees(Number(p.totalRevenue))}</Text>
                    </View>
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Cost:</Text>
                      <Text style={[s.detailVal, { color: "#c62828" }]}>{formatRupees(Number(p.totalCost))}</Text>
                    </View>
                    {p.directCost !== undefined && (
                      <>
                        <View style={s.detailRow}>
                          <Text style={s.detailSubLabel}>  direct:</Text>
                          <Text style={s.detailSubVal}>{formatRupees(Number(p.directCost))}</Text>
                        </View>
                        <View style={s.detailRow}>
                          <Text style={s.detailSubLabel}>  allocated:</Text>
                          <Text style={s.detailSubVal}>{formatRupees(Number(p.allocatedCost))}</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {view === "vessel" && (
        <View>
          {perVessel.length === 0 ? (
            <View style={s.card}><Text style={s.empty}>No vessel data</Text></View>
          ) : (
            perVessel.map((v: any) => {
              const n = Number(v.netProfit);
              const color = n >= 0 ? "#00695c" : "#c62828";
              return (
                <View key={v.vesselUuid} style={s.assetCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <Text style={s.assetEmoji}>⛵</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.assetName}>{v.vesselName || "Unnamed vessel"}</Text>
                      <Text style={s.assetSub}>
                        {(v.vesselType || "").replace(/_/g, " ")} · {v.tripCount || 0} trips
                      </Text>
                    </View>
                    <Text style={[s.assetNet, { color }]}>{formatRupees(n)}</Text>
                  </View>
                  <View style={s.detailBox}>
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Revenue:</Text>
                      <Text style={[s.detailVal, { color: "#00695c" }]}>{formatRupees(Number(v.totalRevenue))}</Text>
                    </View>
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Cost:</Text>
                      <Text style={[s.detailVal, { color: "#c62828" }]}>{formatRupees(Number(v.totalCost))}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {view === "trip" && (
        <View>
          {perTrip.length === 0 ? (
            <View style={s.card}><Text style={s.empty}>No trip data</Text></View>
          ) : (
            perTrip.map((t: any) => {
              const n = Number(t.netProfit);
              const color = n >= 0 ? "#00695c" : "#c62828";
              return (
                <View key={t.tripUuid} style={s.assetCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <Text style={s.assetEmoji}>🎣</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.assetName}>{t.vesselName || "Trip"}</Text>
                      <Text style={s.assetSub}>
                        {t.departDate}{t.returnDate ? ` → ${t.returnDate}` : ""} · {Number(t.catchTotalKg || 0).toFixed(0)} kg
                      </Text>
                    </View>
                    <Text style={[s.assetNet, { color }]}>{formatRupees(n)}</Text>
                  </View>
                  <View style={s.detailBox}>
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Revenue:</Text>
                      <Text style={[s.detailVal, { color: "#00695c" }]}>{formatRupees(Number(t.totalRevenue))}</Text>
                    </View>
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>Cost:</Text>
                      <Text style={[s.detailVal, { color: "#c62828" }]}>{formatRupees(Number(t.totalCost))}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  back: { fontSize: 28, color: "#00695c", fontWeight: "700" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#00695c" },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fff" },
  chipSel: { borderColor: "#00695c", backgroundColor: "#e0f2f1" },
  chipText: { fontSize: 12, fontWeight: "700", color: "#666" },
  chipTextSel: { color: "#00695c" },
  viewToggleRow: { flexDirection: "row", gap: 6 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fff", alignItems: "center" },
  toggleBtnSel: { borderColor: "#00695c", backgroundColor: "#e0f2f1" },
  toggleText: { fontSize: 12, fontWeight: "700", color: "#666" },
  toggleTextSel: { color: "#00695c" },
  summaryCard: { backgroundColor: "#004d40", borderRadius: 16, padding: 20, marginTop: 14, marginBottom: 14 },
  summaryTitle: { color: "#80cbc4", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryNet: { fontSize: 32, fontWeight: "900", marginTop: 4, marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryBox: { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10, padding: 12 },
  summaryBoxLabel: { color: "#80cbc4", fontSize: 11, marginBottom: 2 },
  summaryBoxVal: { color: "#fff", fontSize: 15, fontWeight: "800" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardLabel: { fontSize: 12, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 },
  empty: { fontSize: 13, color: "#999", textAlign: "center", padding: 12 },
  catRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  catName: { fontSize: 12, fontWeight: "700" },
  catAmount: { fontSize: 12, fontWeight: "600", color: "#333" },
  bar: { height: 8, backgroundColor: "#f0f0f0", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  assetCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginTop: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  assetEmoji: { fontSize: 28, marginRight: 10 },
  assetName: { fontSize: 15, fontWeight: "700", color: "#333" },
  assetSub: { fontSize: 11, color: "#888", marginTop: 2 },
  assetNet: { fontSize: 16, fontWeight: "800" },
  detailBox: { backgroundColor: "#fafafa", borderRadius: 10, padding: 10 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  detailLabel: { fontSize: 12, color: "#555" },
  detailVal: { fontSize: 13, fontWeight: "700" },
  detailSubLabel: { fontSize: 11, color: "#888" },
  detailSubVal: { fontSize: 11, color: "#888" },
});
