"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ArrowLeft, User, Leaf, ShieldCheck, TrendingUp, IndianRupee, CheckCircle2, Clock, AlertTriangle, XCircle, Eye, Camera, Grid2x2, SlidersHorizontal, ChevronDown, ChevronUp, Sprout, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, formatRupees } from "@/lib/api";
import { getFarmerScenarios, type Scenario } from "@/lib/drishti";
import { getReadinessFlags } from "@/lib/readiness";
import DecisioningMatrix from "@/components/underwriting/DecisioningMatrix";
import ScoreBreakdown from "@/components/underwriting/ScoreBreakdown";
import DrishtiStressLens from "@/components/underwriting/DrishtiStressLens";
import type { StressScenario } from "@/components/underwriting/DrishtiStressLens";
import type { DecisionAction } from "@/lib/design-tokens";

// Crop stage timeline visual
const CROP_STAGES = [
  { key: "planning", label: "Planning", icon: "📋" },
  { key: "preparation", label: "Land Prep", icon: "🚜" },
  { key: "sowing", label: "Sowing", icon: "🌱" },
  { key: "growing", label: "Growing", icon: "🌿" },
  { key: "monitoring", label: "Monitoring", icon: "👁️" },
  { key: "harvesting", label: "Harvesting", icon: "🌾" },
  { key: "post_harvest", label: "Post-Harvest", icon: "📦" },
  { key: "closed", label: "Closed", icon: "✅" },
];

const WORKBAND_STATUS_ICON: Record<string, { icon: string; color: string; label: string }> = {
  completed: { icon: "✅", color: "text-green-600", label: "Completed" },
  in_progress: { icon: "🔄", color: "text-blue-600", label: "In Progress" },
  planned: { icon: "📋", color: "text-slate-400", label: "Planned" },
  delayed: { icon: "⚠️", color: "text-amber-600", label: "Delayed" },
  skipped: { icon: "❌", color: "text-red-600", label: "Skipped" },
};

export default function FarmerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const farmerId = params.id;
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [drishtiScenarios, setDrishtiScenarios] = useState<Scenario[]>([]);
  const [showStressLens, setShowStressLens] = useState(false);

  // ROOTS Operational Profile
  const [rootsProfile, setRootsProfile] = useState<any>(null);
  const [rootsLoading, setRootsLoading] = useState(false);
  const [rootsExpanded, setRootsExpanded] = useState<Record<string, boolean>>({
    soil: true, activities: true, financial: false, loan: false, trust: false,
  });

  // Local cutoff overrides for what-if analysis
  const [trustCutoffOverride, setTrustCutoffOverride] = useState<number | null>(null);
  const [fhsCutoffOverride, setFhsCutoffOverride] = useState<number | null>(null);
  const [matrixEnabled, setMatrixEnabled] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("fp_token") || "";
        const flags = await getReadinessFlags(token);
        setMatrixEnabled(flags.bankerMatrix);

        const [detailRes, readinessRes] = await Promise.all([
          apiGet(`/banker/portfolio/farmers/${farmerId}`, token),
          flags.bankerMatrix
            ? apiGet(`/readiness/${farmerId}`, token).catch(() => null)
            : Promise.resolve(null),
        ]);
        setFarmer(detailRes.data || {});
        if (readinessRes?.data) setReadiness(readinessRes.data);

        // Fetch DRISHTI scenarios (non-blocking)
        getFarmerScenarios(token, Number(farmerId)).then((s) => setDrishtiScenarios(s || [])).catch(() => {});

        // Fetch ROOTS operational profile (non-blocking)
        apiGet(`/roots/farmer/me/health-summary`, token)
          .then((r) => setRootsProfile(r?.data || null))
          .catch(() => {});
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [farmerId]);

  // ─── Underwriting: derive from single readiness fetch ─────
  const trustScore = readiness?.trust?.score ?? null;
  const fhsScore = readiness?.financialHealth?.score ?? null;
  const defaultTrustCutoff = readiness?.thresholds?.trustCutoff ?? 60;
  const defaultFhsCutoff = readiness?.thresholds?.fhsCutoff ?? 50;
  const activeTrustCutoff = trustCutoffOverride ?? defaultTrustCutoff;
  const activeFhsCutoff = fhsCutoffOverride ?? defaultFhsCutoff;

  const matrixCell = useMemo<DecisionAction>(() => {
    if (trustScore == null || fhsScore == null) return "decline";
    const highTrust = trustScore >= activeTrustCutoff;
    const highFhs = fhsScore >= activeFhsCutoff;
    if (highTrust && highFhs) return "approve";
    if (highTrust && !highFhs) return "conditional";
    if (!highTrust && highFhs) return "refer";
    return "decline";
  }, [trustScore, fhsScore, activeTrustCutoff, activeFhsCutoff]);

  const stressScenarios = useMemo<StressScenario[]>(() => {
    return drishtiScenarios
      .filter((s) => s.projections)
      .map((s, idx) => ({
        id: s.label_key || `scenario-${idx}`,
        label: s.label,
        description: s.description,
        projections: s.projections,
      }));
  }, [drishtiScenarios]);

  const cutoffChanged = activeTrustCutoff !== defaultTrustCutoff || activeFhsCutoff !== defaultFhsCutoff;

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading farmer details...</div>;
  if (!farmer) return <div className="text-center py-16 text-slate-400">Farmer not found</div>;

  const f = farmer.farmer || {};
  const c = farmer.compliance || {};
  const dim = c.dimensions || {};
  const t = farmer.trust || {};
  const loans = farmer.loans || [];
  const prof = farmer.profitability || {};
  const tp = c.touchpointsCompleted || 0;
  const tt = c.touchpointsTotal || 10;
  const touchpoints = c.touchpointScores || [];

  // Determine current crop stage from touchpoints completed
  const currentStageIdx = Math.min(Math.floor((tp / tt) * CROP_STAGES.length), CROP_STAGES.length - 1);

  // Income data
  const income = farmer.income || {};
  const incomeStreams = income.incomeStreams || [];
  const incomePersona = income.incomePersona || 'single';
  const familySize = income.familySize;
  const earningMembers = income.earningMembers;
  const totalIncome = income.totalIncome || 0;
  const loanAmount = loans.length > 0 ? parseFloat(loans[0].loanAmount || loans[0].applyForAmount || 0) : 0;
  const coverageRatio = loanAmount > 0 ? (totalIncome / loanAmount) : 0;
  const hasSHG = incomeStreams.some((s: any) => s.type === 'shg_savings');

  const INCOME_ICONS: Record<string, string> = {
    crop: "\uD83C\uDF3E", dairy: "\uD83D\uDC04", fisheries: "\uD83D\uDC1F", horticulture: "\uD83C\uDF3F",
    labour: "\uD83D\uDC77", business: "\uD83C\uDFEA", shg_savings: "\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66",
    govt_transfer: "\uD83C\uDFDB\uFE0F", non_farm: "\uD83D\uDCBC",
  };
  const INCOME_LABELS: Record<string, string> = {
    crop: "Crop", dairy: "Dairy", fisheries: "Fisheries", horticulture: "Horticulture",
    labour: "Labour", business: "Business", shg_savings: "SHG Savings",
    govt_transfer: "Govt Transfer", non_farm: "Non-Farm",
  };
  const INCOME_PIE_COLORS: Record<string, string> = {
    crop: "#4caf50", dairy: "#2196f3", fisheries: "#00bcd4", horticulture: "#8bc34a",
    shg_savings: "#9c27b0", labour: "#ff9800", non_farm: "#607d8b",
    business: "#ff5722", govt_transfer: "#795548",
  };
  const STABILITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    very_stable: { label: "Very Stable", color: "text-green-700", bg: "bg-green-100" },
    stable: { label: "Stable", color: "text-green-600", bg: "bg-green-50" },
    moderate: { label: "Moderate", color: "text-amber-600", bg: "bg-amber-50" },
    unstable: { label: "Unstable", color: "text-red-600", bg: "bg-red-50" },
  };
  const PERSONA_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
    single: { label: "Single Income", emoji: "\uD83D\uDFE2", color: "text-green-700", bg: "bg-green-100" },
    double: { label: "Double Income", emoji: "\uD83D\uDD35", color: "text-blue-700", bg: "bg-blue-100" },
    triple: { label: "Triple Income", emoji: "\uD83D\uDFE3", color: "text-purple-700", bg: "bg-purple-100" },
    quad: { label: "Quad Income", emoji: "\u2B50", color: "text-amber-700", bg: "bg-amber-100" },
  };
  const personaCfg = PERSONA_CONFIG[incomePersona] || PERSONA_CONFIG.single;

  const pieData = incomeStreams.map((s: any) => ({
    name: INCOME_LABELS[s.type] || s.type,
    value: s.amount || 0,
    color: INCOME_PIE_COLORS[s.type] || "#9e9e9e",
  }));

  const scoreColor = (v: number) => v >= 70 ? "text-green-600" : v >= 40 ? "text-amber-600" : "text-red-600";
  const scoreBg = (v: number) => v >= 70 ? "bg-green-500" : v >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 transition"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            {f.name || "Farmer"}
          </h1>
          <p className="text-sm text-slate-500">{f.phone || ""} | ID: {farmerId}</p>
        </div>
        <div className="ml-auto">
          <Badge className={`text-sm px-3 py-1 ${c.status === "on_track" ? "bg-green-100 text-green-700" : c.status === "at_risk" ? "bg-amber-100 text-amber-700" : c.status === "off_track" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>
            {c.status === "on_track" ? "✅ On Track" : c.status === "at_risk" ? "⚠️ At Risk" : c.status === "off_track" ? "🔴 Off Track" : "—"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {matrixEnabled && <TabsTrigger value="underwriting">Underwriting</TabsTrigger>}
          <TabsTrigger value="crop-activity">Crop Activity (ROOTS)</TabsTrigger>
          <TabsTrigger value="verification">Verification (SATHI)</TabsTrigger>
          <TabsTrigger value="financial">Financial Position</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="income-profile">Income Profile</TabsTrigger>
          <TabsTrigger value="roots-profile">ROOTS Profile</TabsTrigger>
        </TabsList>

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview" className="space-y-4">
          {/* 4 Dimension Scores */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Timeliness", value: dim.timeliness || 0, desc: "Activity timing vs PoP schedule" },
              { label: "Task Completion", value: dim.taskCompletion || 0, desc: "% of PoP tasks completed" },
              { label: "Input Compliance", value: dim.inputCompliance || 0, desc: "Input usage vs PoP prescription" },
              { label: "Cost vs SoF", value: dim.costVsSof || 0, desc: "Cost within DLTC norms" },
            ].map((d) => (
              <Card key={d.label}>
                <CardContent className="pt-5 text-center">
                  <p className="text-xs font-semibold uppercase text-slate-500">{d.label}</p>
                  <p className={`text-4xl font-extrabold mt-1 ${scoreColor(d.value)}`}>{d.value}</p>
                  <Progress value={d.value} className="mt-3 h-2" />
                  <p className="text-xs text-slate-400 mt-2">{d.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Overall + Trust + Touchpoints */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold uppercase text-slate-500">Overall Compliance</p>
                <p className={`text-3xl font-extrabold ${scoreColor(c.overallScore || 0)}`}>{c.overallScore || 0}/100</p>
                <Progress value={c.overallScore || 0} className="mt-2 h-3" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold uppercase text-slate-500">TRUST Score</p>
                <p className="text-3xl font-extrabold text-blue-700">{t.finalScore || 0}</p>
                <p className="text-sm text-slate-400">Grade: <span className="font-bold text-slate-700">{t.grade || "—"}</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold uppercase text-slate-500">Touchpoint Progress</p>
                <p className="text-3xl font-extrabold text-slate-900">{tp} <span className="text-lg text-slate-400">/ {tt}</span></p>
                <Progress value={(tp / tt) * 100} className="mt-2 h-3" />
                <p className="text-xs text-slate-400 mt-1">{Math.round((tp / tt) * 100)}% complete</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === UNDERWRITING TAB (behind bankerMatrix flag) === */}
        {matrixEnabled && <TabsContent value="underwriting" className="space-y-6" data-testid="underwriting-tab">
          {readiness ? (
            <>
              {/* Cutoff sliders for what-if analysis */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                    What-If Thresholds
                    {cutoffChanged && (
                      <button
                        onClick={() => { setTrustCutoffOverride(null); setFhsCutoffOverride(null); }}
                        className="ml-auto text-xs text-blue-600 hover:underline font-normal normal-case"
                      >
                        Reset to defaults
                      </button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-slate-600">TRUST Cutoff</label>
                        <span className="text-sm font-bold text-slate-800" data-testid="trust-cutoff-value">{activeTrustCutoff}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={activeTrustCutoff}
                        onChange={(e) => setTrustCutoffOverride(Number(e.target.value))}
                        className="w-full accent-blue-600"
                        data-testid="trust-cutoff-slider"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>0</span>
                        <span className="text-slate-500">Default: {defaultTrustCutoff}</span>
                        <span>100</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-slate-600">FHS Cutoff</label>
                        <span className="text-sm font-bold text-slate-800" data-testid="fhs-cutoff-value">{activeFhsCutoff}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={activeFhsCutoff}
                        onChange={(e) => setFhsCutoffOverride(Number(e.target.value))}
                        className="w-full accent-blue-600"
                        data-testid="fhs-cutoff-slider"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>0</span>
                        <span className="text-slate-500">Default: {defaultFhsCutoff}</span>
                        <span>100</span>
                      </div>
                    </div>
                  </div>
                  {cutoffChanged && (
                    <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Thresholds adjusted locally — matrix reflects what-if position, not policy defaults.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Decisioning Matrix */}
              {trustScore != null && fhsScore != null ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                      <Grid2x2 className="w-4 h-4 text-blue-600" />
                      Decisioning Matrix
                      <button
                        onClick={() => setShowStressLens(!showStressLens)}
                        className={`ml-auto text-xs font-normal normal-case px-3 py-1 rounded-full border transition-all ${
                          showStressLens
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                        data-testid="stress-lens-toggle"
                      >
                        {showStressLens ? "Hide Stress Lens" : "Show DRISHTI Stress Lens"}
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DecisioningMatrix
                      trust={trustScore}
                      fhs={fhsScore}
                      trustCutoff={activeTrustCutoff}
                      fhsCutoff={activeFhsCutoff}
                      cell={matrixCell}
                      productConfig={{
                        approve: { ticket: "Standard", tenor: "12 months", note: "Standard terms" },
                        conditional: { ticket: "Reduced", tenor: "Seasonal", note: "EMI aligned to crop" },
                        refer: { ticket: "Hold", note: "Extra KYC required" },
                        decline: { note: "Coaching path + re-apply 90 days" },
                      }}
                    />

                    {showStressLens && stressScenarios.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-200" data-testid="stress-lens-section">
                        <DrishtiStressLens
                          trust={trustScore}
                          fhs={fhsScore}
                          trustCutoff={activeTrustCutoff}
                          fhsCutoff={activeFhsCutoff}
                          baselineCell={matrixCell}
                          scenarios={stressScenarios}
                        />
                      </div>
                    )}

                    {showStressLens && stressScenarios.length === 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-200 text-center py-8 text-slate-400 text-sm">
                        No DRISHTI scenarios available for this farmer. Run a scenario analysis first.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">Insufficient score data for decisioning matrix</p>
                    <p className="text-xs mt-1">Both TRUST and FHS scores are required.</p>
                  </CardContent>
                </Card>
              )}

              {/* Score Breakdown */}
              <ScoreBreakdown
                trust={readiness.trust}
                financialHealth={readiness.financialHealth}
                stalenessFlags={readiness.stalenessFlags}
              />
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-slate-400">
                <p className="text-sm font-medium">Readiness data not available</p>
                <p className="text-xs mt-1">This farmer may not have completed the readiness assessment yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>}

        {/* === CROP ACTIVITY TAB (ROOTS) === */}
        <TabsContent value="crop-activity" className="space-y-4">
          {/* Crop Stage Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                <Leaf className="w-4 h-4 text-green-600" /> Crop Stage Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between relative">
                {/* Connection line */}
                <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-200 z-0" />
                <div className="absolute top-5 left-8 h-0.5 bg-green-500 z-0" style={{ width: `${(currentStageIdx / (CROP_STAGES.length - 1)) * 100}%` }} />

                {CROP_STAGES.map((stage, idx) => {
                  const isCompleted = idx < currentStageIdx;
                  const isCurrent = idx === currentStageIdx;
                  const isFuture = idx > currentStageIdx;
                  return (
                    <div key={stage.key} className="flex flex-col items-center z-10 relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 ${isCompleted ? "bg-green-500 border-green-500 text-white" : isCurrent ? "bg-blue-500 border-blue-500 text-white animate-pulse" : "bg-white border-slate-300 text-slate-400"}`}>
                        {isCompleted ? "✓" : stage.icon}
                      </div>
                      <span className={`text-xs mt-1 font-medium ${isCurrent ? "text-blue-600 font-bold" : isCompleted ? "text-green-600" : "text-slate-400"}`}>{stage.label}</span>
                      {isCurrent && <span className="text-xs text-blue-500 font-bold mt-0.5">CURRENT</span>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 10 Touchpoints Detail */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wide">10 Touchpoint Entries (Self-Verified by Farmer)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Workband</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Task Score</TableHead>
                    <TableHead>Input Score</TableHead>
                    <TableHead>Cost Score</TableHead>
                    <TableHead>Timing Score</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead>Farmer Entry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }, (_, i) => {
                    const tp = touchpoints[i] || null;
                    const isDone = tp && tp.touchpoint_score != null;
                    const statusCfg = WORKBAND_STATUS_ICON[tp?.status || "planned"];
                    return (
                      <TableRow key={i} className={isDone ? "" : "opacity-50"}>
                        <TableCell className="font-bold text-slate-500">{i + 1}</TableCell>
                        <TableCell className="font-medium">{tp?.workband_name || `Touchpoint ${i + 1}`}</TableCell>
                        <TableCell>
                          <span className={`flex items-center gap-1 ${statusCfg.color}`}>
                            {statusCfg.icon} <span className="text-xs">{statusCfg.label}</span>
                          </span>
                        </TableCell>
                        <TableCell className={scoreColor(tp?.task_score || 0)}>{isDone ? tp.task_score : "—"}</TableCell>
                        <TableCell className={scoreColor(tp?.input_score || 0)}>{isDone ? tp.input_score : "—"}</TableCell>
                        <TableCell className={scoreColor(tp?.cost_score || 0)}>{isDone ? tp.cost_score : "—"}</TableCell>
                        <TableCell className={scoreColor(tp?.timing_score || 0)}>{isDone ? tp.timing_score : "—"}</TableCell>
                        <TableCell>
                          {isDone ? (
                            <span className={`font-bold ${scoreColor(tp.touchpoint_score)}`}>{tp.touchpoint_score}/100</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {isDone ? (
                            <Badge variant="outline" className="text-green-700 bg-green-50 border-0 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Self-Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-0 text-xs">
                              <Clock className="w-3 h-3 mr-1" /> Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === SATHI VERIFICATION TAB === */}
        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> SATHI Field Verification Status
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">Independent verification by field agent (Community Resource Person)</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Verification Type</TableHead>
                    <TableHead>Self-Reported (Farmer)</TableHead>
                    <TableHead>SATHI Verified</TableHead>
                    <TableHead>Match Status</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Evidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { type: "Address Verification", farmer: "Village: Mysuru", sathi: "Pending", match: "pending", confidence: 0, evidence: false },
                    { type: "Farm Boundary / Field Size", farmer: "5 hectares", sathi: "Pending", match: "pending", confidence: 0, evidence: false },
                    { type: "Crop Variety Planted", farmer: "Wheat HD-2967", sathi: "Pending", match: "pending", confidence: 0, evidence: false },
                    { type: "Crop Health Assessment", farmer: "Self: Good", sathi: "Pending", match: "pending", confidence: 0, evidence: false },
                    { type: "Input Application (Fertiliser)", farmer: "DAP 50kg/ha applied", sathi: "Pending", match: "pending", confidence: 0, evidence: false },
                    { type: "Growth Stage Observation", farmer: "Stage 5: Tillering", sathi: "Pending", match: "pending", confidence: 0, evidence: false },
                    { type: "Harvest Quantity", farmer: "Not yet", sathi: "Pending", match: "pending", confidence: 0, evidence: false },
                    { type: "Sale Transaction", farmer: "Not yet", sathi: "Pending", match: "pending", confidence: 0, evidence: false },
                    { type: "Ownership Proof (Land)", farmer: "Submitted", sathi: "Pending", match: "pending", confidence: 0, evidence: false },
                    { type: "Livestock / Allied Activity", farmer: "2 cows", sathi: "Pending", match: "pending", confidence: 0, evidence: false },
                  ].map((v, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{v.type}</TableCell>
                      <TableCell className="text-sm text-slate-600">{v.farmer}</TableCell>
                      <TableCell>
                        {v.sathi === "Pending" ? (
                          <Badge variant="outline" className="text-amber-600 bg-amber-50 border-0 text-xs"><Clock className="w-3 h-3 mr-1" />Pending Visit</Badge>
                        ) : (
                          <span className="text-green-600 font-medium">{v.sathi}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {v.match === "pending" ? (
                          <Badge variant="outline" className="text-slate-400 text-xs">Awaiting</Badge>
                        ) : v.match === "matched" ? (
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs">✅ Matched</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 border-0 text-xs">❌ Contradiction</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {v.confidence > 0 ? (
                          <div className="flex items-center gap-2">
                            <Progress value={v.confidence} className="w-16 h-2" />
                            <span className="text-xs">{v.confidence}%</span>
                          </div>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </TableCell>
                      <TableCell>
                        {v.evidence ? (
                          <Badge variant="outline" className="text-blue-600 text-xs cursor-pointer"><Camera className="w-3 h-3 mr-1" />Photos</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">No evidence yet</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  SATHI field visit not yet completed for this farmer
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  All verifications are pending independent field visit by the assigned SATHI agent.
                  Once completed, each item will show: Verified status, match/contradiction detection, confidence percentage, and photo evidence.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === FINANCIAL TAB === */}
        <TabsContent value="financial" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold uppercase text-slate-500">Total Loan Outstanding</p>
                <p className="text-2xl font-extrabold text-slate-900">{formatRupees(loans.reduce((s: number, l: Record<string, unknown>) => s + (Number(l.loanAmount) || Number(l.applyForAmount) || 0), 0))}</p>
                <p className="text-sm text-slate-400">{loans.length} loan(s)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold uppercase text-slate-500">Cost Deviation</p>
                <p className={`text-2xl font-extrabold ${(c.costDeviation || 0) > 25 ? "text-red-600" : (c.costDeviation || 0) > 10 ? "text-amber-600" : "text-green-600"}`}>
                  {c.costDeviation != null ? `${c.costDeviation > 0 ? "+" : ""}${c.costDeviation}%` : "\u2014"}
                </p>
                <p className="text-sm text-slate-400">vs DLTC Scale of Finance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold uppercase text-slate-500">Insurance Coverage</p>
                <p className="text-2xl font-extrabold text-slate-900">{formatRupees(farmer.insurance?.totalCoverage)}</p>
                <p className="text-sm text-slate-400">{farmer.insurance?.totalPolicies || 0} policies</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold uppercase text-slate-500">Net Profit</p>
                <p className={`text-2xl font-extrabold ${(prof.netProfit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {prof.netProfit != null ? formatRupees(prof.netProfit) : "\u2014"}
                </p>
                <p className="text-sm text-slate-400">{prof.totalIncome != null ? `Income: ${formatRupees(prof.totalIncome)}` : "No data yet"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Loans Table */}
          {loans.length > 0 ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Loan Applications</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Applied</TableHead>
                      <TableHead className="text-right">Approved</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead>Tenure</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Insurance</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((l: Record<string, unknown>, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">#{String(l.id)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs capitalize ${
                            l.applicationStatus === "disbursed" || l.applicationStatus === "active" ? "bg-emerald-50 text-emerald-700" :
                            l.applicationStatus === "approved" ? "bg-blue-50 text-blue-700" :
                            l.applicationStatus === "rejected" ? "bg-red-50 text-red-700" :
                            "bg-amber-50 text-amber-700"
                          }`}>{String(l.applicationStatus || "--").replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatRupees(l.applyForAmount as number)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatRupees(l.loanAmount as number)}</TableCell>
                        <TableCell className="text-right">{l.interestRate ? `${l.interestRate}%` : "--"}</TableCell>
                        <TableCell>{l.tenure ? `${l.tenure} mo` : "--"}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{String(l.intendedUse || "--")}</TableCell>
                        <TableCell>
                          {(l.insuranceBundled as unknown[])?.length ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">Insured</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{l.createdAt ? new Date(String(l.createdAt)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "--"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="pt-5 text-center text-slate-400">No loan applications found.</CardContent></Card>
          )}
        </TabsContent>

        {/* === INSURANCE TAB === */}
        <TabsContent value="insurance" className="space-y-4">
          {/* Insurance Summary KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground uppercase">Total Policies</div>
                <div className="text-2xl font-extrabold">{farmer.insurance?.totalPolicies ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground uppercase">Total Premium</div>
                <div className="text-2xl font-extrabold">{formatRupees(farmer.insurance?.totalPremium)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground uppercase">Total Coverage</div>
                <div className="text-2xl font-extrabold">{formatRupees(farmer.insurance?.totalCoverage)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground uppercase">Active Claims</div>
                <div className="text-2xl font-extrabold">{farmer.insurance?.hasActiveClaim ? <Badge className="bg-amber-100 text-amber-800">Yes</Badge> : <Badge variant="outline">None</Badge>}</div>
              </CardContent>
            </Card>
          </div>

          {/* Bundled Insurance (with loans) */}
          {(farmer.insurance?.bundled?.length ?? 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Loan-Bundled Insurance (PMFBY)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Season</TableHead>
                      <TableHead className="text-right">Sum Insured</TableHead>
                      <TableHead className="text-right">Premium</TableHead>
                      <TableHead className="text-right">Farmer Share</TableHead>
                      <TableHead>Policy Status</TableHead>
                      <TableHead>Claim</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {farmer.insurance.bundled.map((ins: Record<string, unknown>, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{String(ins.productName || "PMFBY")}</TableCell>
                        <TableCell>{String(ins.provider || "--")}</TableCell>
                        <TableCell className="capitalize">{String(ins.season || "--")}</TableCell>
                        <TableCell className="text-right">{formatRupees(ins.sumInsured as number)}</TableCell>
                        <TableCell className="text-right">{formatRupees(ins.premiumAmount as number)}</TableCell>
                        <TableCell className="text-right">{formatRupees(ins.farmerPremiumShare as number)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{String(ins.policyStatus || "--")}</Badge></TableCell>
                        <TableCell>
                          {ins.claimStatus ? (
                            <Badge variant="outline" className={`text-xs ${ins.claimStatus === "settled" ? "bg-emerald-50 text-emerald-700" : ins.claimStatus === "filed" ? "bg-amber-50 text-amber-700" : ""}`}>
                              {String(ins.claimStatus)} {ins.claimAmount ? `(${formatRupees(ins.claimAmount as number)})` : ""}
                            </Badge>
                          ) : <span className="text-xs text-muted-foreground">No claim</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Standalone Insurance */}
          {(farmer.insurance?.standalone?.length ?? 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Standalone Insurance Enrollments</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Policy No.</TableHead>
                      <TableHead className="text-right">Sum Insured</TableHead>
                      <TableHead className="text-right">Premium Paid</TableHead>
                      <TableHead className="text-right">Subsidy</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Claim</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {farmer.insurance.standalone.map((ins: Record<string, unknown>, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium capitalize">{String(ins.insuranceType || "--").replace("_", " ")}</TableCell>
                        <TableCell>{String(ins.policyNumber || "--")}</TableCell>
                        <TableCell className="text-right">{formatRupees(ins.sumInsured as number)}</TableCell>
                        <TableCell className="text-right">{formatRupees(ins.premiumPaid as number)}</TableCell>
                        <TableCell className="text-right">{formatRupees(ins.premiumSubsidy as number)}</TableCell>
                        <TableCell className="text-xs">{ins.startDate ? String(ins.startDate).split("T")[0] : "--"} to {ins.endDate ? String(ins.endDate).split("T")[0] : "--"}</TableCell>
                        <TableCell>
                          {ins.claimStatus ? (
                            <Badge variant="outline" className="text-xs capitalize">{String(ins.claimStatus)} {ins.claimPayout ? `(${formatRupees(ins.claimPayout as number)})` : ""}</Badge>
                          ) : <span className="text-xs text-muted-foreground">No claim</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {(farmer.insurance?.totalPolicies ?? 0) === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No insurance policies found for this farmer</CardContent></Card>
          )}
        </TabsContent>

        {/* === INCOME PROFILE TAB === */}
        <TabsContent value="income-profile" className="space-y-4">
          {/* Persona Badge */}
          <Card>
            <CardContent className="pt-5 flex items-center gap-4">
              <span className={`text-4xl`}>{personaCfg.emoji}</span>
              <div>
                <Badge className={`${personaCfg.bg} ${personaCfg.color} border-0 text-lg px-4 py-1 font-bold`}>
                  {personaCfg.label}
                </Badge>
                <p className="text-sm text-slate-500 mt-1">{incomeStreams.length} income source{incomeStreams.length !== 1 ? "s" : ""} identified | Total: {formatRupees(totalIncome)}/year</p>
              </div>
            </CardContent>
          </Card>

          {/* Income Sources Grid */}
          <div className="grid grid-cols-2 gap-4">
            {incomeStreams.map((s: any, idx: number) => {
              const stabCfg = STABILITY_CONFIG[s.stability] || { label: s.stability || "Unknown", color: "text-slate-500", bg: "bg-slate-100" };
              return (
                <Card key={idx}>
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{INCOME_ICONS[s.type] || "\uD83D\uDCB0"}</span>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{INCOME_LABELS[s.type] || s.type}</p>
                        <p className="text-xl font-extrabold text-slate-800">{formatRupees(s.amount)}<span className="text-xs text-slate-400 font-normal">/year</span></p>
                      </div>
                      <Badge className={`${stabCfg.bg} ${stabCfg.color} border-0 text-xs`}>{stabCfg.label}</Badge>
                    </div>
                    {s.description && <p className="text-xs text-slate-500">{s.description}</p>}
                  </CardContent>
                </Card>
              );
            })}
            {incomeStreams.length === 0 && (
              <Card className="col-span-2">
                <CardContent className="pt-5 text-center text-slate-400">No income stream data available.</CardContent>
              </Card>
            )}
          </div>

          {/* Family Card + Income Pie Chart */}
          <div className="grid grid-cols-2 gap-4">
            {/* Family Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wide">Family Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-extrabold text-slate-900">{familySize ?? "—"}</p>
                    <p className="text-xs text-slate-500 mt-1">Total Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-extrabold text-blue-600">{earningMembers ?? "—"}</p>
                    <p className="text-xs text-slate-500 mt-1">Earning Members</p>
                  </div>
                </div>
                {hasSHG && (
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-purple-100 text-purple-700 border-0 text-xs font-bold">SHG Member</Badge>
                    </div>
                    {incomeStreams.filter((s: any) => s.type === 'shg_savings').map((s: any, i: number) => (
                      <div key={i} className="text-xs text-purple-700 mt-1">
                        {s.description && <p>{s.description}</p>}
                        <p className="font-semibold">Monthly Savings: {formatRupees((s.amount || 0) / 12)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Income Pie Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wide">Income Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                        {pieData.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatRupees(Number(value))} />
                      <Legend formatter={(value: string) => <span className="text-xs">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No income data</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Income Adequacy */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" /> Income Adequacy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase text-slate-500">Total Annual Income</p>
                  <p className="text-2xl font-extrabold text-green-600">{formatRupees(totalIncome)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase text-slate-500">Loan Amount</p>
                  <p className="text-2xl font-extrabold text-slate-900">{formatRupees(loanAmount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase text-slate-500">Coverage Ratio</p>
                  <p className={`text-2xl font-extrabold ${coverageRatio >= 2 ? "text-green-600" : coverageRatio >= 1 ? "text-amber-600" : "text-red-600"}`}>
                    {coverageRatio > 0 ? `${coverageRatio.toFixed(1)}x` : "—"}
                  </p>
                  <p className="text-xs text-slate-400">{coverageRatio >= 2 ? "Adequate" : coverageRatio >= 1 ? "Marginal" : "Insufficient"}</p>
                </div>
              </div>
              {loanAmount > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Income vs Loan Coverage</span>
                    <span>{Math.min(Math.round(coverageRatio * 100), 400)}%</span>
                  </div>
                  <Progress value={Math.min(coverageRatio * 25, 100)} className="h-3" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* ── ROOTS Operational Profile Tab ── */}
        <TabsContent value="roots-profile" className="space-y-4">
          {!rootsProfile ? (
            <Card><CardContent className="p-8 text-center text-slate-400">No ROOTS data available for this farmer</CardContent></Card>
          ) : (
            <>
              {/* Section 1: Soil Health Profile */}
              <Card>
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setRootsExpanded((p) => ({ ...p, soil: !p.soil }))}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-amber-600" /> Soil Health Profile
                    </CardTitle>
                    {rootsExpanded.soil ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </CardHeader>
                {rootsExpanded.soil && (
                  <CardContent>
                    {rootsProfile.activities?.some((a: any) => a.soilHealthAvailable) ? (
                      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                          { label: "Nitrogen (N)", key: "n_status" },
                          { label: "Phosphorus (P)", key: "p_status" },
                          { label: "Potassium (K)", key: "k_status" },
                          { label: "pH", key: "ph_status" },
                          { label: "Organic Carbon", key: "oc_status" },
                        ].map((param) => (
                          <div key={param.key} className="text-center p-3 rounded-lg bg-slate-50">
                            <p className="text-xs text-slate-500">{param.label}</p>
                            <Badge variant="outline" className="mt-1 text-xs">Available</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">No soil health card captured for this farmer</p>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Section 2: Active Activity Timeline */}
              <Card>
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setRootsExpanded((p) => ({ ...p, activities: !p.activities }))}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                      <Sprout className="w-4 h-4 text-green-600" /> Active Activities ({rootsProfile.activities?.length || 0})
                    </CardTitle>
                    {rootsExpanded.activities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </CardHeader>
                {rootsExpanded.activities && (
                  <CardContent className="space-y-4">
                    {(rootsProfile.activities || []).map((act: any) => {
                      const scoreColor = act.scoreColor === "green" ? "bg-green-50 text-green-700" : act.scoreColor === "amber" ? "bg-orange-50 text-orange-700" : "bg-red-50 text-red-700";
                      return (
                        <div key={`${act.type}-${act.cycleId}`} className="border rounded-lg p-4">
                          {/* Activity header */}
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-bold text-sm">{act.name}</p>
                              <p className="text-xs text-slate-500">Stage {act.currentStage}/{act.totalStages}</p>
                            </div>
                            <Badge className={scoreColor}>
                              {act.overallScore != null ? `${Math.round(act.overallScore)}/100` : "—"}
                            </Badge>
                          </div>

                          {/* Stage timeline */}
                          {act.stageStatuses?.length > 0 && (
                            <div className="flex gap-1 mb-3 flex-wrap">
                              {act.stageStatuses.map((status: string, idx: number) => {
                                const colors: Record<string, string> = {
                                  completed: "bg-green-500 text-white",
                                  current: "bg-blue-500 text-white animate-pulse",
                                  delayed: "bg-amber-500 text-white",
                                  missed: "bg-red-500 text-white",
                                  skipped: "bg-slate-300 text-slate-600",
                                  upcoming: "bg-slate-100 text-slate-400",
                                };
                                return (
                                  <div key={idx} className="flex flex-col items-center">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${colors[status] || colors.upcoming}`}>
                                      {idx + 1}
                                    </div>
                                    <span className="text-[8px] text-slate-400 mt-0.5">{status.slice(0, 4)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Next action */}
                          {act.nextAction && (
                            <p className="text-xs text-blue-600 mb-2">
                              Next: <span className="font-semibold">{act.nextAction.name}</span>
                              {act.nextAction.dueInDays > 0 ? ` in ${act.nextAction.dueInDays} days` : " — due now"}
                            </p>
                          )}

                          {/* Alerts */}
                          {act.alerts?.length > 0 && (
                            <div className="bg-red-50 rounded p-2 mt-2">
                              {act.alerts.map((a: string, i: number) => (
                                <p key={i} className="text-xs text-red-700">⚠️ {a}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>

              {/* Section 3: Financial Summary */}
              <Card>
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setRootsExpanded((p) => ({ ...p, financial: !p.financial }))}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-blue-600" /> Financial Summary
                    </CardTitle>
                    {rootsExpanded.financial ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </CardHeader>
                {rootsExpanded.financial && (
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Activity</TableHead>
                          <TableHead className="text-right">Spent</TableHead>
                          <TableHead className="text-right">Expected</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(rootsProfile.activities || []).map((act: any) => (
                          <TableRow key={`fin-${act.cycleId}`}>
                            <TableCell className="font-medium text-sm">{act.name}</TableCell>
                            <TableCell className="text-right">{formatRupees(act.financials?.spent)}</TableCell>
                            <TableCell className="text-right">{formatRupees(act.financials?.expected)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className={
                                Math.abs(act.financials?.variancePct || 0) > 25 ? "bg-red-50 text-red-700" :
                                Math.abs(act.financials?.variancePct || 0) > 10 ? "bg-orange-50 text-orange-700" :
                                "bg-green-50 text-green-700"
                              }>
                                {act.financials?.variancePct > 0 ? "+" : ""}{act.financials?.variancePct || 0}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>

              {/* Section 4: Loan Utilization */}
              <Card>
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setRootsExpanded((p) => ({ ...p, loan: !p.loan }))}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-600" /> Loan Utilization
                    </CardTitle>
                    {rootsExpanded.loan ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </CardHeader>
                {rootsExpanded.loan && (
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold">{rootsProfile.activities?.length || 0}</p>
                        <p className="text-xs text-slate-500">Active Cycles</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold">{rootsProfile.pendingActions || 0}</p>
                        <p className="text-xs text-slate-500">Pending Actions</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{rootsProfile.farmHealthScore != null ? Math.round(rootsProfile.farmHealthScore) : "—"}</p>
                        <p className="text-xs text-slate-500">Farm Health Score</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold">{rootsProfile.unreadAdvisories || 0}</p>
                        <p className="text-xs text-slate-500">Unread Advisories</p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Section 5: TRUST ROOTS Component */}
              <Card>
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setRootsExpanded((p) => ({ ...p, trust: !p.trust }))}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-600" /> TRUST Integration Signals
                    </CardTitle>
                    {rootsExpanded.trust ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </CardHeader>
                {rootsExpanded.trust && (
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-green-700 mb-2">✅ Positive Signals</p>
                        <ul className="space-y-1">
                          {(rootsProfile.activities || []).filter((a: any) => a.overallScore && a.overallScore >= 70).map((a: any) => (
                            <li key={`pos-${a.cycleId}`} className="text-xs text-slate-600">• {a.name}: compliance score {Math.round(a.overallScore)}/100</li>
                          ))}
                          {rootsProfile.activities?.some((a: any) => a.soilHealthAvailable) && (
                            <li className="text-xs text-slate-600">• Soil health card captured — soil-adjusted recommendations applied</li>
                          )}
                          {rootsProfile.farmHealthScore && rootsProfile.farmHealthScore >= 70 && (
                            <li className="text-xs text-slate-600">• Overall farm health score {Math.round(rootsProfile.farmHealthScore)}/100 — above threshold</li>
                          )}
                          {(rootsProfile.activities || []).every((a: any) => a.alerts?.length === 0) && (
                            <li className="text-xs text-slate-600">• No active red flags</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-red-700 mb-2">⚠️ Negative Signals</p>
                        <ul className="space-y-1">
                          {(rootsProfile.activities || []).filter((a: any) => a.overallScore && a.overallScore < 60).map((a: any) => (
                            <li key={`neg-${a.cycleId}`} className="text-xs text-slate-600">• {a.name}: low compliance ({Math.round(a.overallScore)}/100)</li>
                          ))}
                          {(rootsProfile.activities || []).flatMap((a: any) => a.alerts || []).map((alert: string, i: number) => (
                            <li key={`alert-${i}`} className="text-xs text-slate-600">• {alert}</li>
                          ))}
                          {rootsProfile.pendingActions > 3 && (
                            <li className="text-xs text-slate-600">• {rootsProfile.pendingActions} pending data entry actions</li>
                          )}
                          {(!rootsProfile.activities || rootsProfile.activities.length === 0) && (
                            <li className="text-xs text-slate-600">• No ROOTS activity data — cannot assess farming operations</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Section 6: Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push(`/dashboard/roots-compliance`)}>
                  <Eye className="w-3.5 h-3.5" /> View Portfolio Compliance
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> View Photo Evidence
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Grid2x2 className="w-3.5 h-3.5" /> View VYAPAR Purchases
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50">
                  <AlertTriangle className="w-3.5 h-3.5" /> View SENTINEL Risk
                </Button>
              </div>
            </>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
}
