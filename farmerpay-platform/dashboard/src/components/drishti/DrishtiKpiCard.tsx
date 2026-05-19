"use client";

import { Card, CardContent } from "@/components/ui/card";
import { HEALTH_COLORS } from "@/lib/drishti";

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  health?: string;
  borderColor?: string;
  delta?: { value: string; positive: boolean };
}

export default function DrishtiKpiCard({ title, value, subtitle, health, borderColor, delta }: Props) {
  const hc = health ? HEALTH_COLORS[health] : null;
  return (
    <Card className={`${borderColor ? `border-l-4 ${borderColor}` : ""}`}>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        <div className="flex items-end gap-2 mt-1">
          <p className="text-2xl font-extrabold text-slate-900">{value}</p>
          {delta && (
            <span className={`text-xs font-bold ${delta.positive ? "text-green-600" : "text-red-600"}`}>
              {delta.positive ? "↑" : "↓"} {delta.value}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        {hc && (
          <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-bold ${hc.bg} ${hc.text}`}>
            {(health || "").toUpperCase()}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
