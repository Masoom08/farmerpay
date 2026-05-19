"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  Warehouse,
  BarChart3,
  MapPin,
  Thermometer,
  Shield,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { apiGet, formatRupees } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────

interface Commodity {
  id: string;
  commodity_id?: string;
  name: string;
  commodity_name?: string;
  commodity_type?: string;
  perishability_index?: number;
  volatility_class?: string;
  shelf_life_days?: number;
  storage_factor?: number;
  cold_chain_dependency?: string;
  msp_applicable?: boolean;
}

interface PriceRecord {
  date?: string;
  record_date?: string;
  price?: number;
  modal_price?: number;
  opening_price?: number;
  closing_price?: number;
  highest_price?: number;
  lowest_price?: number;
  arrivals_tonnes?: number;
  quantity_traded_quintals?: number;
  price_trend?: string;
  quality_flag?: string;
  policy_regime?: string;
}

interface Forecast {
  horizon_days?: number;
  predicted_price?: number;
  predictedPrice?: number;
  forecast_price_min?: number;
  forecast_price_max?: number;
  forecast_confidence?: number;
  confidence?: number;
  risk_score?: number;
  riskScore?: number;
  directional_confidence?: number;
  forecast_factors?: string;
  model_version?: string;
}

interface Mandi {
  id: number;
  mandi_code?: string;
  mandi_name?: string;
  name?: string;
  mandi_type?: string;
  density_score?: number;
  transport_cost_index?: number;
  cold_storage_proximity_km?: number;
  price_discovery_rank?: number;
  fpo_aggregation_flag?: boolean;
}

interface MspRecord {
  msp_price?: number;
  mspPrice?: number;
  price?: number;
  msp_season?: string;
  msp_year?: number;
  msp_announced_date?: string;
}

const DEFAULT_COMMODITY_ID = "COMM-WHEAT-UUID-001";

export default function MarketIntelligencePage() {
  const router = useRouter();
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [selectedCommodity, setSelectedCommodity] = useState(DEFAULT_COMMODITY_ID);
  const [prices, setPrices] = useState<PriceRecord[]>([]);
  const [mspData, setMspData] = useState<MspRecord | null>(null);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [mandis, setMandis] = useState<Mandi[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMandi, setSelectedMandi] = useState(1);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("fp_token") || ""
      : "";

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCommodity, selectedMandi]);

  async function loadData() {
    setLoading(true);
    try {
      const [comRes, priceRes, forecastRes, mspRes, mandiRes] =
        await Promise.allSettled([
          apiGet("/pulse/commodities", token),
          apiGet(
            `/pulse/prices/latest?commodityId=${selectedCommodity}&mandiId=${selectedMandi}&days=30`,
            token
          ),
          apiGet(
            `/pulse/price-forecast/${selectedCommodity}?mandiId=${selectedMandi}`,
            token
          ),
          apiGet(`/pulse/msp/${selectedCommodity}`, token),
          apiGet("/pulse/mandis", token),
        ]);

      if (comRes.status === "fulfilled") {
        const data = comRes.value.data || comRes.value || [];
        setCommodities(
          Array.isArray(data)
            ? data.map((c: Record<string, unknown>) => ({
                ...c,
                id: (c.commodity_id as string) || (c.id as string),
                name: (c.commodity_name as string) || (c.name as string),
              }))
            : []
        );
      }

      if (priceRes.status === "fulfilled") {
        const data = priceRes.value.data || priceRes.value.prices || [];
        setPrices(Array.isArray(data) ? data : []);
      }

      if (forecastRes.status === "fulfilled") {
        const data = forecastRes.value.data || forecastRes.value;
        setForecasts(Array.isArray(data) ? data : data ? [data] : []);
      }

      if (mspRes.status === "fulfilled") {
        const data = mspRes.value.data || mspRes.value;
        setMspData(data);
      }

      if (mandiRes.status === "fulfilled") {
        const data = mandiRes.value.data || mandiRes.value || [];
        setMandis(Array.isArray(data) ? data : []);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        localStorage.removeItem("fp_token");
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  // ─── Derived data ─────────────────────────────────────────────────

  const mspPrice =
    mspData?.msp_price ?? mspData?.mspPrice ?? mspData?.price ?? null;

  const chartData = prices.map((p) => ({
    date: p.record_date || p.date || "",
    modal: p.modal_price ?? p.price ?? 0,
    high: p.highest_price ?? 0,
    low: p.lowest_price ?? 0,
    open: p.opening_price ?? 0,
    close: p.closing_price ?? 0,
    arrivals: p.arrivals_tonnes ?? 0,
    trend: p.price_trend ?? "stable",
  }));

  const latestPrice =
    chartData.length > 0 ? chartData[chartData.length - 1].modal : null;
  const firstPrice = chartData.length > 0 ? chartData[0].modal : null;
  const priceChange =
    latestPrice && firstPrice ? latestPrice - firstPrice : 0;
  const priceChangePct =
    firstPrice && firstPrice > 0
      ? ((priceChange / firstPrice) * 100).toFixed(1)
      : "0";
  const aboveMsp =
    latestPrice != null && mspPrice != null && latestPrice >= mspPrice;

  const selectedCom = commodities.find(
    (c) => c.id === selectedCommodity || c.commodity_id === selectedCommodity
  );

  // ─── Arrivals bar chart data ──────────────────────────────────────

  const arrivalsData = chartData.map((d) => ({
    date: d.date,
    arrivals: d.arrivals,
  }));

  // ─── Forecast cards ───────────────────────────────────────────────

  const forecastCards = forecasts.map((f) => ({
    horizon: f.horizon_days || 0,
    price: f.predicted_price ?? f.predictedPrice ?? 0,
    min: f.forecast_price_min ?? 0,
    max: f.forecast_price_max ?? 0,
    confidence: f.forecast_confidence ?? f.confidence ?? 0,
    risk: f.risk_score ?? f.riskScore ?? 0,
    direction: f.directional_confidence ?? 0,
    factors: f.forecast_factors || "",
    model: f.model_version || "",
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">PULSE Market Intelligence</h1>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-3" />
                <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          PULSE Market Intelligence
        </h1>
        <p className="text-muted-foreground text-sm">
          Real-time prices, ML forecasts, and mandi analytics across 9 PULSE
          tables
        </p>
      </div>

      {/* Commodity Selector */}
      <div className="flex flex-wrap gap-2">
        {commodities.map((c) => (
          <Badge
            key={c.id}
            variant={selectedCommodity === c.id ? "default" : "outline"}
            className={`cursor-pointer px-3 py-1.5 text-sm ${
              selectedCommodity === c.id
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "hover:bg-slate-100"
            }`}
            onClick={() => setSelectedCommodity(c.id)}
          >
            {c.name}
            {c.volatility_class && (
              <span className="ml-1 opacity-70 text-xs">
                ({c.volatility_class})
              </span>
            )}
          </Badge>
        ))}
      </div>

      {/* Mandi Selector */}
      {mandis.length > 0 && (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Mandi:</span>
          {mandis.map((m) => (
            <Badge
              key={m.id}
              variant={selectedMandi === m.id ? "default" : "outline"}
              className={`cursor-pointer text-xs ${
                selectedMandi === m.id
                  ? "bg-blue-600 text-white"
                  : "hover:bg-slate-100"
              }`}
              onClick={() => setSelectedMandi(m.id)}
            >
              {m.mandi_name || m.name}
              {m.price_discovery_rank === 1 && " *"}
            </Badge>
          ))}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Today's Price */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Today&apos;s Modal Price
            </div>
            <div className="text-3xl font-extrabold">
              {latestPrice ? formatRupees(latestPrice) : "--"}
            </div>
            <div className="text-xs mt-1">
              <span
                className={
                  priceChange >= 0 ? "text-emerald-600" : "text-red-600"
                }
              >
                {priceChange >= 0 ? "+" : ""}
                {formatRupees(priceChange)} ({priceChangePct}%)
              </span>{" "}
              vs 30d ago
            </div>
          </CardContent>
        </Card>

        {/* MSP */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground uppercase mb-1">
              MSP ({mspData?.msp_season || "Rabi"} {mspData?.msp_year || ""})
            </div>
            <div className="text-3xl font-extrabold">
              {mspPrice ? formatRupees(mspPrice) : "--"}
            </div>
            {latestPrice && mspPrice && (
              <Badge
                variant="outline"
                className={`mt-1 text-xs ${
                  aboveMsp
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {aboveMsp ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {aboveMsp ? "Above" : "Below"} MSP by{" "}
                {formatRupees(Math.abs(latestPrice - mspPrice))}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Commodity Info */}
        {selectedCom && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase mb-1">
                  Volatility
                </div>
                <div className="text-lg font-bold capitalize">
                  {selectedCom.volatility_class || "moderate"}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Thermometer className="w-3 h-3" />
                  <span className="text-xs text-muted-foreground">
                    Perishability: {selectedCom.perishability_index ?? "?"}/10
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase mb-1">
                  Storage
                </div>
                <div className="text-lg font-bold">
                  {selectedCom.shelf_life_days ?? "?"} days
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Warehouse className="w-3 h-3" />
                  <span className="text-xs text-muted-foreground">
                    Cold chain:{" "}
                    {selectedCom.cold_chain_dependency || "none"}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase mb-1">
                  Daily Loss Rate
                </div>
                <div className="text-lg font-bold">
                  {selectedCom.storage_factor
                    ? `${(Number(selectedCom.storage_factor) * 100).toFixed(2)}%`
                    : "--"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedCom.commodity_type || ""}
                  {selectedCom.msp_applicable ? " | MSP Applicable" : ""}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="prices">
        <TabsList>
          <TabsTrigger value="prices">Price Chart</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="mandis">Mandi Analytics</TabsTrigger>
          <TabsTrigger value="data">Raw Price Data</TabsTrigger>
        </TabsList>

        {/* ── Price Chart Tab ── */}
        <TabsContent value="prices">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Price Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  30-Day Price Trend (Modal + High/Low Range)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient
                            id="priceGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#16a34a"
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="95%"
                              stopColor="#16a34a"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="rangeGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#60a5fa"
                              stopOpacity={0.1}
                            />
                            <stop
                              offset="95%"
                              stopColor="#60a5fa"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "#94a3b8" } as object}
                          tickFormatter={(v) =>
                            new Date(v).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })
                          }
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#94a3b8" } as object}
                          domain={["auto", "auto"]}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            formatRupees(Number(value)),
                            String(name),
                          ]}
                          labelFormatter={(v) =>
                            new Date(String(v)).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          }
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            fontSize: "12px",
                          }}
                        />
                        {mspPrice && (
                          <ReferenceLine
                            y={mspPrice}
                            stroke="#dc2626"
                            strokeDasharray="6 4"
                            label={{
                              value: `MSP ${formatRupees(mspPrice)}`,
                              position: "right",
                              fill: "#dc2626",
                              fontSize: 10,
                            }}
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey="high"
                          stroke="#93c5fd"
                          strokeWidth={1}
                          fill="url(#rangeGrad)"
                          name="High"
                        />
                        <Area
                          type="monotone"
                          dataKey="low"
                          stroke="#93c5fd"
                          strokeWidth={1}
                          fill="none"
                          name="Low"
                        />
                        <Area
                          type="monotone"
                          dataKey="modal"
                          stroke="#16a34a"
                          strokeWidth={2.5}
                          fill="url(#priceGrad)"
                          name="Modal Price"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                      No price data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Arrivals Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Arrivals (tonnes/day)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {arrivalsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={arrivalsData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 9, fill: "#94a3b8" } as object}
                          tickFormatter={(v) =>
                            new Date(v).toLocaleDateString("en-IN", {
                              day: "numeric",
                            })
                          }
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#94a3b8" } as object}
                        />
                        <Tooltip
                          formatter={(v) => [
                            `${Number(v)} T`,
                            "Arrivals",
                          ]}
                        />
                        <Bar
                          dataKey="arrivals"
                          fill="#60a5fa"
                          radius={[2, 2, 0, 0]}
                        >
                          {arrivalsData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={
                                arrivalsData[i].arrivals > 150
                                  ? "#f59e0b"
                                  : "#60a5fa"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400">
                      No arrivals data
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Forecasts Tab ── */}
        <TabsContent value="forecasts">
          {forecastCards.length > 0 ? (
            <div className="space-y-6">
              {/* Forecast Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {forecastCards.map((f) => (
                  <Card key={f.horizon} className="relative overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 w-full h-1 ${
                        f.risk > 60
                          ? "bg-red-500"
                          : f.risk > 30
                            ? "bg-amber-400"
                            : "bg-emerald-500"
                      }`}
                    />
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-xs font-bold">
                          {f.horizon}-Day Forecast
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {f.model}
                        </span>
                      </div>

                      <div className="text-3xl font-extrabold mb-1">
                        {formatRupees(f.price)}
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">
                        Range: {formatRupees(f.min)} - {formatRupees(f.max)}
                      </div>

                      {/* Confidence */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Confidence</span>
                          <span className="font-bold">{f.confidence}%</span>
                        </div>
                        <Progress value={f.confidence} className="h-2" />
                      </div>

                      {/* Risk */}
                      <div className="flex justify-between mt-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Risk: </span>
                          <span
                            className={`font-bold ${
                              f.risk > 60
                                ? "text-red-600"
                                : f.risk > 30
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                            }`}
                          >
                            {f.risk}/100
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Direction:{" "}
                          </span>
                          <span className="font-bold">{f.direction}%</span>
                        </div>
                      </div>

                      {/* Factors */}
                      {f.factors && (
                        <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                          <div className="text-xs text-muted-foreground font-medium mb-1">
                            Key Factors
                          </div>
                          <p className="text-xs text-slate-600">{f.factors}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Forecast vs Current */}
              {latestPrice && forecastCards.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Forecast Price Trajectory
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={[
                            {
                              day: "Today",
                              price: latestPrice,
                              min: latestPrice,
                              max: latestPrice,
                            },
                            ...forecastCards.map((f) => ({
                              day: `+${f.horizon}d`,
                              price: f.price,
                              min: f.min,
                              max: f.max,
                            })),
                          ]}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="day"
                            tick={{ fontSize: 12 } as object}
                          />
                          <YAxis
                            tick={{ fontSize: 11 } as object}
                            domain={["auto", "auto"]}
                          />
                          <Tooltip
                            formatter={(v) => [formatRupees(Number(v))]}
                          />
                          {mspPrice && (
                            <ReferenceLine
                              y={mspPrice}
                              stroke="#dc2626"
                              strokeDasharray="4 4"
                              label={{
                                value: "MSP",
                                fill: "#dc2626",
                                fontSize: 10,
                              }}
                            />
                          )}
                          <Area
                            type="monotone"
                            dataKey="max"
                            stroke="#93c5fd"
                            strokeWidth={1}
                            fill="#dbeafe"
                            fillOpacity={0.3}
                            name="Max"
                          />
                          <Area
                            type="monotone"
                            dataKey="min"
                            stroke="#93c5fd"
                            strokeWidth={1}
                            fill="white"
                            name="Min"
                          />
                          <Area
                            type="monotone"
                            dataKey="price"
                            stroke="#059669"
                            strokeWidth={2.5}
                            fill="none"
                            name="Predicted"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No forecast data available for this commodity/mandi
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Mandi Analytics Tab ── */}
        <TabsContent value="mandis">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mandi Registry</CardTitle>
              <CardDescription>
                APMC mandis with price discovery ranking, transport costs, and
                cold storage proximity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mandis.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mandi</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">
                        Price Rank
                      </TableHead>
                      <TableHead className="text-right">
                        Density Score
                      </TableHead>
                      <TableHead className="text-right">
                        Transport Cost
                      </TableHead>
                      <TableHead className="text-right">
                        Cold Storage (km)
                      </TableHead>
                      <TableHead className="text-center">FPO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mandis.map((m) => (
                      <TableRow
                        key={m.id}
                        className={
                          selectedMandi === m.id ? "bg-blue-50" : "cursor-pointer hover:bg-slate-50"
                        }
                        onClick={() => setSelectedMandi(m.id)}
                      >
                        <TableCell className="font-medium">
                          {m.mandi_name || m.name}
                          {m.price_discovery_rank === 1 && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-xs bg-amber-50 text-amber-700 border-amber-200"
                            >
                              Lead Market
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs uppercase">
                            {m.mandi_type || "--"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          #{m.price_discovery_rank || "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.density_score ?? "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.transport_cost_index
                            ? formatRupees(m.transport_cost_index)
                            : "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.cold_storage_proximity_km ?? "--"} km
                        </TableCell>
                        <TableCell className="text-center">
                          {m.fpo_aggregation_flag ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                              Yes
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              No
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No mandi data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Raw Price Data Tab ── */}
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Daily Price Records (30 Days)
              </CardTitle>
              <CardDescription>
                OHLC prices with arrivals, quality flags, and policy regime from
                Agmarknet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                      <TableHead className="text-right">High</TableHead>
                      <TableHead className="text-right">Low</TableHead>
                      <TableHead className="text-right">Close</TableHead>
                      <TableHead className="text-right font-bold">
                        Modal
                      </TableHead>
                      <TableHead className="text-right">
                        Arrivals (T)
                      </TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Policy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prices
                      .slice()
                      .reverse()
                      .map((p, i) => {
                        const date = p.record_date || p.date || "";
                        const modal = p.modal_price ?? p.price ?? 0;
                        const trend = p.price_trend || "stable";
                        return (
                          <TableRow key={i}>
                            <TableCell className="text-xs">
                              {date
                                ? new Date(date).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                  })
                                : "--"}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {formatRupees(p.opening_price)}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {formatRupees(p.highest_price)}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {formatRupees(p.lowest_price)}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {formatRupees(p.closing_price)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-bold">
                              {formatRupees(modal)}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {p.arrivals_tonnes ?? "--"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  trend === "rising"
                                    ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                                    : trend === "falling"
                                      ? "text-red-700 border-red-200 bg-red-50"
                                      : "text-slate-600"
                                }`}
                              >
                                {trend === "rising" ? (
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                ) : trend === "falling" ? (
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                ) : null}
                                {trend}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  p.quality_flag === "clean"
                                    ? "text-emerald-700"
                                    : p.quality_flag === "outlier"
                                      ? "text-red-700"
                                      : "text-amber-700"
                                }`}
                              >
                                {p.quality_flag || "--"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {(p.policy_regime || "")
                                .replace("_", " ")
                                .replace("_", " ")}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Commodity Database */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Commodity Database (pulse_commodities)
          </CardTitle>
          <CardDescription>
            All tracked commodities with perishability, volatility, storage
            parameters, and cold chain requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commodity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Perishability</TableHead>
                <TableHead>Volatility</TableHead>
                <TableHead className="text-right">Shelf Life</TableHead>
                <TableHead className="text-right">Daily Loss</TableHead>
                <TableHead>Cold Chain</TableHead>
                <TableHead className="text-center">MSP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commodities.map((c) => (
                <TableRow
                  key={c.id}
                  className={
                    selectedCommodity === c.id
                      ? "bg-emerald-50"
                      : "cursor-pointer hover:bg-slate-50"
                  }
                  onClick={() => setSelectedCommodity(c.id)}
                >
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-xs capitalize">
                    {(c.commodity_type || "").replace("_", " ")}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Progress
                        value={(c.perishability_index ?? 0) * 10}
                        className="h-2 w-16"
                      />
                      <span className="text-xs font-bold">
                        {c.perishability_index ?? "?"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${
                        c.volatility_class === "ultra_high" || c.volatility_class === "high"
                          ? "text-red-700 border-red-200 bg-red-50"
                          : c.volatility_class === "moderate"
                            ? "text-amber-700 border-amber-200 bg-amber-50"
                            : "text-emerald-700 border-emerald-200 bg-emerald-50"
                      }`}
                    >
                      {(c.volatility_class || "").replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.shelf_life_days ?? "--"} days
                  </TableCell>
                  <TableCell className="text-right">
                    {c.storage_factor
                      ? `${(Number(c.storage_factor) * 100).toFixed(2)}%`
                      : "--"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        c.cold_chain_dependency === "mandatory"
                          ? "text-blue-700 border-blue-200 bg-blue-50"
                          : c.cold_chain_dependency === "recommended"
                            ? "text-amber-700 border-amber-200"
                            : ""
                      }`}
                    >
                      {c.cold_chain_dependency || "none"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {c.msp_applicable ? (
                      <Shield className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
