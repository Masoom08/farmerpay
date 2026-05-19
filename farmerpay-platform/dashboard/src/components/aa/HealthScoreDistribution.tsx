"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

interface Props {
  gradeDistribution: Array<{ health_grade: string; count: number }>;
}

const GRADE_COLORS: Record<string, string> = {
  A: "#16a34a",
  B: "#65a30d",
  C: "#ca8a04",
  D: "#ea580c",
  E: "#dc2626",
};

export default function HealthScoreDistribution({ gradeDistribution }: Props) {
  if (!gradeDistribution || gradeDistribution.length === 0) {
    return <p className="text-sm text-slate-400">No score data</p>;
  }

  const ordered = ["A", "B", "C", "D", "E"]
    .map(g => gradeDistribution.find(d => d.health_grade === g) || { health_grade: g, count: 0 });

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={ordered} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="health_grade" tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <Tooltip
            formatter={(v: any) => [v, "Farmers"]}
            contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
            {ordered.map((entry, i) => (
              <Cell key={i} fill={GRADE_COLORS[entry.health_grade] || "#94a3b8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
