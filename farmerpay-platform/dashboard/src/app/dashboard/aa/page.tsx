"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, ShieldCheck, AlertTriangle } from "lucide-react";
import { getAdminStats, gradeBg, type AAAdminStats } from "@/lib/aa";
import { formatRupees } from "@/lib/api";
import AAAdoptionChart from "@/components/aa/AAAdoptionChart";
import HealthScoreDistribution from "@/components/aa/HealthScoreDistribution";

export default function AAOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AAAdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("fp_token");
    if (!token) { router.push("/login"); return; }

    async function load() {
      try {
        const data = await getAdminStats(token!);
        setStats(data);
      } catch (err) {
        if (err instanceof Error && err.message === "UNAUTHORIZED") {
          localStorage.removeItem("fp_token");
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">AA Financial Intelligence</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-16 bg-slate-100 rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-lg">No AA data available</p>
      </div>
    );
  }

  const { consents, analyses, gradeDistribution } = stats;
  const consentRate = consents.total_consents > 0
    ? ((consents.approved / consents.total_consents) * 100).toFixed(1)
    : "0";
  const highRiskCount = gradeDistribution
    .filter(g => g.health_grade === "D" || g.health_grade === "E")
    .reduce((s, g) => s + g.count, 0);

  // Mock branch data (would come from a branch-level API in production)
  const branchData = [
    { branch: "Main", consentRate: 72, total: 50 },
    { branch: "Rural-1", consentRate: 58, total: 35 },
    { branch: "Rural-2", consentRate: 45, total: 28 },
    { branch: "Urban", consentRate: 81, total: 42 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">AA Financial Intelligence</h1>
        <Badge variant="outline" className="text-xs">
          {analyses.farmers_analyzed || 0} farmers analyzed
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Farmers with AA"
          value={analyses.farmers_analyzed || 0}
          icon={<Users className="w-6 h-6 text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <KpiCard
          label="Avg Health Score"
          value={analyses.avg_score ? Math.round(analyses.avg_score) : "-"}
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          iconBg="bg-green-50"
          suffix="/100"
        />
        <KpiCard
          label="Consent Rate"
          value={`${consentRate}%`}
          icon={<ShieldCheck className="w-6 h-6 text-indigo-600" />}
          iconBg="bg-indigo-50"
        />
        <KpiCard
          label="High-Risk Farmers"
          value={highRiskCount}
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
          iconBg="bg-red-50"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700">Health Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthScoreDistribution gradeDistribution={gradeDistribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700">AA Adoption by Branch</CardTitle>
          </CardHeader>
          <CardContent>
            <AAAdoptionChart data={branchData} />
          </CardContent>
        </Card>
      </div>

      {/* Consent Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700">Consent Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "Approved", value: consents.approved, color: "text-green-600" },
              { label: "Pending", value: consents.pending, color: "text-amber-600" },
              { label: "Rejected", value: consents.rejected, color: "text-red-600" },
              { label: "Revoked", value: consents.revoked, color: "text-slate-600" },
              { label: "Expired", value: consents.expired, color: "text-orange-600" },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-lg bg-slate-50">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value || 0}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grade Distribution Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700">Grade Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {["A", "B", "C", "D", "E"].map(grade => {
              const entry = gradeDistribution.find(g => g.health_grade === grade);
              const count = entry?.count || 0;
              return (
                <div key={grade} className={`flex-1 text-center p-3 rounded-lg ${gradeBg(grade)}`}>
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-xs font-semibold mt-1">Grade {grade}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon, iconBg, suffix }: {
  label: string; value: string | number; icon: React.ReactNode; iconBg: string; suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-3xl font-bold text-slate-900">
              {value}{suffix ? <span className="text-sm font-normal text-slate-400">{suffix}</span> : null}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
