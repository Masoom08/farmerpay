"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Props {
  data: Array<{ branch: string; consentRate: number; total: number }>;
}

export default function AAAdoptionChart({ data }: Props) {
  if (!data || data.length === 0) return <p className="text-sm text-slate-400">No branch data</p>;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" />
          <YAxis dataKey="branch" type="category" tick={{ fontSize: 11, fill: "#64748b" }} width={70} />
          <Tooltip
            formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Consent Rate"]}
            contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
          />
          <Bar dataKey="consentRate" fill="#16a34a" radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
