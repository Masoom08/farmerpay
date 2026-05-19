"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatRupeesCompact } from "@/lib/api";
import { HEALTH_COLORS, type InterventionCandidate } from "@/lib/drishti";

function HealthBadge({ status }: { status: string }) {
  const c = HEALTH_COLORS[status] || HEALTH_COLORS.good;
  return <Badge className={`${c.bg} ${c.text} border-0`}>{status.toUpperCase()}</Badge>;
}

export default function InterventionTable({ farmers }: { farmers: InterventionCandidate[] }) {
  if (!farmers || farmers.length === 0) return <p className="text-sm text-slate-400">No farmers flagged for intervention</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Farmer</TableHead>
          <TableHead className="text-right">Outstanding</TableHead>
          <TableHead>Current</TableHead>
          <TableHead>Projected</TableHead>
          <TableHead className="text-right">Risk</TableHead>
          <TableHead className="text-right">Income Δ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {farmers.slice(0, 20).map((f) => (
          <TableRow key={f.farmer_id}>
            <TableCell className="font-medium">Farmer #{f.farmer_id}</TableCell>
            <TableCell className="text-right">{formatRupeesCompact(f.outstanding)}</TableCell>
            <TableCell><HealthBadge status={f.current_status} /></TableCell>
            <TableCell><HealthBadge status={f.projected_status} /></TableCell>
            <TableCell className="text-right font-bold">{f.risk_score}</TableCell>
            <TableCell className={`text-right font-semibold ${f.income_change < 0 ? "text-red-600" : "text-green-600"}`}>
              {formatRupeesCompact(f.income_change)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
