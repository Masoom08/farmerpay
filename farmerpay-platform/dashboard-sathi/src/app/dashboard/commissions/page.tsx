"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { IndianRupee } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatRupees, formatRupeesCompact } from "@/lib/api";

const DEMO_COMMISSIONS = [
  { period: "2026-04", gross: 71750, commission: 14350, events: 12, status: "accrued" },
  { period: "2026-03", gross: 185000, commission: 37000, events: 28, status: "approved" },
  { period: "2026-02", gross: 142000, commission: 28400, events: 21, status: "paid" },
  { period: "2026-01", gross: 98000, commission: 19600, events: 15, status: "paid" },
  { period: "2025-12", gross: 65000, commission: 13000, events: 11, status: "paid" },
  { period: "2025-11", gross: 82000, commission: 16400, events: 14, status: "paid" },
];

const payoutBadge = (s: string) => {
  const m: Record<string, string> = {
    accrued: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-green-50 text-green-700 border-green-200",
  };
  return <Badge variant="outline" className={m[s] || ""}>{s}</Badge>;
};

export default function SathiCommissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.has("demo");
  const [commissions, setCommissions] = useState(isDemo ? DEMO_COMMISSIONS : []);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo) return;
    const token = localStorage.getItem("sathi_token");
    if (!token) { router.push("/login"); return; }
    apiGet("/sathi/commissions", token)
      .then((r) => { if (Array.isArray(r.data)) setCommissions(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemo, router]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading commissions...</div>;

  const totalCommission = commissions.reduce((acc, c) => acc + c.commission, 0);
  const totalPaid = commissions.filter((c) => c.status === "paid").reduce((acc, c) => acc + c.commission, 0);
  const totalPending = totalCommission - totalPaid;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Commissions</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">Total Earned</p>
          <p className="text-2xl font-bold mt-1">{formatRupeesCompact(totalCommission)}</p>
          <p className="text-xs text-muted-foreground">20% of FP per-farmer revenue</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">Paid Out</p>
          <p className="text-2xl font-bold mt-1 text-green-700">{formatRupeesCompact(totalPaid)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">Pending</p>
          <p className="text-2xl font-bold mt-1 text-amber-700">{formatRupeesCompact(totalPending)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <IndianRupee className="h-4 w-4" /> Commission Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commissions.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} formatter={(v) => formatRupees(Number(v) || 0)} />
                <Bar dataKey="commission" fill="#059669" radius={[4, 4, 0, 0]} name="Commission" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Gross Revenue</TableHead>
                <TableHead className="text-right">Commission (20%)</TableHead>
                <TableHead className="text-right">Events</TableHead>
                <TableHead>Payout Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((c) => (
                <TableRow key={c.period}>
                  <TableCell className="font-medium">{c.period}</TableCell>
                  <TableCell className="text-right text-sm">{formatRupees(c.gross)}</TableCell>
                  <TableCell className="text-right text-sm font-semibold text-green-700">{formatRupees(c.commission)}</TableCell>
                  <TableCell className="text-right text-sm">{c.events}</TableCell>
                  <TableCell>{payoutBadge(c.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
