"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { apiPost, formatRupees } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────

interface HoldingCost {
  storage: number;
  handling: number;
  transport: number;
  interest: number;
  insurance: number;
  wastage: number;
  total: number;
}

interface LoanRepay {
  principal: number;
  interest: number;
  fee: number;
  total: number;
}

interface Scenario {
  name: string;
  days: number;
  salePrice: number;
  mandiFees: number;
  holdingCost: HoldingCost;
  netPerQtl: number;
  netTotal: number;
  preRepay: LoanRepay;
  wrRepay: LoanRepay;
  totalRepay: number;
  afterLoans: number;
}

interface Recommendation {
  bestOption: string;
  bestNetPerQtl: number;
  bestNetTotal: number;
  bestAfterLoans: number;
  isNegativeAfterLoans: boolean;
  breakevenPrice45d: number;
  holdingCost45dPerQtl: number;
  rationale: string;
}

interface AnalysisResult {
  inputs: {
    crop: string;
    quantityQuintals: number;
    openMarketPrice: number;
    mspPrice: number;
    warehouse: { type: string; name: string };
    priceForecasts: { d21: number; d45: number; d60: number };
  };
  wrLoanPrincipal: number;
  scenarios: Record<string, Scenario>;
  recommendation: Recommendation;
}

interface CashflowEvent {
  day: number;
  label: string;
  amount: number;
  type: "in" | "out" | "info";
  category: string;
}

interface CashflowResult {
  scenario: { key: string; name: string; days: number; salePrice: number };
  netAfterLoans: number;
  events: CashflowEvent[];
  cumulativeSeries: Array<{ day: number; position: number }>;
  summary: {
    totalInflows: number;
    totalOutflows: number;
    saleProceeds: number;
    storageCosts: number;
    preSowingRepay: number;
    wrRepay: number;
  };
}

// ─── Default Parameters ─────────────────────────────────────────────

const DEFAULT_PARAMS = {
  crop: "Paddy",
  quantityQuintals: 100,
  openMarketPrice: 2350,
  mspPrice: 2300,
  priceChange21d: 4,
  priceChange45d: 7,
  priceChange60d: 10,
  warehouseType: "wdra",
  annualInterestRate: 12,
  insuranceRate: 0.15,
  wastageRate: 0.25,
  mandiFeePercent: 2,
  usePreSowing: true,
  preSowingAmount: 80000,
  preSowingRate: 12,
  preSowingProcFee: 0,
  preSowingElapsedDays: 90,
  useWrLoan: true,
  wrLtvPercent: 70,
  wrRate: 10.5,
  wrProcFee: 0.5,
  wrValuationBasis: "open" as "open" | "msp" | "custom",
  wrCustomValuation: 0,
};

const WAREHOUSE_OPTIONS = [
  { value: "mandi", label: "Mandi Yard (nearby)" },
  { value: "wdra", label: "WDRA Warehouse" },
  { value: "silo", label: "Private Silo" },
];

const CROPS = ["Paddy", "Wheat", "Maize", "Gram", "Mustard"];

// ─── Component ──────────────────────────────────────────────────────

export default function PulseAdvisorPage() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [cashflow, setCashflow] = useState<CashflowResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [perQtl, setPerQtl] = useState(true);
  const [tlScenario, setTlScenario] = useState("d21");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("fp_token") || ""
      : "";

  const update = (key: string, value: number | string | boolean) => {
    setParams((p) => ({ ...p, [key]: value }));
  };

  async function calculate() {
    setLoading(true);
    try {
      const res = await apiPost("/pulse/sell-store-advisor", params, token);
      if (res.success) setResult(res.data);

      const tlRes = await apiPost(
        "/pulse/cashflow-timeline",
        { ...params, scenarioKey: tlScenario },
        token
      );
      if (tlRes.success) setCashflow(tlRes.data);
    } catch (e) {
      console.error("Analysis error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadTimeline(key: string) {
    setTlScenario(key);
    try {
      const tlRes = await apiPost(
        "/pulse/cashflow-timeline",
        { ...params, scenarioKey: key },
        token
      );
      if (tlRes.success) setCashflow(tlRes.data);
    } catch (e) {
      console.error(e);
    }
  }

  const scenarios = result
    ? Object.values(result.scenarios)
    : ([] as Scenario[]);
  const barData = scenarios.map((s) => ({
    name: s.name.replace("Store & sell ", "").replace("Sell ", ""),
    value: perQtl ? s.netPerQtl : s.netTotal,
    afterLoans: s.afterLoans,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            PULSE Sell-Store Advisor
          </h1>
          <p className="text-muted-foreground text-sm">
            Compare selling options with dual loan tracking (pre-sowing + WR
            pledge)
          </p>
        </div>
        <button
          onClick={calculate}
          disabled={loading}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
        >
          {loading ? "Calculating..." : "Calculate"}
        </button>
      </div>

      {/* Input Forms */}
      <Tabs defaultValue="basics">
        <TabsList>
          <TabsTrigger value="basics">Basics & Prices</TabsTrigger>
          <TabsTrigger value="storage">Storage Costs</TabsTrigger>
          <TabsTrigger value="presowing">Pre-sowing Loan</TabsTrigger>
          <TabsTrigger value="wrloan">WR Pledge Loan</TabsTrigger>
        </TabsList>

        {/* Step 1: Basics */}
        <TabsContent value="basics">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Step 1 - Basics & Prices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Crop</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    value={params.crop}
                    onChange={(e) => update("crop", e.target.value)}
                  >
                    {CROPS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <InputField
                  label="Quantity (qtl)"
                  value={params.quantityQuintals}
                  onChange={(v) => update("quantityQuintals", v)}
                />
                <InputField
                  label="Open Market Price (Rs/qtl)"
                  value={params.openMarketPrice}
                  onChange={(v) => update("openMarketPrice", v)}
                />
                <InputField
                  label="MSP (Rs/qtl)"
                  value={params.mspPrice}
                  onChange={(v) => update("mspPrice", v)}
                />
              </div>
              <div className="mt-4">
                <label className="text-sm text-muted-foreground font-medium">
                  Expected price change vs today
                </label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <SliderField
                    label="21 days"
                    value={params.priceChange21d}
                    min={-10}
                    max={20}
                    onChange={(v) => update("priceChange21d", v)}
                  />
                  <SliderField
                    label="45 days"
                    value={params.priceChange45d}
                    min={-10}
                    max={25}
                    onChange={(v) => update("priceChange45d", v)}
                  />
                  <SliderField
                    label="60 days"
                    value={params.priceChange60d}
                    min={-10}
                    max={30}
                    onChange={(v) => update("priceChange60d", v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Storage */}
        <TabsContent value="storage">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Step 2 - Storage Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Warehouse
                  </label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    value={params.warehouseType}
                    onChange={(e) => update("warehouseType", e.target.value)}
                  >
                    {WAREHOUSE_OPTIONS.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>
                <InputField
                  label="Annual Interest (%)"
                  value={params.annualInterestRate}
                  onChange={(v) => update("annualInterestRate", v)}
                  step={0.1}
                />
                <InputField
                  label="Insurance (%)"
                  value={params.insuranceRate}
                  onChange={(v) => update("insuranceRate", v)}
                  step={0.01}
                />
                <InputField
                  label="Wastage/Shrink (%)"
                  value={params.wastageRate}
                  onChange={(v) => update("wastageRate", v)}
                  step={0.01}
                />
                <InputField
                  label="Mandi Fees (%)"
                  value={params.mandiFeePercent}
                  onChange={(v) => update("mandiFeePercent", v)}
                  step={0.1}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 3: Pre-sowing Loan */}
        <TabsContent value="presowing">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Step 3 - Pre-sowing KCC Loan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={params.usePreSowing}
                  onChange={(e) => update("usePreSowing", e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">
                  Include pre-sowing loan in analysis
                </span>
              </div>
              {params.usePreSowing && (
                <div className="grid grid-cols-4 gap-4">
                  <InputField
                    label="Loan Amount (Rs)"
                    value={params.preSowingAmount}
                    onChange={(v) => update("preSowingAmount", v)}
                    step={1000}
                  />
                  <InputField
                    label="Rate p.a. (%)"
                    value={params.preSowingRate}
                    onChange={(v) => update("preSowingRate", v)}
                    step={0.1}
                  />
                  <InputField
                    label="Processing Fee (%)"
                    value={params.preSowingProcFee}
                    onChange={(v) => update("preSowingProcFee", v)}
                    step={0.1}
                  />
                  <InputField
                    label="Days Elapsed"
                    value={params.preSowingElapsedDays}
                    onChange={(v) => update("preSowingElapsedDays", v)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 4: WR Loan */}
        <TabsContent value="wrloan">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Step 4 - WR Pledge Loan
              </CardTitle>
              <CardDescription>
                Warehouse Receipt loan against stored produce
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={params.useWrLoan}
                  onChange={(e) => update("useWrLoan", e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">
                  Include WR pledge loan in analysis
                </span>
              </div>
              {params.useWrLoan && (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    <InputField
                      label="LTV (%)"
                      value={params.wrLtvPercent}
                      onChange={(v) => update("wrLtvPercent", v)}
                    />
                    <InputField
                      label="Loan Rate p.a. (%)"
                      value={params.wrRate}
                      onChange={(v) => update("wrRate", v)}
                      step={0.1}
                    />
                    <InputField
                      label="Processing Fee (%)"
                      value={params.wrProcFee}
                      onChange={(v) => update("wrProcFee", v)}
                      step={0.1}
                    />
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Valuation Basis
                      </label>
                      <select
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        value={params.wrValuationBasis}
                        onChange={(e) =>
                          update("wrValuationBasis", e.target.value)
                        }
                      >
                        <option value="open">Open Market</option>
                        <option value="msp">MSP</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </div>
                  {result && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border">
                      <div className="text-xs text-muted-foreground uppercase">
                        Estimated WR Loan Principal
                      </div>
                      <div className="text-2xl font-extrabold">
                        {formatRupees(result.wrLoanPrincipal)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        LTV x valuation price x quantity
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results */}
      {result && (
        <>
          {/* Recommendation */}
          <Card
            className={
              result.recommendation.isNegativeAfterLoans
                ? "border-red-300 bg-red-50"
                : "border-emerald-300 bg-emerald-50"
            }
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Recommendation
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={perQtl}
                    onChange={(e) => setPerQtl(e.target.checked)}
                  />
                  Show per quintal (uncheck for total)
                </label>
              </div>
              <div className="text-xl font-extrabold">
                {result.recommendation.bestOption} -{" "}
                {formatRupees(result.recommendation.bestNetPerQtl)}/qtl (
                {formatRupees(result.recommendation.bestNetTotal)} total)
              </div>
              <p className="text-sm mt-1">{result.recommendation.rationale}</p>
              <p className="text-sm mt-1 font-medium">
                Breakeven price (45d):{" "}
                {formatRupees(result.recommendation.breakevenPrice45d)}/qtl |
                Holding cost (45d):{" "}
                {formatRupees(result.recommendation.holdingCost45dPerQtl)}/qtl
              </p>
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scenario Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Option</TableHead>
                    <TableHead className="text-right">Net/qtl</TableHead>
                    <TableHead className="text-right">Net Total</TableHead>
                    <TableHead className="text-right">
                      Pre-sowing Repay
                    </TableHead>
                    <TableHead className="text-right">WR Repay</TableHead>
                    <TableHead className="text-right">Total Repay</TableHead>
                    <TableHead className="text-right">After Loans</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scenarios.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatRupees(s.netPerQtl)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRupees(s.netTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRupees(s.preRepay.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRupees(s.wrRepay.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRupees(s.totalRepay)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${s.afterLoans >= 0 ? "text-emerald-700" : "text-red-600"}`}
                      >
                        {formatRupees(s.afterLoans)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Bar Chart */}
              <div className="h-64 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 } as object} />
                    <YAxis
                      tickFormatter={(v) => `Rs${Math.round(Number(v) / 1000)}K`}
                      tick={{ fontSize: 11 } as object}
                    />
                    <Tooltip
                      formatter={(v) => [formatRupees(Number(v)), perQtl ? "Net/qtl" : "Net Total"]}
                    />
                    <Bar
                      dataKey="value"
                      fill="#059669"
                      name={perQtl ? "Net per qtl" : "Net Total"}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cashflow Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Cashflow Timeline
                  </CardTitle>
                  <CardDescription>
                    Inflows/outflows from loans & storage to sale & repayment
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={tlScenario}
                    onChange={(e) => loadTimeline(e.target.value)}
                  >
                    <option value="now">Sell now (Open)</option>
                    <option value="msp">Sell at MSP</option>
                    <option value="d21">Store & sell 21d</option>
                    <option value="d45">Store & sell 45d</option>
                    <option value="d60">Store & sell 60d</option>
                  </select>
                  {cashflow && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        Net after loans
                      </div>
                      <div
                        className={`text-lg font-extrabold ${cashflow.netAfterLoans >= 0 ? "text-emerald-700" : "text-red-600"}`}
                      >
                        {formatRupees(cashflow.netAfterLoans)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {cashflow && (
                <>
                  {/* Cumulative Position Chart */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cashflow.cumulativeSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="day"
                          tickFormatter={(v) => `Day ${v}`}
                          tick={{ fontSize: 11 } as object}
                        />
                        <YAxis
                          tickFormatter={(v: number) =>
                            `Rs${Math.round(v / 1000)}K`
                          }
                          tick={{ fontSize: 11 } as object}
                        />
                        <Tooltip
                          formatter={(v) => [
                            formatRupees(Number(v)),
                            "Cash Position",
                          ]}
                          labelFormatter={(v) => `Day ${v}`}
                        />
                        <ReferenceLine y={0} stroke="#94a3b8" />
                        <Line
                          type="stepAfter"
                          dataKey="position"
                          stroke="#059669"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Events Table */}
                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead className="text-right">
                          Amount (Rs)
                        </TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashflow.events.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell>Day {e.day}</TableCell>
                          <TableCell>{e.label}</TableCell>
                          <TableCell
                            className={`text-right font-semibold ${e.amount >= 0 ? "text-emerald-700" : "text-red-600"}`}
                          >
                            {formatRupees(e.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                e.type === "in"
                                  ? "default"
                                  : e.type === "out"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {e.type === "in"
                                ? "Inflow"
                                : e.type === "out"
                                  ? "Outflow"
                                  : "Past (info)"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <SummaryCard
                      label="Sale Proceeds"
                      value={cashflow.summary.saleProceeds}
                      positive
                    />
                    <SummaryCard
                      label="Storage Costs"
                      value={cashflow.summary.storageCosts}
                    />
                    <SummaryCard
                      label="Total Loan Repayment"
                      value={
                        cashflow.summary.preSowingRepay +
                        cashflow.summary.wrRepay
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Initial State */}
      {!result && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-4">{"🌾"}</div>
            <h3 className="text-lg font-semibold">
              PULSE Sell vs Store Advisor
            </h3>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
              Enter crop details, prices, storage costs, and loan parameters
              above, then click Calculate to compare 5 selling scenarios with
              dual loan impact analysis.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Reusable Components ────────────────────────────────────────────

function InputField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="text-sm text-muted-foreground">{label}</label>
      <input
        type="number"
        className="w-full border rounded-lg px-3 py-2 mt-1"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <input
        type="range"
        className="w-full mt-1"
        min={min}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: number;
  positive?: boolean;
}) {
  return (
    <div className="p-4 bg-slate-50 rounded-xl border">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div
        className={`text-lg font-extrabold ${positive ? "text-emerald-700" : "text-slate-800"}`}
      >
        {formatRupees(value)}
      </div>
    </div>
  );
}
