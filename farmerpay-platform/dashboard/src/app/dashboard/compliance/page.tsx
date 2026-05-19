"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

interface ConsentItem {
  type: string;
  status: string;
  grantedAt?: string;
  expiresAt?: string;
}

interface Grievance {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
}

const DLG_CHECKLIST = [
  { item: "Digital lending app registered with RBI", status: "compliant" },
  { item: "FLDG capped at 5% of loan portfolio", status: "compliant" },
  { item: "Loan disbursement directly to borrower account", status: "compliant" },
  { item: "Key Fact Statement shared before sanction", status: "compliant" },
  { item: "Cooling-off period for loan cancellation", status: "compliant" },
  { item: "Transparent fee disclosure", status: "compliant" },
  { item: "Data privacy consent management", status: "compliant" },
  { item: "Grievance redressal mechanism in place", status: "compliant" },
  { item: "Fair practice code published", status: "review" },
  { item: "Annual audit of DLG arrangements", status: "compliant" },
  { item: "Customer communication standards met", status: "compliant" },
];

export default function CompliancePage() {
  const router = useRouter();
  const [consents, setConsents] = useState<ConsentItem[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("fp_token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        const [consentRes, grievanceRes] = await Promise.allSettled([
          apiGet("/compliance/consent", token!),
          apiGet("/compliance/grievance", token!),
        ]);

        if (consentRes.status === "fulfilled") {
          setConsents(consentRes.value.data || consentRes.value || []);
        }
        if (grievanceRes.status === "fulfilled") {
          setGrievances(grievanceRes.value.data || grievanceRes.value || []);
        }
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

  async function handleConsentAction(type: string, action: "grant" | "revoke") {
    const token = localStorage.getItem("fp_token");
    if (!token) return;

    setActionLoading(`${type}-${action}`);
    try {
      await apiPost(`/compliance/consent/${action}`, { type }, token);
      setConsents((prev) =>
        prev.map((c) =>
          c.type === type
            ? { ...c, status: action === "grant" ? "granted" : "revoked" }
            : c
        )
      );
    } catch {
      // Silently handle - could add toast notification
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">RBI Compliance</h1>
        <Card>
          <CardContent className="p-6">
            <div className="skeleton h-4 w-48 mb-3" />
            <div className="skeleton h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">RBI Compliance</h1>

      {/* Consent Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Consent Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consent Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Granted At</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consents.map((c) => (
                  <TableRow key={c.type}>
                    <TableCell className="font-medium">{c.type}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          c.status === "granted"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {c.status === "granted" ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {c.grantedAt
                        ? new Date(c.grantedAt).toLocaleDateString("en-IN")
                        : "--"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString("en-IN")
                        : "--"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          disabled={
                            c.status === "granted" ||
                            actionLoading === `${c.type}-grant`
                          }
                          onClick={() => handleConsentAction(c.type, "grant")}
                        >
                          Grant
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          disabled={
                            c.status === "revoked" ||
                            actionLoading === `${c.type}-revoke`
                          }
                          onClick={() => handleConsentAction(c.type, "revoke")}
                        >
                          Revoke
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-400 py-4 text-center">
              No consent records found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Grievance Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Grievance Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          {grievances.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Resolved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grievances.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-xs">
                      {g.id}
                    </TableCell>
                    <TableCell className="font-medium">{g.subject}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          g.status === "resolved"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : g.status === "in_progress"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }
                      >
                        {g.status === "resolved" ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <Clock className="w-3 h-3 mr-1" />
                        )}
                        {g.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(g.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {g.resolvedAt
                        ? new Date(g.resolvedAt).toLocaleDateString("en-IN")
                        : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-400 py-4 text-center">
              No grievances recorded
            </p>
          )}
        </CardContent>
      </Card>

      {/* RBI DLG Compliance Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-600" />
            RBI DLG Compliance Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DLG_CHECKLIST.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      item.status === "compliant"
                        ? "bg-green-100"
                        : "bg-amber-100"
                    }`}
                  >
                    {item.status === "compliant" ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <span className="text-sm text-slate-700">{item.item}</span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    item.status === "compliant"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }
                >
                  {item.status === "compliant" ? "Compliant" : "Under Review"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
