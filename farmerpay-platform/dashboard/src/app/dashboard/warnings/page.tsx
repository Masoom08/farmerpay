"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, AlertCircle, CheckCircle, Siren } from "lucide-react";
import { apiGet, formatRupees } from "@/lib/api";

// The backend bankerAnalyticsService.earlyWarnings() returns this shape.
// `distressContext` is only present on `distress_sale_risk` rows (PULSE Phase 2).
interface DistressContext {
  cropName: string;
  cycleUuid: string;
  costPerQtl: number;
  currentMandiPrice: number;
  estimatedLoss: number;
  nextEmiDueDate: string;
  nextEmiAmount: number;
  daysToEmi: number;
}

interface Warning {
  farmerId: number;
  farmerName: string;
  type: string;
  severity: string;
  message: string;
  loanAmount?: number;
  distressContext?: DistressContext;
}

export default function WarningsPage() {
  const router = useRouter();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("fp_token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        // Fixed endpoint: was `/banker/early-warnings` (404) — the actual
        // route is `/banker/portfolio/early-warnings`, served by
        // bankerController.getEarlyWarnings.
        const res = await apiGet("/banker/portfolio/early-warnings", token!);
        setWarnings(res.data || []);
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "UNAUTHORIZED") {
          localStorage.removeItem("fp_token");
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const severityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
      case "high":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {severity}
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            {severity}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {severity}
          </Badge>
        );
    }
  };

  const distressRows = warnings.filter(
    (w) => w.type === "distress_sale_risk" && w.distressContext,
  );
  const otherRows = warnings.filter(
    (w) => !(w.type === "distress_sale_risk" && w.distressContext),
  );

  const critical = warnings.filter(
    (w) => w.severity.toLowerCase() === "critical" || w.severity.toLowerCase() === "high",
  ).length;
  const medium = warnings.filter(
    (w) => w.severity.toLowerCase() === "medium",
  ).length;
  const low = warnings.filter(
    (w) =>
      w.severity.toLowerCase() !== "critical" &&
      w.severity.toLowerCase() !== "high" &&
      w.severity.toLowerCase() !== "medium",
  ).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Early Warnings</h1>
        <Card>
          <CardContent className="p-6">
            <div className="skeleton h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
        Early Warnings
        <span className="text-sm font-normal text-slate-500">
          ({warnings.length} active
          {distressRows.length > 0 && (
            <>, <span className="text-red-600 font-semibold">{distressRows.length} at distress-sale risk</span></>
          )}
          )
        </span>
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-hover border-red-100">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Critical / High</p>
                <p className="text-2xl font-bold text-red-600">{critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover border-amber-100">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Medium</p>
                <p className="text-2xl font-bold text-amber-600">{medium}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover border-blue-100">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Low / Info</p>
                <p className="text-2xl font-bold text-blue-600">{low}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PULSE Phase 2 — distress_sale_risk rich cards.
          These jump the queue because a banker can intervene BEFORE the
          farmer sells at a loss to cover their EMI. Ported from the
          vanilla HTML dashboard's renderWarningCard distress branch. */}
      {distressRows.length > 0 && (
        <div className="space-y-3">
          {distressRows.map((w) => {
            const c = w.distressContext!;
            return (
              <Card
                key={`distress-${w.farmerId}`}
                className="border-red-600 border-l-4 bg-red-50"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Badge className="bg-red-600 text-white hover:bg-red-700 text-xs font-bold">
                        <Siren className="w-3 h-3 mr-1" />
                        DISTRESS RISK
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-black text-red-700">
                        {w.farmerName}
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-1">
                        {c.cropName} ready · EMI {formatRupees(c.nextEmiAmount)} due in {c.daysToEmi} days
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="bg-white px-3 py-1 rounded-md text-xs font-bold text-slate-700 border border-slate-200">
                          Cost: {formatRupees(c.costPerQtl)}/qtl
                        </span>
                        <span className="bg-white px-3 py-1 rounded-md text-xs font-bold text-red-700 border border-red-200">
                          Price: {formatRupees(c.currentMandiPrice)}/qtl
                        </span>
                        <span className="bg-red-600 text-white px-3 py-1 rounded-md text-xs font-black">
                          Loss: ≈{formatRupees(c.estimatedLoss)}
                        </span>
                      </div>
                    </div>
                    {w.loanAmount !== undefined && (
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs text-slate-500">Loan amount</div>
                        <div className="text-base font-bold text-slate-900">
                          {formatRupees(w.loanAmount)}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Other warnings table (compliance_off_track, cost_overrun, inactivity, etc.) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Other Warnings ({otherRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {otherRows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">Loan Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherRows.map((w, i) => (
                  <TableRow key={`${w.farmerId}-${w.type}-${i}`}>
                    <TableCell className="font-medium">
                      {w.farmerName || `Farmer #${w.farmerId}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {w.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{severityBadge(w.severity)}</TableCell>
                    <TableCell className="max-w-md text-sm text-slate-600">
                      {w.message}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {w.loanAmount !== undefined ? formatRupees(w.loanAmount) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {distressRows.length > 0
                  ? "No other warnings — review the distress-sale risks above."
                  : "No active warnings. Your portfolio is looking healthy."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
