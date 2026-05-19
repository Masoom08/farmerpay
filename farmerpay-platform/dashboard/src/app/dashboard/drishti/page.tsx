"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTemplates, ENGINE_LABELS, type ScenarioTemplate } from "@/lib/drishti";

const ENGINE_ICONS: Record<string, string> = {
  pre_loan: "🏦", household_portfolio: "🏠", climate_stress: "🌧️",
  insurance: "🛡️", market_timing: "📈", banker_portfolio: "📊",
};

export default function DrishtiOverview() {
  const [templates, setTemplates] = useState<ScenarioTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("fp_token") || "";
    getTemplates(token).then(setTemplates).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const grouped = templates.reduce<Record<string, ScenarioTemplate[]>>((acc, t) => {
    (acc[t.engine_type] = acc[t.engine_type] || []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">DRISHTI — Scenario Engine</h1>
        <p className="text-sm text-slate-500">Digital Twin — run what-if simulations for farmers and portfolios</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/drishti/portfolio-stress">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-red-500">
            <CardContent className="pt-4 pb-3">
              <p className="text-lg font-bold">📊 Portfolio Stress Test</p>
              <p className="text-xs text-slate-500 mt-1">Test your portfolio against drought, price crash, or combined shocks</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/drishti/compare">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
            <CardContent className="pt-4 pb-3">
              <p className="text-lg font-bold">⚖️ Compare Scenarios</p>
              <p className="text-xs text-slate-500 mt-1">Side-by-side comparison of scenario runs with delta analysis</p>
            </CardContent>
          </Card>
        </Link>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-lg font-bold">📋 {templates.length} Templates</p>
            <p className="text-xs text-slate-500 mt-1">Pre-built scenarios across {Object.keys(grouped).length} engines</p>
          </CardContent>
        </Card>
      </div>

      {/* Templates by Engine */}
      {loading ? (
        <p className="text-slate-400">Loading templates...</p>
      ) : (
        Object.entries(grouped).map(([engine, tpls]) => (
          <Card key={engine}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {ENGINE_ICONS[engine] || "⚙️"} {ENGINE_LABELS[engine] || engine}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tpls.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-sm font-semibold text-slate-800">{t.template_name}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
