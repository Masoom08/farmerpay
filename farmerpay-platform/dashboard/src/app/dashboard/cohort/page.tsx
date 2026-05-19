"use client";

/**
 * Pilot Cohort — WS7.2 RCT monitoring for the May 2026 FarmerPay pilot.
 *
 * Ported from the vanilla HTML dashboard's cohort tab. Reads the same
 * /banker/cohort-report/aggregate endpoint that the admin reports page
 * uses so DICE analysts can monitor the test-vs-control NPA experiment
 * without leaving the banker dashboard.
 *
 * Shows:
 *   - Top-line delta: NPA Δ (test − control), one-sided p-value,
 *     significance verdict (α = 0.05, H₁: test < control)
 *   - Per-bank NPA delta cards
 *   - Test vs Control cohort cards (headcount, NPA%, CI, SMA counts)
 *   - Field linkage KPIs (test linkage rate vs pilot target)
 *   - Weekly NPA% trend line chart (recharts)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart3, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { apiGet } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────

interface CohortCI {
  lower: number;
  upper: number;
}

interface SmaCounts {
  standard?: number;
  sma_0?: number;
  sma_1?: number;
  sma_2?: number;
  npa?: number;
}

interface CohortStats {
  headcount: number;
  npaPct: number;
  npaCi: CohortCI;
  smaCounts: SmaCounts;
  avgDaysPastDue: number;
}

interface CohortComparison {
  diff: number;
  pValueOneSided: number;
  computable: boolean;
}

interface LinkageStats {
  linked: number;
  total: number;
  linkageRate: number;
  contaminationWarning?: boolean;
}

interface PerBank {
  bankName: string;
  cohorts: { test: CohortStats; control: CohortStats };
}

interface TrendPoint {
  weekStart: string;
  testNpaPct: number;
  controlNpaPct: number;
}

interface CohortReport {
  cohorts?: {
    test?: CohortStats;
    control?: CohortStats;
    comparison?: CohortComparison;
  };
  linkage?: {
    test: LinkageStats;
    control: LinkageStats;
    pilotTarget: number;
  };
  perBank?: PerBank[];
  trend?: TrendPoint[];
}

const DEFAULT_COHORT: CohortStats = {
  headcount: 0,
  npaPct: 0,
  npaCi: { lower: 0, upper: 0 },
  smaCounts: {},
  avgDaysPastDue: 0,
};

// ─── Helpers ────────────────────────────────────────────────────────

const subDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const pct = (v: number) => (v * 100).toFixed(1) + "%";

// ─── Page ───────────────────────────────────────────────────────────

export default function CohortPage() {
  const router = useRouter();
  const [report, setReport] = useState<CohortReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(subDays(30));
  const [toDate, setToDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const token = localStorage.getItem("fp_token");
    if (!token) {
      router.push("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet(
        `/banker/cohort-report/aggregate?fromDate=${fromDate}&toDate=${toDate}`,
        token,
      );
      setReport((res.data || {}) as CohortReport);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        localStorage.removeItem("fp_token");
        router.push("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load cohort report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">📊 Pilot Cohort</h1>
        <Card>
          <CardContent className="p-6">
            <div className="skeleton h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">📊 Pilot Cohort</h1>
        <Card>
          <CardContent className="p-6 text-red-600 text-sm">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const t: CohortStats = report?.cohorts?.test || DEFAULT_COHORT;
  const ctl: CohortStats = report?.cohorts?.control || DEFAULT_COHORT;
  const cmp: CohortComparison = report?.cohorts?.comparison || {
    diff: 0,
    pValueOneSided: 1,
    computable: false,
  };
  const lnk = report?.linkage || {
    test: { linked: 0, total: 0, linkageRate: 0 },
    control: { linked: 0, total: 0, linkageRate: 0 },
    pilotTarget: 0.8,
  };
  const perBank: PerBank[] = report?.perBank || [];
  const trend: TrendPoint[] = report?.trend || [];

  const significant = cmp.computable && cmp.pValueOneSided < 0.05 && cmp.diff < 0;
  const deltaPp = ((t.npaPct - ctl.npaPct) * 100).toFixed(1);
  const deltaNegative = t.npaPct - ctl.npaPct < 0;

  const trendData = trend.map((w) => ({
    week: w.weekStart,
    "Test cohort NPA %": +(w.testNpaPct * 100).toFixed(1),
    "Control cohort NPA %": +(w.controlNpaPct * 100).toFixed(1),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-green-700" />
        Pilot Cohort — WS7.2
        <span className="text-sm font-normal text-slate-500">
          May 2026 pilot · test vs control RCT
        </span>
      </h1>

      {/* Date range selector */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <label className="text-xs font-bold text-slate-600 space-y-1">
            <span className="block">From</span>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-44"
            />
          </label>
          <label className="text-xs font-bold text-slate-600 space-y-1">
            <span className="block">To</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-44"
            />
          </label>
          <Button onClick={load} className="bg-indigo-800 hover:bg-indigo-900">
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Top-line significance card */}
      <Card
        className={
          significant
            ? "border-l-4 border-green-600 bg-green-50"
            : "border-l-4 border-slate-300"
        }
      >
        <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">
              NPA Δ (test − control)
            </div>
            <div
              className={`text-3xl font-black mt-1 ${
                deltaNegative ? "text-green-600" : "text-red-600"
              }`}
            >
              {deltaNegative ? "" : "+"}
              {deltaPp} pp
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">One-sided p-value</div>
            <div className="text-3xl font-black mt-1">
              {cmp.computable ? cmp.pValueOneSided.toFixed(4) : "—"}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              H₁: test NPA % &lt; control NPA %
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Significance</div>
            <div className="text-sm font-bold mt-2">
              {significant ? (
                <span className="text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Significant at α = 0.05
                </span>
              ) : cmp.computable && cmp.diff < 0 ? (
                <span className="text-slate-500">
                  Reduction observed but not significant — needs more n
                </span>
              ) : cmp.computable && cmp.diff > 0 ? (
                <span className="text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Test cohort is HIGHER than control
                </span>
              ) : (
                <span className="text-slate-500">Insufficient data</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-bank NPA delta */}
      {perBank.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-indigo-900 mb-3 uppercase tracking-wide">
            Per-bank NPA delta
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {perBank.map((b) => {
              const bt = b.cohorts.test;
              const bc = b.cohorts.control;
              const delta = (bt.npaPct - bc.npaPct) * 100;
              const neg = delta < 0;
              return (
                <Card
                  key={b.bankName}
                  className={
                    neg
                      ? "border-l-4 border-green-600"
                      : delta > 0
                        ? "border-l-4 border-red-600"
                        : "border-l-4 border-slate-300"
                  }
                >
                  <CardContent className="p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase">
                      {b.bankName}
                    </div>
                    <div
                      className={`text-2xl font-black mt-1 ${
                        neg ? "text-green-600" : delta > 0 ? "text-red-600" : "text-slate-700"
                      }`}
                    >
                      {delta >= 0 ? "+" : ""}
                      {delta.toFixed(1)} pp
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      test {pct(bt.npaPct)} vs ctrl {pct(bc.npaPct)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Pilot-wide test vs control */}
      <div>
        <h3 className="text-sm font-bold text-indigo-900 mb-3 uppercase tracking-wide">
          Pilot-wide test vs control
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-l-4 border-green-600">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="font-bold text-indigo-900">🟢 Test cohort</div>
                <Badge variant="secondary" className="text-xs">
                  {t.headcount} farmers
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">NPA %</div>
                  <div className="text-2xl font-black mt-1">{pct(t.npaPct)}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    95% CI [{pct(t.npaCi.lower)}, {pct(t.npaCi.upper)}]
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Avg DPD</div>
                  <div className="text-2xl font-black mt-1">
                    {(t.avgDaysPastDue || 0).toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">days past due</div>
                </div>
              </div>
              <table className="w-full mt-3 text-sm">
                <tbody>
                  <tr>
                    <td className="py-0.5">Standard</td>
                    <td className="py-0.5 text-right">{t.smaCounts.standard || 0}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">SMA-0</td>
                    <td className="py-0.5 text-right">{t.smaCounts.sma_0 || 0}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">SMA-1</td>
                    <td className="py-0.5 text-right">{t.smaCounts.sma_1 || 0}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">SMA-2</td>
                    <td className="py-0.5 text-right">{t.smaCounts.sma_2 || 0}</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-0.5">NPA</td>
                    <td className="py-0.5 text-right">{t.smaCounts.npa || 0}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-red-600">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="font-bold text-indigo-900">🔴 Control cohort</div>
                <Badge variant="secondary" className="text-xs">
                  {ctl.headcount} farmers
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">NPA %</div>
                  <div className="text-2xl font-black mt-1">{pct(ctl.npaPct)}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    95% CI [{pct(ctl.npaCi.lower)}, {pct(ctl.npaCi.upper)}]
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Avg DPD</div>
                  <div className="text-2xl font-black mt-1">
                    {(ctl.avgDaysPastDue || 0).toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">days past due</div>
                </div>
              </div>
              <table className="w-full mt-3 text-sm">
                <tbody>
                  <tr>
                    <td className="py-0.5">Standard</td>
                    <td className="py-0.5 text-right">{ctl.smaCounts.standard || 0}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">SMA-0</td>
                    <td className="py-0.5 text-right">{ctl.smaCounts.sma_0 || 0}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">SMA-1</td>
                    <td className="py-0.5 text-right">{ctl.smaCounts.sma_1 || 0}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">SMA-2</td>
                    <td className="py-0.5 text-right">{ctl.smaCounts.sma_2 || 0}</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-0.5">NPA</td>
                    <td className="py-0.5 text-right">{ctl.smaCounts.npa || 0}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Field linkage */}
      <div>
        <h3 className="text-sm font-bold text-indigo-900 mb-3 uppercase tracking-wide">
          Field linkage (app onboarding)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card
            className={
              lnk.test.linkageRate >= lnk.pilotTarget
                ? "border-l-4 border-green-600"
                : lnk.test.linkageRate >= 0.5
                  ? "border-l-4 border-amber-500"
                  : "border-l-4 border-red-600"
            }
          >
            <CardContent className="p-4">
              <div className="text-xs font-bold text-slate-500 uppercase">Test cohort linkage</div>
              <div className="text-2xl font-black mt-1">{pct(lnk.test.linkageRate)}</div>
              <div className="text-xs text-slate-500 mt-1">
                {lnk.test.linked} / {lnk.test.total} farmers linked · target {pct(lnk.pilotTarget)}
              </div>
            </CardContent>
          </Card>
          <Card
            className={
              lnk.control.contaminationWarning
                ? "border-l-4 border-red-600"
                : "border-l-4 border-green-600"
            }
          >
            <CardContent className="p-4">
              <div className="text-xs font-bold text-slate-500 uppercase">
                Control cohort linkage
              </div>
              <div className="text-2xl font-black mt-1">{pct(lnk.control.linkageRate)}</div>
              <div className="text-xs text-slate-500 mt-1">
                {lnk.control.contaminationWarning
                  ? "⚠ CONTAMINATION — control farmers onboarded"
                  : "✓ Clean"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs font-bold text-slate-500 uppercase">Report window</div>
              <div className="text-sm font-bold mt-2">
                {fromDate}
                <br />→ {toDate}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weekly trend chart */}
      <div>
        <h3 className="text-sm font-bold text-indigo-900 mb-3 uppercase tracking-wide flex items-center gap-2">
          {deltaNegative ? (
            <TrendingDown className="w-4 h-4 text-green-600" />
          ) : (
            <TrendingUp className="w-4 h-4 text-red-600" />
          )}
          Weekly NPA % trend
        </h3>
        <Card>
          <CardContent className="p-5">
            {trendData.length === 0 ? (
              <p className="text-sm text-slate-500">
                No weekly snapshots yet. Run the NPA recalculation cron (daily 02:13 local) to
                populate.
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="week" fontSize={11} stroke="#94a3b8" />
                    <YAxis
                      fontSize={11}
                      stroke="#94a3b8"
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Test cohort NPA %"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Control cohort NPA %"
                      stroke="#dc2626"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
