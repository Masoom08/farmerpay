"use client";

/**
 * ROOTS Compliance Dashboard — Portfolio view of Variance Engine data.
 *
 * Sections:
 *   1. KPI cards (Total Farmers, Avg Score, Low Compliance, Red Flags, SHC %)
 *   2. Compliance Distribution bar chart
 *   3. Crop-wise Compliance + Compliance vs Repayment (2-col)
 *   4. Branch Comparison table
 *   5. Red Flags table with acknowledge buttons
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiGet, apiPost, formatRupees } from "@/lib/api";

/* ─── Types ─── */

interface Summary {
  totalFarmers: number;
  highCompliance: number;
  moderateCompliance: number;
  lowCompliance: number;
  insufficientData: number;
  avgScore: number | null;
  soilHealthCardPct: number;
}

interface CropBreakdown {
  crop: string;
  farmerCount: number;
  avgScore: number | null;
}

interface RedFlag {
  flagId: string;
  flagDbId: number;
  farmerId: number;
  farmerName: string;
  activityType: string;
  flagType: string;
  severity: string;
  status: string;
  description: string;
  createdAt: string;
}

interface Correlation {
  [key: string]: number | null;
}

interface BranchRow {
  branch: string;
  farmerCount: number;
  avgScore: number | null;
  redFlagCount: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW: "bg-blue-100 text-blue-800 border-blue-200",
};

const BAND_COLORS = { high: "#16a34a", moderate: "#ea580c", low: "#dc2626", noData: "#94a3b8" };

/* ─── Component ─── */

export default function RootsCompliancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cropBreakdown, setCropBreakdown] = useState<CropBreakdown[]>([]);
  const [flags, setFlags] = useState<RedFlag[]>([]);
  const [flagSummary, setFlagSummary] = useState({ critical: 0, high: 0, medium: 0, low: 0 });
  const [correlation, setCorrelation] = useState<Correlation>({});
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [seasonFilter, setSeasonFilter] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("fp_token");
    if (!token) { router.push("/login"); return; }

    (async () => {
      try {
        const qs = seasonFilter !== "all" ? `?season=${seasonFilter}` : "";
        const [compRes, flagsRes, corrRes, branchRes] = await Promise.all([
          apiGet(`/banker/portfolio/roots-compliance${qs}`, token),
          apiGet("/banker/portfolio/roots-red-flags?limit=50", token),
          apiGet("/banker/portfolio/roots-vs-repayment", token),
          apiGet("/banker/portfolio/branch-compliance", token),
        ]);

        if (compRes?.data) {
          setSummary(compRes.data.summary);
          setCropBreakdown(compRes.data.cropBreakdown || []);
        }
        if (flagsRes?.data) setFlags(flagsRes.data);
        if (flagsRes?.summary) setFlagSummary(flagsRes.summary);
        if (corrRes?.data) setCorrelation(corrRes.data.correlation || {});
        if (branchRes?.data) setBranches(branchRes.data.branches || []);
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "UNAUTHORIZED") {
          localStorage.removeItem("fp_token");
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router, seasonFilter]);

  const handleAcknowledge = async (flagId: string) => {
    const token = localStorage.getItem("fp_token");
    if (!token) return;
    try {
      await apiPost(`/banker/portfolio/roots-red-flags/${flagId}/acknowledge`, {}, token);
      setFlags((prev) => prev.map((f) => f.flagId === flagId ? { ...f, status: "ACKNOWLEDGED" } : f));
    } catch {}
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">ROOTS Compliance</h1>
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-12 bg-slate-200 rounded animate-pulse" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-48 bg-slate-200 rounded animate-pulse" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) return <div className="p-8 text-center text-slate-500">No compliance data available</div>;

  // Chart data
  const distributionData = [
    { name: "High (80+)", value: summary.highCompliance, fill: BAND_COLORS.high },
    { name: "Moderate (60-80)", value: summary.moderateCompliance, fill: BAND_COLORS.moderate },
    { name: "Low (<60)", value: summary.lowCompliance, fill: BAND_COLORS.low },
    { name: "Insufficient Data", value: summary.insufficientData, fill: BAND_COLORS.noData },
  ];

  const repaymentData = [
    { band: "High Compliance", rate: correlation.high_repayment_rate ?? 0, total: correlation.high_total ?? 0 },
    { band: "Moderate", rate: correlation.moderate_repayment_rate ?? 0, total: correlation.moderate_total ?? 0 },
    { band: "Low", rate: correlation.low_repayment_rate ?? 0, total: correlation.low_total ?? 0 },
    { band: "No Data", rate: correlation.no_data_repayment_rate ?? 0, total: correlation.no_data_total ?? 0 },
  ];

  const totalOpenFlags = flagSummary.critical + flagSummary.high + flagSummary.medium + flagSummary.low;

  return (
    <div className="space-y-6">
      {/* Header + Filter */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ROOTS Compliance</h1>
        <Select value={seasonFilter} onValueChange={(value) => setSeasonFilter(value ?? "")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All seasons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            <SelectItem value="kharif_2026">Kharif 2026</SelectItem>
            <SelectItem value="rabi_2025">Rabi 2025</SelectItem>
            <SelectItem value="kharif_2025">Kharif 2025</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{summary.totalFarmers}</p>
            <p className="text-xs text-slate-500 mt-1">Total Farmers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className={`text-3xl font-bold ${summary.avgScore && summary.avgScore >= 70 ? "text-green-600" : summary.avgScore && summary.avgScore >= 50 ? "text-orange-600" : "text-red-600"}`}>
              {summary.avgScore ?? "—"}
            </p>
            <p className="text-xs text-slate-500 mt-1">Avg Compliance Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{summary.lowCompliance}</p>
            <p className="text-xs text-slate-500 mt-1">Low Compliance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className={`text-3xl font-bold ${totalOpenFlags > 0 ? "text-red-600" : "text-slate-400"}`}>{totalOpenFlags}</p>
            <p className="text-xs text-slate-500 mt-1">Open Red Flags</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{summary.soilHealthCardPct}%</p>
            <p className="text-xs text-slate-500 mt-1">Soil Health Card</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Compliance Distribution */}
      <Card>
        <CardHeader><CardTitle>Compliance Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${Number(v) || 0} farmers`, "Count"]} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {distributionData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Crop Breakdown + Repayment Correlation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Crop-wise Compliance */}
        <Card>
          <CardHeader><CardTitle>Crop-wise Compliance</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cropBreakdown.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="crop" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${Number(v) || 0}/100`, "Avg Score"]} />
                  <Bar dataKey="avgScore" radius={[0, 4, 4, 0]}>
                    {cropBreakdown.slice(0, 10).map((c, i) => (
                      <Cell key={i} fill={c.avgScore && c.avgScore >= 80 ? BAND_COLORS.high : c.avgScore && c.avgScore >= 60 ? BAND_COLORS.moderate : BAND_COLORS.low} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Compliance vs Repayment */}
        <Card>
          <CardHeader><CardTitle>Compliance vs On-Time Repayment</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={repaymentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="band" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => [`${Number(v) || 0}%`, "On-Time Rate"]} />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                    {repaymentData.map((_, i) => (
                      <Cell key={i} fill={["#16a34a", "#ea580c", "#dc2626", "#94a3b8"][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Branch Comparison */}
      <Card>
        <CardHeader><CardTitle>Branch Compliance</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch / District</TableHead>
                <TableHead className="text-center">Farmers</TableHead>
                <TableHead className="text-center">Avg Score</TableHead>
                <TableHead className="text-center">Red Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((b) => (
                <TableRow key={b.branch}>
                  <TableCell className="font-medium">{b.branch}</TableCell>
                  <TableCell className="text-center">{b.farmerCount}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={
                      b.avgScore && b.avgScore >= 80 ? "bg-green-50 text-green-700" :
                      b.avgScore && b.avgScore >= 60 ? "bg-orange-50 text-orange-700" :
                      "bg-red-50 text-red-700"
                    }>
                      {b.avgScore ?? "—"}/100
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {b.redFlagCount > 0 ? (
                      <Badge variant="outline" className="bg-red-50 text-red-700">{b.redFlagCount}</Badge>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {branches.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-slate-400 py-8">No branch data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Row 5: Red Flags */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Red Flags ({totalOpenFlags} open)</CardTitle>
            <div className="flex gap-2">
              {flagSummary.critical > 0 && <Badge className="bg-red-100 text-red-800">{flagSummary.critical} Critical</Badge>}
              {flagSummary.high > 0 && <Badge className="bg-orange-100 text-orange-800">{flagSummary.high} High</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farmer</TableHead>
                <TableHead>Flag Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((f) => (
                <TableRow key={f.flagId}>
                  <TableCell>
                    <button
                      className="text-blue-600 hover:underline font-medium text-left"
                      onClick={() => router.push(`/dashboard/farmers/${f.farmerId}`)}
                    >
                      {f.farmerName}
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono">
                      {f.flagType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={SEVERITY_COLORS[f.severity] || ""}>
                      {f.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{f.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-slate-600">{f.description}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(f.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </TableCell>
                  <TableCell className="text-right">
                    {f.status === "OPEN" && (
                      <Button size="sm" variant="outline" onClick={() => handleAcknowledge(f.flagId)}>
                        Acknowledge
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {flags.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-8">No red flags</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
