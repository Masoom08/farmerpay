"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SmaMigration } from "@/lib/drishti";

const CELLS: { label: string; key: keyof SmaMigration; color: string }[] = [
  { label: "Good → Watch", key: "good_to_watch", color: "text-amber-600" },
  { label: "Good → Stressed", key: "good_to_stressed", color: "text-red-500" },
  { label: "Good → NPA", key: "good_to_npa", color: "text-red-700" },
  { label: "Watch → Stressed", key: "watch_to_stressed", color: "text-red-500" },
  { label: "Watch → NPA", key: "watch_to_npa", color: "text-red-700" },
  { label: "Stressed → NPA", key: "stressed_to_npa", color: "text-red-700" },
  { label: "Improved", key: "improved", color: "text-green-600" },
  { label: "No Change", key: "no_change", color: "text-slate-500" },
];

export default function SmaMigrationMatrix({ migration }: { migration: SmaMigration }) {
  if (!migration) return null;
  return (
    <Table>
      <TableHeader>
        <TableRow><TableHead>Transition</TableHead><TableHead className="text-right">Farmers</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {CELLS.filter((c) => migration[c.key] > 0).map((c) => (
          <TableRow key={c.key}>
            <TableCell className="font-medium">{c.label}</TableCell>
            <TableCell className={`text-right font-bold ${c.color}`}>{migration[c.key]}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
