"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ShieldAlert, AlertTriangle, TrendingDown, Ban, Skull } from "lucide-react";
import { apiGet, formatRupees, formatRupeesCompact } from "@/lib/api";

// SMA/NPA categories per RBI IRACP norms
const SMA_CATEGORIES = [
  { key: "standard", label: "Standard", dpd: "0 days", color: "#16a34a", bg: "bg-green-50", text: "text-green-700", icon: "✅" },
  { key: "sma_0", label: "SMA-0", dpd: "1-30 days", color: "#ca8a04", bg: "bg-yellow-50", text: "text-yellow-700", icon: "⚠️" },
  { key: "sma_1", label: "SMA-1", dpd: "31-60 days", color: "#ea580c", bg: "bg-orange-50", text: "text-orange-700", icon: "🔶" },
  { key: "sma_2", label: "SMA-2", dpd: "61-90 days", color: "#dc2626", bg: "bg-red-50", text: "text-red-700", icon: "🔴" },
];

const NPA_CATEGORIES = [
  { key: "sub_standard", label: "Sub-Standard", dpd: "90-365 days", provision: "15%", color: "#dc2626", icon: "🟥" },
  { key: "doubtful_d1", label: "Doubtful (D1)", dpd: "1-2 years", provision: "25-40%", color: "#b91c1c", icon: "⬛" },
  { key: "doubtful_d2", label: "Doubtful (D2)", dpd: "2-3 years", provision: "40-100%", color: "#991b1b", icon: "⬛" },
  { key: "doubtful_d3", label: "Doubtful (D3)", dpd: "3+ years", provision: "100%", color: "#7f1d1d", icon: "⬛" },
  { key: "loss", label: "Loss", dpd: "Irrecoverable", provision: "100%", color: "#450a0a", icon: "💀" },
];

export default function AssetQualityPage() {
  const [loading, setLoading] = useState(true);
  const [portfolioData, setPortfolioData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("fp_token") || "";
        const overview = await apiGet("/banker/portfolio/overview", token);
        setPortfolioData(overview.data || {});
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Mock SMA/NPA distribution (in production, this comes from SENTINEL APIs)
  const smaDistribution = [
    { name: "Standard", count: portfolioData?.totalFarmers || 0, amount: portfolioData?.totalLoanOutstanding || 0, color: "#16a34a" },
    { name: "SMA-0", count: 0, amount: 0, color: "#ca8a04" },
    { name: "SMA-1", count: 0, amount: 0, color: "#ea580c" },
    { name: "SMA-2", count: 0, amount: 0, color: "#dc2626" },
  ];

  const npaDistribution = [
    { name: "Sub-Standard", count: 0, amount: 0, color: "#dc2626" },
    { name: "Doubtful D1", count: 0, amount: 0, color: "#b91c1c" },
    { name: "Doubtful D2", count: 0, amount: 0, color: "#991b1b" },
    { name: "Doubtful D3", count: 0, amount: 0, color: "#7f1d1d" },
    { name: "Loss", count: 0, amount: 0, color: "#450a0a" },
  ];

  const totalAccounts = smaDistribution.reduce((s, d) => s + d.count, 0) + npaDistribution.reduce((s, d) => s + d.count, 0);
  const totalNPA = npaDistribution.reduce((s, d) => s + d.count, 0);
  const npaPercent = totalAccounts > 0 ? ((totalNPA / totalAccounts) * 100).toFixed(1) : "0.0";

  const pieData = [...smaDistribution, ...npaDistribution].filter(d => d.count > 0);
  if (pieData.length === 0) pieData.push({ name: "Standard", count: 1, amount: 0, color: "#16a34a" });

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading asset quality data...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Asset Quality Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">SMA & NPA Classification per RBI IRACP Norms</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Accounts</p>
            <p className="text-3xl font-extrabold text-slate-900">{totalAccounts}</p>
            <p className="text-xs text-slate-400">Active portfolio</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">Standard</p>
            <p className="text-3xl font-extrabold text-green-600">{smaDistribution[0].count}</p>
            <p className="text-xs text-slate-400">0 DPD — Performing</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">SMA (Watchlist)</p>
            <p className="text-3xl font-extrabold text-yellow-600">{smaDistribution.slice(1).reduce((s, d) => s + d.count, 0)}</p>
            <p className="text-xs text-slate-400">1-90 DPD — Stress signals</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">Gross NPA</p>
            <p className="text-3xl font-extrabold text-red-600">{totalNPA}</p>
            <p className="text-xs text-slate-400">{npaPercent}% of portfolio</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-800">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">NPA Amount</p>
            <p className="text-3xl font-extrabold text-slate-900">{formatRupeesCompact(npaDistribution.reduce((s, d) => s + d.amount, 0))}</p>
            <p className="text-xs text-slate-400">Provision required</p>
          </CardContent>
        </Card>
      </div>

      {/* SMA Classification Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" /> SMA Classification (Special Mention Accounts)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>DPD Range</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
                <TableHead className="text-right">Outstanding Amount</TableHead>
                <TableHead className="text-right">% of Portfolio</TableHead>
                <TableHead>Action Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SMA_CATEGORIES.map((cat) => {
                const data = smaDistribution.find(d => d.name.toLowerCase().replace("-", "_").includes(cat.key)) || { count: 0, amount: 0 };
                const pct = totalAccounts > 0 ? ((data.count / totalAccounts) * 100).toFixed(1) : "0.0";
                return (
                  <TableRow key={cat.key}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <Badge variant="outline" className={`${cat.bg} ${cat.text} border-0 font-bold`}>{cat.label}</Badge>
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500">{cat.dpd}</TableCell>
                    <TableCell className="text-right font-bold">{data.count}</TableCell>
                    <TableCell className="text-right font-semibold">{formatRupees(data.amount)}</TableCell>
                    <TableCell className="text-right">{pct}%</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {cat.key === "standard" ? "Regular monitoring" :
                       cat.key === "sma_0" ? "Proactive follow-up" :
                       cat.key === "sma_1" ? "Intensive monitoring + field visit" :
                       "Immediate intervention required"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* NPA Sub-Categories Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" /> NPA Classification (Non-Performing Assets)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>DPD / Duration</TableHead>
                <TableHead>Provisioning</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Provision Amount</TableHead>
                <TableHead>Recovery Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {NPA_CATEGORIES.map((cat) => {
                const data = npaDistribution.find(d => d.name.toLowerCase().replace(" ", "_").includes(cat.key.split("_")[0])) || { count: 0, amount: 0 };
                return (
                  <TableRow key={cat.key}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span className="font-bold text-red-700">{cat.label}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500">{cat.dpd}</TableCell>
                    <TableCell><Badge variant="destructive" className="text-xs">{cat.provision}</Badge></TableCell>
                    <TableCell className="text-right font-bold">{data.count}</TableCell>
                    <TableCell className="text-right font-semibold">{formatRupees(data.amount)}</TableCell>
                    <TableCell className="text-right text-red-600 font-semibold">{formatRupees(data.amount * (parseInt(cat.provision) / 100))}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {cat.key === "sub_standard" ? "Early recovery" :
                       cat.key.includes("doubtful") ? "Legal / SARFAESI" :
                       "Write-off recommended"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wide">Portfolio Composition</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wide">Provisioning Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-4">
              {NPA_CATEGORIES.map((cat) => (
                <div key={cat.key} className="flex items-center gap-3">
                  <span className="text-xs font-semibold w-28 text-slate-600">{cat.label}</span>
                  <div className="flex-1">
                    <Progress value={parseInt(cat.provision)} className="h-3" />
                  </div>
                  <span className="text-xs font-bold text-red-600 w-12 text-right">{cat.provision}</span>
                </div>
              ))}
              <div className="pt-2 border-t text-xs text-slate-500">
                Provisioning norms as per RBI Master Circular on IRACP. Higher provision = greater impact on bank profitability.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
