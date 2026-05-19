"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
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

interface PortfolioOverview {
  totalFarmers?: number;
  onTrack?: number;
  atRisk?: number;
  offTrack?: number;
  avgComplianceScore?: number;
  totalLoanOutstanding?: number;
  earlyWarnings?: number;
}

interface TrendPoint {
  date: string;
  score: number;
}

const PIE_COLORS = ["#16a34a", "#d97706", "#dc2626"];

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="skeleton h-4 w-24 mb-3" />
        <div className="skeleton h-8 w-16" />
      </CardContent>
    </Card>
  );
}

const DEMO_OVERVIEW: PortfolioOverview = {
  totalFarmers: 312,
  onTrack: 218,
  atRisk: 64,
  offTrack: 30,
  avgComplianceScore: 72.4,
  totalLoanOutstanding: 48500000,
  earlyWarnings: 8,
};

const DEMO_TRENDS: TrendPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(2026, 2, 12 + i).toISOString().slice(0, 10),
  score: 65 + Math.round(Math.sin(i / 5) * 8 + i * 0.3),
}));

export default function DashboardOverviewPage() {
  const router = useRouter();
  const isDemo = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");
  const [overview, setOverview] = useState<PortfolioOverview | null>(isDemo ? DEMO_OVERVIEW : null);
  const [trends, setTrends] = useState<TrendPoint[]>(isDemo ? DEMO_TRENDS : []);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo) return;

    const token = localStorage.getItem("fp_token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        const [ov, tr] = await Promise.all([
          apiGet("/banker/portfolio/overview", token!),
          apiGet("/banker/portfolio/trends?period=30d", token!),
        ]);
        setOverview(ov.data || ov);
        setTrends(
          (tr.data || tr.trends || []).map(
            (t: { date: string; score?: number; complianceScore?: number }) => ({
              date: t.date,
              score: t.score ?? t.complianceScore ?? 0,
            })
          )
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "UNAUTHORIZED") {
          localStorage.removeItem("fp_token");
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router, isDemo]);

  const pieData = overview
    ? [
        { name: "On Track", value: overview.onTrack || 0 },
        { name: "At Risk", value: overview.atRisk || 0 },
        { name: "Off Track", value: overview.offTrack || 0 },
      ]
    : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Portfolio Overview
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Portfolio Overview</h1>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Farmers
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {overview?.totalFarmers ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">On Track</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {overview?.onTrack ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">At Risk</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">
                  {overview?.atRisk ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Off Track</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {overview?.offTrack ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 mb-2">
              Avg Compliance Score
            </p>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-bold text-slate-900">
                {overview?.avgComplianceScore?.toFixed(1) ?? "0"}
              </span>
              <span className="text-sm text-slate-400 mb-1">/ 100</span>
            </div>
            <Progress
              value={overview?.avgComplianceScore ?? 0}
              className="h-2"
            />
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 mb-2">
              Total Loan Outstanding
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {formatRupeesCompact(overview?.totalLoanOutstanding)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Across all farmers</p>
          </CardContent>
        </Card>

        <Card
          className={`card-hover ${
            (overview?.earlyWarnings ?? 0) > 0 ? "border-red-200" : ""
          }`}
        >
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 mb-2">
              Early Warnings
            </p>
            <p
              className={`text-3xl font-bold ${
                (overview?.earlyWarnings ?? 0) > 0
                  ? "text-red-600"
                  : "text-slate-900"
              }`}
            >
              {overview?.earlyWarnings ?? 0}
            </p>
            <p className="text-xs text-slate-400 mt-1">Active alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Compliance Trend (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })
                      }
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                      name="Compliance Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  No trend data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Farmer Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {pieData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  No distribution data available
                </div>
              )}
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {pieData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[idx] }}
                  />
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
