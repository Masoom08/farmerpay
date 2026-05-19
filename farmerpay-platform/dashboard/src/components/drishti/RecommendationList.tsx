"use client";

import type { Recommendation } from "@/lib/drishti";

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  verdict: { bg: "bg-green-50", border: "border-l-green-600", icon: "✅" },
  strength: { bg: "bg-green-50", border: "border-l-green-500", icon: "💪" },
  action: { bg: "bg-blue-50", border: "border-l-blue-500", icon: "👉" },
  warning: { bg: "bg-amber-50", border: "border-l-amber-500", icon: "⚠️" },
  info: { bg: "bg-slate-50", border: "border-l-slate-400", icon: "ℹ️" },
};

export default function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  if (!recommendations || recommendations.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-slate-700">Recommendations</h4>
      {recommendations.map((rec, i) => {
        const s = TYPE_STYLES[rec.type] || TYPE_STYLES.info;
        return (
          <div key={i} className={`p-3 rounded-lg border-l-4 ${s.bg} ${s.border}`}>
            <p className="text-sm text-slate-700">{s.icon} {rec.message}</p>
          </div>
        );
      })}
    </div>
  );
}
