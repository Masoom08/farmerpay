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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { apiGet, formatRupees } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────

interface Workband {
  id: number;
  status: string;
  completionPct: number;
  startDate: string | null;
  endDate: string | null;
  taskCount: number;
  tasksCompleted: number;
}

interface Compliance {
  overallScore: number;
  status: string;
  touchpointsCompleted: number;
  touchpointsTotal: number;
  timeliness: number;
  taskCompletion: number;
  inputCompliance: number;
  costVsSof: number;
  costDeviation: number;
  touchpointScores: Array<{
    workband_order: number;
    workband_name: string;
    task_score: number;
    input_score: number;
    cost_score: number;
    timing_score: number;
    touchpoint_score: number;
    status: string;
  }>;
  deviations: Array<{
    dimension: string;
    item: string;
    expected: string;
    actual: string;
    variance: string;
    severity: string;
  }>;
}

interface CycleData {
  cycleId: number;
  farmerId: number;
  farmerName: string;
  cropId: string;
  season: string;
  year: number;
  sowingDate: string;
  expectedHarvest: string;
  actualHarvest: string | null;
  status: string;
  compliance: Compliance | null;
  workbands: Workband[];
  harvest: {
    totalKg: number;
    yieldPerHa: number;
    qualityGrade: string;
    achievedPct: number;
    postHarvestLoss: number;
  } | null;
  sales: {
    totalSold: number;
    totalValue: number;
    avgPrice: number;
  } | null;
}

interface ActivityRecord {
  id: number;
  farmerId: number;
  farmerName: string;
  name: string;
  [key: string]: unknown;
}

interface RootsData {
  summary: {
    totalCycles: number;
    cycleStatusDistribution: Record<string, number>;
    complianceDistribution: Record<string, number>;
    avgComplianceScore: number;
    totalWorkbands: number;
    workbandStatusDistribution: Record<string, number>;
    totalTasks: number;
    tasksCompleted: number;
    totalHarvestKg: number;
    totalSaleValue: number;
  };
  cycles: CycleData[];
  multiActivity: {
    dairy: {
      herds: number;
      animals: number;
      animalTypes: Record<string, number>;
      monthlyIncome: number;
      records: ActivityRecord[];
    };
    fishery: {
      registers: number;
      ponds: number;
      totalArea: number;
      monthlyIncome: number;
      records: ActivityRecord[];
    };
    horticulture: {
      orchards: number;
      totalArea: number;
      totalPlants: number;
      monthlyIncome: number;
      records: Array<ActivityRecord & { crop: string; variety: string; area: number; plants: number; infrastructure: string }>;
    };
  };
}

const STATUS_COLORS: Record<string, string> = {
  on_track: "bg-emerald-100 text-emerald-800 border-emerald-200",
  at_risk: "bg-amber-100 text-amber-800 border-amber-200",
  off_track: "bg-red-100 text-red-800 border-red-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  planned: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  delayed: "bg-amber-100 text-amber-700",
  skipped: "bg-red-100 text-red-600",
};

const PIE_COLORS = ["#059669", "#f59e0b", "#dc2626", "#6366f1", "#8b5cf6", "#0ea5e9"];

export default function RootsActivityPage() {
  const router = useRouter();
  const [data, setData] = useState<RootsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<CycleData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("fp_token");
    if (!token) { router.push("/login"); return; }
    (async () => {
      try {
        const res = await apiGet("/banker/portfolio/roots-activity", token);
        if (res.success) {
          setData(res.data);
          if (res.data.cycles?.length > 0) setSelectedCycle(res.data.cycles[0]);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "UNAUTHORIZED") {
          localStorage.removeItem("fp_token");
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">ROOTS Activity Analytics</h1>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-8 bg-slate-200 rounded animate-pulse" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-muted-foreground">No ROOTS data available</div>;
  }

  const s = data.summary;

  // Charts data
  const compliancePie = Object.entries(s.complianceDistribution).map(([k, v]) => ({
    name: k.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: v,
  }));

  const cycleStatusPie = Object.entries(s.cycleStatusDistribution).map(([k, v]) => ({
    name: k.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: v,
  }));

  const wbStatusBar = Object.entries(s.workbandStatusDistribution).map(([k, v]) => ({
    name: k.replace("_", " "),
    count: v,
  }));

  // Selected cycle radar data
  const radarData = selectedCycle?.compliance ? [
    { dimension: "Timeliness", score: selectedCycle.compliance.timeliness },
    { dimension: "Task Completion", score: selectedCycle.compliance.taskCompletion },
    { dimension: "Input Compliance", score: selectedCycle.compliance.inputCompliance },
    { dimension: "Cost vs SoF", score: selectedCycle.compliance.costVsSof },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ROOTS Activity Analytics</h1>
        <p className="text-muted-foreground text-sm">
          86 ROOTS tables: Crop lifecycle (55) + Dairy (13) + Fishery (10) + Horticulture (8)
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Cultivation Cycles" value={s.totalCycles} icon="🌾" />
        <KpiCard label="Avg Compliance" value={`${s.avgComplianceScore}/100`}
          color={s.avgComplianceScore >= 70 ? "text-emerald-700" : s.avgComplianceScore >= 40 ? "text-amber-700" : "text-red-700"} icon="📊" />
        <KpiCard label="Tasks Completed" value={`${s.tasksCompleted}/${s.totalTasks}`} icon="✅" />
        <KpiCard label="Total Harvest" value={`${(s.totalHarvestKg / 1000).toFixed(1)} T`} icon="🌾" />
        <KpiCard label="Total Sale Value" value={formatRupees(s.totalSaleValue)} icon="💰" />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="cycles">
        <TabsList>
          <TabsTrigger value="cycles">Crop Cycles</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Analysis</TabsTrigger>
          <TabsTrigger value="workbands">Workband Execution</TabsTrigger>
          <TabsTrigger value="deviations">Deviations</TabsTrigger>
          <TabsTrigger value="multiactivity">Multi-Activity</TabsTrigger>
        </TabsList>

        {/* ── Crop Cycles Tab ── */}
        <TabsContent value="cycles">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cycle Status Pie */}
            <Card>
              <CardHeader><CardTitle className="text-base">Cycle Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={cycleStatusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                        {cycleStatusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Pie */}
            <Card>
              <CardHeader><CardTitle className="text-base">Compliance Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={compliancePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                        {compliancePie.map((_, i) => <Cell key={i} fill={["#059669", "#f59e0b", "#dc2626"][i] || PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Workband Status Bar */}
            <Card>
              <CardHeader><CardTitle className="text-base">Workband Execution Status</CardTitle></CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={wbStatusBar}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 } as object} />
                      <YAxis tick={{ fontSize: 11 } as object} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cycles Table */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">All Cultivation Cycles</CardTitle>
              <CardDescription>Click a row to view detailed compliance + workband analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Season</TableHead>
                    <TableHead>Sowing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Touchpoints</TableHead>
                    <TableHead className="text-center">Compliance</TableHead>
                    <TableHead className="text-right">Harvest (kg)</TableHead>
                    <TableHead className="text-right">Sale Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.cycles.map((c) => (
                    <TableRow key={c.cycleId} className={`cursor-pointer ${selectedCycle?.cycleId === c.cycleId ? "bg-blue-50" : "hover:bg-slate-50"}`}
                      onClick={() => setSelectedCycle(c)}>
                      <TableCell className="font-medium">{c.farmerName}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{c.season} {c.year}</Badge></TableCell>
                      <TableCell className="text-xs">{c.sowingDate ? new Date(c.sowingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "--"}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>{c.status?.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-center font-bold">{c.compliance?.touchpointsCompleted ?? 0}/{c.compliance?.touchpointsTotal ?? 10}</TableCell>
                      <TableCell className="text-center">
                        {c.compliance ? (
                          <Badge variant="outline" className={STATUS_COLORS[c.compliance.status] || ""}>
                            {c.compliance.overallScore}/100
                          </Badge>
                        ) : "--"}
                      </TableCell>
                      <TableCell className="text-right">{c.harvest?.totalKg?.toLocaleString("en-IN") ?? "--"}</TableCell>
                      <TableCell className="text-right">{c.sales ? formatRupees(c.sales.totalValue) : "--"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Compliance Analysis Tab ── */}
        <TabsContent value="compliance">
          {selectedCycle && selectedCycle.compliance ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">{selectedCycle.farmerName}</h3>
                <Badge variant="outline" className="capitalize">{selectedCycle.season} {selectedCycle.year}</Badge>
                <Badge variant="outline" className={STATUS_COLORS[selectedCycle.compliance.status]}>
                  {selectedCycle.compliance.status.replace("_", " ")} ({selectedCycle.compliance.overallScore}/100)
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 4-Dimension Radar */}
                <Card>
                  <CardHeader><CardTitle className="text-base">4-Dimension Compliance Radar</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 } as object} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 } as object} />
                          <Radar name="Score" dataKey="score" stroke="#059669" fill="#059669" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Dimension Scores */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Dimension Scores</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <DimensionBar label="Timeliness" score={selectedCycle.compliance.timeliness} />
                    <DimensionBar label="Task Completion" score={selectedCycle.compliance.taskCompletion} />
                    <DimensionBar label="Input Compliance" score={selectedCycle.compliance.inputCompliance} />
                    <DimensionBar label="Cost vs SoF" score={selectedCycle.compliance.costVsSof} />
                    <div className="pt-3 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Cost Deviation</span>
                        <span className={`font-bold ${(selectedCycle.compliance.costDeviation || 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {selectedCycle.compliance.costDeviation > 0 ? "+" : ""}{selectedCycle.compliance.costDeviation}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 10 Touchpoint Scores */}
              {selectedCycle.compliance.touchpointScores?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">10-Touchpoint Breakdown</CardTitle>
                    <CardDescription>Self-verified farmer data entries scored on 4 dimensions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Workband</TableHead>
                          <TableHead className="text-center">Task</TableHead>
                          <TableHead className="text-center">Input</TableHead>
                          <TableHead className="text-center">Cost</TableHead>
                          <TableHead className="text-center">Timing</TableHead>
                          <TableHead className="text-center">Overall</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCycle.compliance.touchpointScores.map((tp, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-bold">{tp.workband_order || i + 1}</TableCell>
                            <TableCell className="font-medium">{tp.workband_name || `Touchpoint ${i + 1}`}</TableCell>
                            <TableCell className="text-center"><ScoreBadge score={tp.task_score} /></TableCell>
                            <TableCell className="text-center"><ScoreBadge score={tp.input_score} /></TableCell>
                            <TableCell className="text-center"><ScoreBadge score={tp.cost_score} /></TableCell>
                            <TableCell className="text-center"><ScoreBadge score={tp.timing_score} /></TableCell>
                            <TableCell className="text-center font-bold"><ScoreBadge score={tp.touchpoint_score} bold /></TableCell>
                            <TableCell><Badge variant="outline" className={`text-xs ${STATUS_COLORS[tp.status] || ""}`}>{tp.status?.replace("_", " ") || "--"}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Select a cycle from the Crop Cycles tab to view compliance analysis</CardContent></Card>
          )}
        </TabsContent>

        {/* ── Workband Execution Tab ── */}
        <TabsContent value="workbands">
          {selectedCycle ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{selectedCycle.farmerName} — Workband Execution Timeline</CardTitle>
                <CardDescription>Status, dates, and task completion for each workband in the cycle</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedCycle.workbands.length > 0 ? (
                  <div className="space-y-3">
                    {selectedCycle.workbands.map((wb, i) => (
                      <div key={wb.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                          wb.status === "completed" ? "bg-emerald-500" : wb.status === "in_progress" ? "bg-blue-500" : wb.status === "delayed" ? "bg-amber-500" : "bg-slate-300"
                        }`}>
                          {wb.status === "completed" ? "\u2713" : i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">Workband {i + 1}</span>
                            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[wb.status] || ""}`}>{wb.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {wb.startDate ? new Date(wb.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Not started"}
                            {wb.endDate ? ` - ${new Date(wb.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                            {" | "}Tasks: {wb.tasksCompleted}/{wb.taskCount}
                          </div>
                        </div>
                        <div className="w-32">
                          <Progress value={wb.completionPct} className="h-2" />
                          <span className="text-xs text-muted-foreground">{wb.completionPct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">No workband executions recorded for this cycle</div>
                )}

                {/* Harvest & Sales Summary */}
                {(selectedCycle.harvest || selectedCycle.sales) && (
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    {selectedCycle.harvest && (
                      <Card className="border-emerald-200 bg-emerald-50">
                        <CardContent className="pt-4">
                          <div className="text-xs text-muted-foreground uppercase mb-1">Harvest</div>
                          <div className="text-2xl font-extrabold">{selectedCycle.harvest.totalKg.toLocaleString("en-IN")} kg</div>
                          <div className="text-xs mt-1">
                            Yield: {selectedCycle.harvest.yieldPerHa} kg/ha |
                            Grade: {selectedCycle.harvest.qualityGrade || "--"} |
                            Achieved: {selectedCycle.harvest.achievedPct}%
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {selectedCycle.sales && (
                      <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="pt-4">
                          <div className="text-xs text-muted-foreground uppercase mb-1">Sales</div>
                          <div className="text-2xl font-extrabold">{formatRupees(selectedCycle.sales.totalValue)}</div>
                          <div className="text-xs mt-1">
                            Sold: {selectedCycle.sales.totalSold.toLocaleString("en-IN")} kg |
                            Avg: {formatRupees(selectedCycle.sales.avgPrice)}/kg
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Select a cycle to view workband execution</CardContent></Card>
          )}
        </TabsContent>

        {/* ── Deviations Tab ── */}
        <TabsContent value="deviations">
          {selectedCycle?.compliance?.deviations?.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{selectedCycle.farmerName} — PoP Deviations</CardTitle>
                <CardDescription>Where farmer execution deviated from Package of Practice norms</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dimension</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Expected (PoP)</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCycle.compliance.deviations.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">{d.dimension?.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{d.item}</TableCell>
                        <TableCell>{d.expected}</TableCell>
                        <TableCell>{d.actual}</TableCell>
                        <TableCell className="font-semibold">{d.variance}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${
                            d.severity === "high" ? "text-red-700 bg-red-50 border-red-200" :
                            d.severity === "medium" ? "text-amber-700 bg-amber-50 border-amber-200" :
                            "text-green-700 bg-green-50 border-green-200"
                          }`}>{d.severity}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              {selectedCycle ? "No deviations recorded for this cycle" : "Select a cycle to view deviations"}
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ── Multi-Activity Tab ── */}
        <TabsContent value="multiactivity">
          <div className="space-y-6">
            {/* Multi-Activity KPIs */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{"🐄"}</span>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Dairy</div>
                      <div className="text-xl font-extrabold">{data.multiActivity.dairy.herds} Herds</div>
                      <div className="text-xs">{data.multiActivity.dairy.animals} Animals | Income: {formatRupees(data.multiActivity.dairy.monthlyIncome)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-cyan-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{"🐟"}</span>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Fishery</div>
                      <div className="text-xl font-extrabold">{data.multiActivity.fishery.ponds} Ponds</div>
                      <div className="text-xs">{data.multiActivity.fishery.totalArea?.toFixed(1)} ha | Income: {formatRupees(data.multiActivity.fishery.monthlyIncome)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{"🍎"}</span>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Horticulture</div>
                      <div className="text-xl font-extrabold">{data.multiActivity.horticulture.orchards} Orchards</div>
                      <div className="text-xs">{data.multiActivity.horticulture.totalArea?.toFixed(1)} ha | {data.multiActivity.horticulture.totalPlants} plants</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dairy Records */}
            {data.multiActivity.dairy.records?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">{"🐄"} Dairy Herds</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer</TableHead>
                        <TableHead>Herd Name</TableHead>
                        <TableHead className="text-center">Animals</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.multiActivity.dairy.records.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.farmerName}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell className="text-center font-bold">{(r as { animalCount?: number }).animalCount ?? 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {data.multiActivity.dairy.animalTypes && Object.keys(data.multiActivity.dairy.animalTypes).length > 0 && (
                    <div className="flex gap-3 mt-3">
                      {Object.entries(data.multiActivity.dairy.animalTypes).map(([type, count]) => (
                        <Badge key={type} variant="outline" className="text-xs capitalize">{type}: {count}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Fishery Records */}
            {data.multiActivity.fishery.records?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">{"🐟"} Fishery Ponds</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer</TableHead>
                        <TableHead>Register</TableHead>
                        <TableHead className="text-center">Ponds</TableHead>
                        <TableHead className="text-right">Area (ha)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.multiActivity.fishery.records.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.farmerName}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell className="text-center font-bold">{(r as { pondCount?: number }).pondCount ?? 0}</TableCell>
                          <TableCell className="text-right">{((r as { totalArea?: number }).totalArea ?? 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Horticulture Records */}
            {data.multiActivity.horticulture.records?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">{"🍎"} Horticulture Orchards</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer</TableHead>
                        <TableHead>Orchard</TableHead>
                        <TableHead>Crop / Variety</TableHead>
                        <TableHead className="text-right">Area (ha)</TableHead>
                        <TableHead className="text-center">Plants</TableHead>
                        <TableHead>Infrastructure</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.multiActivity.horticulture.records.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.farmerName}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>{r.crop} {r.variety ? `(${r.variety})` : ""}</TableCell>
                          <TableCell className="text-right">{r.area?.toFixed(2)}</TableCell>
                          <TableCell className="text-center font-bold">{r.plants}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{r.infrastructure?.replace("_", " ")}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────

function KpiCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="text-xs text-muted-foreground uppercase">{label}</div>
            <div className={`text-xl font-extrabold ${color || ""}`}>{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DimensionBar({ label, score }: { label: string; score: number }) {
  const color = score >= 70 ? "text-emerald-700" : score >= 40 ? "text-amber-700" : "text-red-700";
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className={`font-bold ${color}`}>{score}/100</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );
}

function ScoreBadge({ score, bold }: { score: number; bold?: boolean }) {
  const color = score >= 70 ? "text-emerald-700" : score >= 40 ? "text-amber-700" : "text-red-700";
  return <span className={`text-sm ${bold ? "font-extrabold" : "font-semibold"} ${color}`}>{score ?? "--"}</span>;
}
