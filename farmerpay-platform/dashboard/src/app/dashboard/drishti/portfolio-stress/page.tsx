"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { runBankerPortfolio, formatCompact, type PortfolioStressResult } from "@/lib/drishti";
import { formatRupeesCompact } from "@/lib/api";
import DrishtiKpiCard from "@/components/drishti/DrishtiKpiCard";
import SmaMigrationMatrix from "@/components/drishti/SmaMigrationMatrix";
import InterventionTable from "@/components/drishti/InterventionTable";
import RecommendationList from "@/components/drishti/RecommendationList";

export default function PortfolioStress() {
  const [rainfall, setRainfall] = useState(-25);
  const [priceChange, setPriceChange] = useState(-10);
  const [temperature, setTemperature] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PortfolioStressResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("fp_token") || "";
      const res = await runBankerPortfolio(token, {
        scope: { district_id: 6 },
        shock_variables: { rainfall_deviation_pct: rainfall, price_change_pct: priceChange, temperature_deviation_celsius: temperature },
        computation_mode: "deterministic",
      });
      setResult(res);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Portfolio Stress Test</h1>
        <p className="text-sm text-slate-500">Simulate climate and market shocks across your lending portfolio</p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600">Rainfall Deviation: {rainfall}%</label>
              <input type="range" min={-50} max={0} step={5} value={rainfall} onChange={(e) => setRainfall(Number(e.target.value))} className="w-full mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Price Change: {priceChange}%</label>
              <input type="range" min={-30} max={0} step={5} value={priceChange} onChange={(e) => setPriceChange(Number(e.target.value))} className="w-full mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Temperature: +{temperature}°C</label>
              <input type="range" min={0} max={5} step={0.5} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full mt-1" />
            </div>
          </div>
          <Button onClick={handleRun} disabled={loading} className="w-full md:w-auto">{loading ? "Simulating..." : "🔬 Run Portfolio Stress Test"}</Button>
        </CardContent>
      </Card>

      {error && <Card className="border-red-200 bg-red-50"><CardContent className="pt-4"><p className="text-sm text-red-700">{error}</p></CardContent></Card>}

      {result && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DrishtiKpiCard title="Total Farmers" value={result.total_farmers || result.farmer_count} borderColor="border-l-blue-500" />
            <DrishtiKpiCard title="Total Outstanding" value={formatRupeesCompact(result.total_outstanding)} borderColor="border-l-slate-500" />
            <DrishtiKpiCard title="Projected NPAs" value={result.stress_impact.projected_npa_count}
              delta={{ value: `+${result.stress_impact.additional_npa_count}`, positive: false }}
              borderColor="border-l-red-500" />
            <DrishtiKpiCard title="Portfolio at Risk" value={`${result.stress_impact.portfolio_at_risk_pct}%`}
              subtitle={`VaR (95%): ${formatRupeesCompact(result.portfolio_var_95)}`}
              borderColor="border-l-amber-500" />
          </div>

          {/* SMA Migration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">SMA Migration Matrix</CardTitle></CardHeader>
              <CardContent><SmaMigrationMatrix migration={result.stress_impact.sma_migration} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Recommendations</CardTitle></CardHeader>
              <CardContent><RecommendationList recommendations={result.recommendations} /></CardContent>
            </Card>
          </div>

          {/* Intervention Table */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Intervention Candidates (Top {result.intervention_list?.length || 0})</CardTitle></CardHeader>
            <CardContent><InterventionTable farmers={result.intervention_list} /></CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
