"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";

const DEMO_ISSUES = [
  { id: 1, farmer: "Venkat Rao", type: "loan_default_risk", severity: "critical", status: "open", description: "3 EMIs overdue, crop failure reported. Needs banker restructuring.", openedAt: "2026-04-02" },
  { id: 2, farmer: "Suresh Reddy", type: "document_mismatch", severity: "high", status: "open", description: "Aadhaar address doesn't match farm location. Re-verification needed.", openedAt: "2026-04-05" },
  { id: 3, farmer: "Kiran Kumar", type: "insurance_claim_delay", severity: "medium", status: "acknowledged", description: "PMFBY claim filed 45 days ago, no response from insurer.", openedAt: "2026-03-20" },
  { id: 4, farmer: "Ramesh Kumar", type: "input_quality", severity: "low", status: "resolved", description: "Pesticide quality suspect from local dealer. Samples sent to lab.", openedAt: "2026-03-15" },
  { id: 5, farmer: "Lakshmi Devi", type: "fraud_suspicion", severity: "critical", status: "open", description: "Duplicate loan application detected at another branch.", openedAt: "2026-04-08" },
];

const severityBadge = (s: string) => {
  const m: Record<string, string> = {
    critical: "bg-red-100 text-red-800 border-red-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-green-100 text-green-800 border-green-200",
  };
  return <Badge variant="outline" className={m[s] || ""}>{s}</Badge>;
};

const statusBadge = (s: string) => {
  const icons: Record<string, React.ReactNode> = {
    open: <XCircle className="h-3 w-3" />,
    acknowledged: <Clock className="h-3 w-3" />,
    in_progress: <Clock className="h-3 w-3" />,
    resolved: <CheckCircle className="h-3 w-3" />,
  };
  const cls: Record<string, string> = {
    open: "bg-red-50 text-red-700 border-red-200",
    acknowledged: "bg-blue-50 text-blue-700 border-blue-200",
    in_progress: "bg-amber-50 text-amber-700 border-amber-200",
    resolved: "bg-green-50 text-green-700 border-green-200",
  };
  return <Badge variant="outline" className={`${cls[s] || ""} flex items-center gap-1`}>{icons[s]}{s}</Badge>;
};

export default function SathiIssuesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.has("demo");
  const [issues, setIssues] = useState(isDemo ? DEMO_ISSUES : []);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo) return;
    const token = localStorage.getItem("sathi_token");
    if (!token) { router.push("/login"); return; }
    apiGet("/sathi/issues", token)
      .then((r) => { if (Array.isArray(r.data)) setIssues(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemo, router]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading issues...</div>;

  const openCount = issues.filter((i) => i.status !== "resolved").length;
  const criticalCount = issues.filter((i) => i.severity === "critical").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Issues Flagged to Banker</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{issues.length}</p>
          <p className="text-xs text-slate-500">Total</p>
        </CardContent></Card>
        <Card className="border-red-200"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{openCount}</p>
          <p className="text-xs text-slate-500">Open</p>
        </CardContent></Card>
        <Card className="border-amber-200"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{criticalCount}</p>
          <p className="text-xs text-slate-500">Critical</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Issue Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farmer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell className="font-medium">{issue.farmer}</TableCell>
                  <TableCell className="text-xs">{issue.type.replace(/_/g, " ")}</TableCell>
                  <TableCell>{severityBadge(issue.severity)}</TableCell>
                  <TableCell>{statusBadge(issue.status)}</TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-[280px] truncate">{issue.description}</TableCell>
                  <TableCell className="text-xs text-slate-500">{issue.openedAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
