"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  HandHelping,
  AlertTriangle,
  Bell,
  TrendingUp,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { apiGet, formatRupeesCompact } from "@/lib/api";

/* ───── Mock data for demo mode ───── */

const MOCK_OV = {
  beneficiaries: { total: 87, counted: 62 },
  commission: { mtdPaise: 1435000, lifetimePaise: 12870000, currentPeriod: "2026-04" },
  incentive: {
    thresholdTarget: 100,
    currentQuarterCount: 62,
    currentQuarter: { start: "2026-01-01", end: "2026-03-31" },
    progressPercent: 62,
    latestPayout: null,
  },
  issues: { open: 5, critical: 2 },
  nudges: { sent: 234, convertedToAction: 89, conversionRate: 38 },
};

const MOCK_LOANS = { sanctioned: 42, disbursed: 38, repaid: 19 };
const MOCK_INSURANCE = { policiesBought: 31, pmfby: 22, livestock: 6, health: 3 };

const MONTHLY_TREND = [
  { month: "Nov", beneficiaries: 34, commissions: 16400 },
  { month: "Dec", beneficiaries: 42, commissions: 13000 },
  { month: "Jan", beneficiaries: 51, commissions: 19600 },
  { month: "Feb", beneficiaries: 62, commissions: 28400 },
  { month: "Mar", beneficiaries: 78, commissions: 37000 },
  { month: "Apr", beneficiaries: 87, commissions: 14350 },
];

const SERVICES_PIE = [
  { name: "Loan Assist", value: 42, color: "#059669" },
  { name: "Insurance", value: 31, color: "#2563eb" },
  { name: "Data Entry", value: 54, color: "#d97706" },
  { name: "Nudges", value: 234, color: "#7c3aed" },
];

/* ───── Component ───── */

interface Overview {
  beneficiaries: { total: number; counted: number };
  commission: { mtdPaise: number; lifetimePaise: number; currentPeriod: string };
  incentive: {
    thresholdTarget: number;
    currentQuarterCount: number;
    currentQuarter: { start: string; end: string };
    progressPercent: number;
    latestPayout: { amountPaise: number; periodStart: string; status: string } | null;
  };
  issues: { open: number; critical: number };
  nudges: { sent: number; convertedToAction: number; conversionRate: number };
}

export default function SathiOverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.has("demo");

  const [ov, setOv] = useState<Overview | null>(isDemo ? MOCK_OV : null);
  const [loans, setLoans] = useState(isDemo ? MOCK_LOANS : null);
  const [insurance, setInsurance] = useState(isDemo ? MOCK_INSURANCE : null);
  const [loading, setLoading] = useState(!isDemo);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) return;
    const token = localStorage.getItem("sathi_token");
    if (!token) { router.push("/login"); return; }

    async function load() {
      try {
        const [o, l, i] = await Promise.all([
          apiGet("/sathi/dashboard/overview", token!),
          apiGet("/sathi/dashboard/loans", token!),
          apiGet("/sathi/dashboard/insurance", token!),
        ]);
        setOv(o.data || o);
        setLoans(l.data || l);
        setInsurance(i.data || i);
      } catch (e: unknown) {
        if (e instanceof Error && e.message === "UNAUTHORIZED") {
          localStorage.removeItem("sathi_token");
          router.push("/login");
          return;
        }
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router, isDemo]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading Sathi dashboard...</div>;
  if (err) return (
    <div className="p-6"><Card><CardContent className="p-6 text-sm text-destructive">
      {err}. You must be logged in as a registered Sathi.
    </CardContent></Card></div>
  );
  if (!ov) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Hand-hold farmers, track commissions, flag issues to your banker.
          </p>
        </div>
        {isDemo && (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-300">Demo Mode</Badge>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Beneficiaries</p>
                <p className="text-2xl font-bold mt-1">{ov.beneficiaries.total}</p>
                <p className="text-xs text-muted-foreground">{ov.beneficiaries.counted} for incentive</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Commission (MTD)</p>
                <p className="text-2xl font-bold mt-1">{formatRupeesCompact(ov.commission.mtdPaise / 100)}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                  Lifetime {formatRupeesCompact(ov.commission.lifetimePaise / 100)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Loans</p>
                <p className="text-2xl font-bold mt-1">{loans?.sanctioned ?? 0}</p>
                <p className="text-xs text-muted-foreground">{loans?.disbursed ?? 0} disbursed, {loans?.repaid ?? 0} repaid</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Open Issues</p>
                <p className="text-2xl font-bold mt-1">{ov.issues.open}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {ov.issues.critical > 0 && <ArrowDownRight className="h-3 w-3 text-red-500" />}
                  {ov.issues.critical} critical
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Nudges</p>
                <p className="text-2xl font-bold mt-1">{ov.nudges.sent}</p>
                <p className="text-xs text-muted-foreground">{ov.nudges.conversionRate}% conversion</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Bell className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incentive Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HandHelping className="h-4 w-4" /> 100-Beneficiary Incentive (10% bonus)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{ov.incentive.currentQuarterCount} / {ov.incentive.thresholdTarget} beneficiaries</span>
            <span className="text-muted-foreground text-xs">
              Q1 2026: {ov.incentive.currentQuarter.start} to {ov.incentive.currentQuarter.end}
            </span>
          </div>
          <Progress value={ov.incentive.progressPercent} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {100 - ov.incentive.currentQuarterCount} more to unlock the 10% bonus on all commissions this quarter.
          </p>
        </CardContent>
      </Card>

      {/* Products Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" /> Loans Facilitated</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Sanctioned</span><span className="font-semibold">{loans?.sanctioned ?? 0}</span></div>
            <div className="flex justify-between"><span>Disbursed</span><span className="font-semibold">{loans?.disbursed ?? 0}</span></div>
            <div className="flex justify-between"><span>Repaid via nudge</span><span className="font-semibold">{ov.nudges.convertedToAction}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Insurance</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total policies</span><span className="font-semibold">{insurance?.policiesBought ?? 0}</span></div>
            <div className="flex justify-between"><span>PMFBY</span><span className="font-semibold">{insurance?.pmfby ?? 0}</span></div>
            <div className="flex justify-between"><span>Livestock</span><span className="font-semibold">{insurance?.livestock ?? 0}</span></div>
            <div className="flex justify-between"><span>Health</span><span className="font-semibold">{insurance?.health ?? 0}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Growth Trend (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MONTHLY_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                  <Line yAxisId="left" type="monotone" dataKey="beneficiaries" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} name="Beneficiaries" />
                  <Line yAxisId="right" type="monotone" dataKey="commissions" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} name="Commission" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Services Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={SERVICES_PIE} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {SERVICES_PIE.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {SERVICES_PIE.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
