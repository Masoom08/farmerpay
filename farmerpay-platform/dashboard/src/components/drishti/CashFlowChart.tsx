"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from "recharts";
import type { CashFlowMonth } from "@/lib/drishti";

export default function CashFlowChart({ data }: { data: CashFlowMonth[] }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((m) => ({
    month: m.monthName || m.month?.slice(5),
    Inflows: m.inflows?.total || 0,
    Outflows: -(m.outflows?.total || 0),
    Cumulative: m.cumulative || 0,
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData}>
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(v) => `₹${Math.round(Number(v) || 0).toLocaleString("en-IN")}`} />
          <Legend />
          <Bar dataKey="Inflows" fill="rgba(45,134,89,0.75)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Outflows" fill="rgba(198,40,40,0.6)" radius={[3, 3, 0, 0]} />
          <Line type="monotone" dataKey="Cumulative" stroke="#2196f3" strokeWidth={2} dot={{ r: 3 }} yAxisId={0} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
