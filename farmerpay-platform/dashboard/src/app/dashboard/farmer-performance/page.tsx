"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CheckCircle, AlertTriangle, XCircle, Search, ArrowUpDown } from "lucide-react";
import { apiGet, formatRupees } from "@/lib/api";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; desc: string }> = {
  on_track: { label: "On Track", color: "text-green-700", bg: "bg-green-50", icon: CheckCircle, desc: "Following PoP, costs within SoF norms" },
  at_risk: { label: "At Risk", color: "text-amber-700", bg: "bg-amber-50", icon: AlertTriangle, desc: "Deviations detected, needs attention" },
  off_track: { label: "Off Track", color: "text-red-700", bg: "bg-red-50", icon: XCircle, desc: "Significant deviations, intervention required" },
};

export default function FarmerPerformancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [page, filterStatus]);

  async function loadData() {
    try {
      setLoading(true);
      const token = localStorage.getItem("fp_token") || "";
      const [ovRes, farmRes] = await Promise.all([
        apiGet("/banker/portfolio/overview", token),
        apiGet(`/banker/portfolio/farmers?page=${page}&limit=15${filterStatus ? "&complianceStatus=" + filterStatus : ""}${search ? "&search=" + encodeURIComponent(search) : ""}`, token),
      ]);
      setOverview(ovRes.data || {});
      setFarmers(farmRes.data || []);
      setMeta(farmRes.meta || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function doSearch() {
    setPage(1);
    loadData();
  }

  const cd = overview?.complianceDistribution || {};
  const total = (cd.onTrack || 0) + (cd.atRisk || 0) + (cd.offTrack || 0);
  const pieData = [
    { name: "On Track", value: cd.onTrack || 0, color: "#16a34a" },
    { name: "At Risk", value: cd.atRisk || 0, color: "#d97706" },
    { name: "Off Track", value: cd.offTrack || 0, color: "#dc2626" },
  ].filter(d => d.value > 0);

  if (pieData.length === 0) pieData.push({ name: "No Data", value: 1, color: "#e2e8f0" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Farmer Performance Monitor</h1>
        <p className="text-sm text-slate-500 mt-1">PoP Compliance + Cost Tracking + Behavioural Classification</p>
      </div>

      {/* Classification Summary */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = key === "on_track" ? cd.onTrack || 0 : key === "at_risk" ? cd.atRisk || 0 : cd.offTrack || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const Icon = cfg.icon;
          return (
            <Card key={key} className={`cursor-pointer transition-all hover:shadow-md ${filterStatus === key ? "ring-2 ring-blue-500" : ""}`} onClick={() => { setFilterStatus(filterStatus === key ? "" : key); setPage(1); }}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                  <span className="text-xs font-bold uppercase text-slate-500">{cfg.label}</span>
                </div>
                <p className={`text-4xl font-extrabold ${cfg.color}`}>{count}</p>
                <p className="text-xs text-slate-400 mt-1">{pct}% of portfolio</p>
                <Progress value={pct} className="mt-2 h-2" />
                <p className="text-xs text-slate-400 mt-2">{cfg.desc}</p>
              </CardContent>
            </Card>
          );
        })}
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-bold uppercase text-slate-500 mb-2">Distribution</p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-xs text-center text-slate-400 mt-1">Avg Score: <span className="font-bold text-slate-700">{overview?.avgComplianceScore || 0}/100</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search farmer name..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} className="pl-9" />
        </div>
        {filterStatus && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => { setFilterStatus(""); setPage(1); }}>
            Filtering: {STATUS_CONFIG[filterStatus]?.label} ✕
          </Badge>
        )}
        <span className="text-xs text-slate-400 ml-auto">{meta.total || 0} farmers</span>
      </div>

      {/* Farmer Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farmer</TableHead>
                <TableHead>Compliance Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Income</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Trust Score</TableHead>
                <TableHead>Cost Deviation</TableHead>
                <TableHead>Loan Outstanding</TableHead>
                <TableHead>Insurance</TableHead>
                <TableHead>Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              ) : farmers.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-slate-400">No farmers found</TableCell></TableRow>
              ) : farmers.map((f: any) => {
                const stCfg = STATUS_CONFIG[f.complianceStatus] || STATUS_CONFIG.on_track;
                return (
                  <TableRow key={f.farmerId} className="cursor-pointer hover:bg-blue-50" onClick={() => router.push(`/dashboard/farmer/${f.farmerId}`)}>
                    <TableCell className="font-semibold text-slate-900">{f.farmerName || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${stCfg.color}`}>{f.complianceScore ?? "—"}</span>
                        {f.complianceScore != null && <Progress value={f.complianceScore} className="w-16 h-2" />}
                      </div>
                    </TableCell>
                    <TableCell><Badge className={`${stCfg.bg} ${stCfg.color} border-0`}>{stCfg.label}</Badge></TableCell>
                    <TableCell>
                      {f.incomePersona ? (
                        <Badge className={`border-0 text-xs font-bold ${
                          f.incomePersona === "quad" ? "bg-amber-100 text-amber-700" :
                          f.incomePersona === "triple" ? "bg-purple-100 text-purple-700" :
                          f.incomePersona === "double" ? "bg-blue-100 text-blue-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {f.incomePersona === "quad" ? "\u2B50 Quad" :
                           f.incomePersona === "triple" ? "\uD83D\uDFE3 Triple" :
                           f.incomePersona === "double" ? "\uD83D\uDD35 Double" :
                           "\uD83D\uDFE2 Single"}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {f.familySize != null ? (
                        <span className="text-sm font-medium text-slate-700">{f.earningMembers ?? "—"}/{f.familySize}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{f.trustScore ?? "—"}</TableCell>
                    <TableCell className={`font-semibold ${(f.costDeviation || 0) > 25 ? "text-red-600" : (f.costDeviation || 0) > 10 ? "text-amber-600" : "text-green-600"}`}>
                      {f.costDeviation != null ? `${f.costDeviation > 0 ? "+" : ""}${f.costDeviation}%` : "—"}
                    </TableCell>
                    <TableCell className="font-medium">{formatRupees(f.loanAmount)}</TableCell>
                    <TableCell>
                      {f.insurance?.hasInsurance ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">{f.insurance.policies} policy</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={f.riskLevel === "critical" ? "destructive" : f.riskLevel === "high" ? "destructive" : "secondary"} className="uppercase text-xs font-bold">
                        {f.riskLevel || "—"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {(meta.totalPages || 1) > 1 && (
        <div className="flex justify-center gap-3 items-center">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 rounded-md border text-sm disabled:opacity-30">Previous</button>
          <span className="text-sm text-slate-500">Page {page} of {meta.totalPages || 1}</span>
          <button onClick={() => setPage(p => Math.min(meta.totalPages || 1, p + 1))} disabled={page >= (meta.totalPages || 1)} className="px-4 py-2 rounded-md border text-sm disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
}
