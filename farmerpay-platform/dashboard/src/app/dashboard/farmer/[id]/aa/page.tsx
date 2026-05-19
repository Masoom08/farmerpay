"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ArrowLeft, Clock } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import {
  getFarmerAnalysis, getFarmerTransactions, refreshFarmerAnalysis,
  gradeColor, gradeBg, COMPONENT_LABELS, SEVERITY_COLORS,
  type FarmerAnalysis, type ClassifiedTransaction, type RiskFlag,
} from "@/lib/aa";
import { cn } from "@/lib/utils";
import RiskFlagTimeline from "@/components/aa/RiskFlagTimeline";
import TransactionClassTable from "@/components/aa/TransactionClassTable";

export default function FarmerAADetailPage() {
  const router = useRouter();
  const params = useParams();
  const farmerId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState<FarmerAnalysis | null>(null);
  const [transactions, setTransactions] = useState<ClassifiedTransaction[]>([]);
  const [txnTotal, setTxnTotal] = useState(0);
  const [txnPage, setTxnPage] = useState(1);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("fp_token");
    if (!token) { router.push("/login"); return; }

    async function load() {
      try {
        const [analysisRes, txnRes] = await Promise.all([
          getFarmerAnalysis(farmerId, token!),
          getFarmerTransactions(farmerId, token!),
        ]);
        setAnalysis(analysisRes);
        setTransactions(txnRes.data);
        setTxnTotal(txnRes.meta.total);
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
  }, [farmerId, router]);

  const loadTransactions = useCallback(async (page: number, type: string | null, category: string | null) => {
    const token = localStorage.getItem("fp_token") || "";
    const params: Record<string, any> = { page };
    if (type) params.type = type;
    if (category) params.category = category;
    const res = await getFarmerTransactions(farmerId, token, params);
    setTransactions(res.data);
    setTxnTotal(res.meta.total);
    setTxnPage(page);
  }, [farmerId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem("fp_token") || "";
      const res = await refreshFarmerAnalysis(farmerId, token);
      setAnalysis(res);
    } catch { /* ignore */ }
    setRefreshing(false);
  };

  const handleFilterType = (type: string | null) => {
    setFilterType(type);
    loadTransactions(1, type, filterCategory);
  };

  const handleFilterCategory = (cat: string | null) => {
    setFilterCategory(cat);
    loadTransactions(1, filterType, cat);
  };

  const handlePageChange = (page: number) => {
    loadTransactions(page, filterType, filterCategory);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-slate-100 rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="space-y-4">
        <Link href={`/dashboard/farmer/${farmerId}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Back to farmer
        </Link>
        <div className="text-center py-20">
          <p className="text-lg text-slate-400">No AA analysis found for this farmer</p>
          <p className="text-sm text-slate-400 mt-2">The farmer has not connected their bank via Account Aggregator.</p>
        </div>
      </div>
    );
  }

  const riskFlags: RiskFlag[] = (analysis as any).riskFlags || (analysis as any).risk_flags || [];

  // Seasonality monthly data for chart
  const monthlyData = buildSeasonalityChartData(analysis);
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/farmer/${farmerId}`} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Financial Health — Farmer #{farmerId}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-400">
                Last updated: {analysis.createdAt ? new Date(analysis.createdAt).toLocaleString() : "Unknown"}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {analysis.analysisMode === "raw_transactions" ? "Full Analysis" : "Summary Mode"}
              </Badge>
              {analysis.stale ? <Badge variant="destructive" className="text-[10px]">Stale</Badge> : null}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Score + Components */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Score Card */}
        <Card className="lg:row-span-2">
          <CardContent className="p-6 flex flex-col items-center justify-center h-full">
            <div className="relative w-32 h-32 mb-3">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={gradeColor(analysis.grade)} strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - analysis.score / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color: gradeColor(analysis.grade) }}>{Math.round(analysis.score)}</span>
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", gradeBg(analysis.grade))}>
                  Grade {analysis.grade}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400">{analysis.transactionCount || 0} transactions analyzed</p>
          </CardContent>
        </Card>

        {/* 6 Components */}
        {Object.entries(analysis.components || {}).map(([key, comp]) => {
          const meta = COMPONENT_LABELS[key];
          if (!meta) return null;
          return (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">{meta.label}</span>
                  <span className="text-[10px] text-slate-400">{meta.weight}%</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: gradeColor(comp.score >= 80 ? "A" : comp.score >= 65 ? "B" : comp.score >= 50 ? "C" : comp.score >= 35 ? "D" : "E") }}>
                  {Math.round(comp.score)}
                </p>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div className="h-1.5 rounded-full" style={{ width: `${comp.score}%`, backgroundColor: gradeColor(comp.score >= 65 ? "B" : comp.score >= 35 ? "D" : "E") }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Seasonality Chart */}
      {monthlyData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">12-Month Seasonality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "11px" }} />
                  <Bar dataKey="income" fill="rgba(45,134,89,0.75)" radius={[2, 2, 0, 0]} barSize={14} name="Income" />
                  <Bar dataKey="expense" fill="rgba(198,40,40,0.6)" radius={[2, 2, 0, 0]} barSize={14} name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Risk Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Risk Flags</CardTitle>
        </CardHeader>
        <CardContent>
          <RiskFlagTimeline flags={riskFlags} />
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Classified Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionClassTable
            transactions={transactions}
            total={txnTotal}
            page={txnPage}
            onPageChange={handlePageChange}
            onFilterType={handleFilterType}
            onFilterCategory={handleFilterCategory}
            activeType={filterType}
            activeCategory={filterCategory}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function buildSeasonalityChartData(analysis: FarmerAnalysis) {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const drishti = analysis.drishtiInputs;
  if (drishti?.monthlyIncomeMap) {
    return Object.entries(drishti.monthlyIncomeMap).map(([m, data]: [string, any]) => ({
      month: MONTHS[(parseInt(m) - 1) % 12],
      income: Math.round(data?.totalCredits || 0),
      expense: Math.round(data?.totalDebits || 0),
    }));
  }
  return [];
}
