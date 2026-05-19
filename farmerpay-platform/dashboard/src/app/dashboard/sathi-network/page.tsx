"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  HandHelping, Users, AlertTriangle, CheckCircle, Clock, XCircle, Phone, MapPin,
} from "lucide-react";
import { apiGet } from "@/lib/api";

/* ───── Demo data ───── */

const DEMO_SATHIS = [
  { id: 1, name: "Priya Sharma", type: "bank_sakhi", mobile: "9999000001", village: "Kothapally", district: "Rangareddy", farmersManaged: 87, rating: 4.6, issuesOpen: 3, issuesCritical: 2, isActive: true },
  { id: 2, name: "Ravi Prasad", type: "business_correspondent", mobile: "9999000002", village: "Ibrahimpatnam", district: "Rangareddy", farmersManaged: 64, rating: 4.2, issuesOpen: 1, issuesCritical: 0, isActive: true },
  { id: 3, name: "Sunita Devi", type: "insurance_sakhi", mobile: "9999000003", village: "Shamshabad", district: "Rangareddy", farmersManaged: 45, rating: 4.8, issuesOpen: 0, issuesCritical: 0, isActive: true },
  { id: 4, name: "Mohan Reddy", type: "input_seller", mobile: "9999000004", village: "Chevella", district: "Rangareddy", farmersManaged: 52, rating: 3.9, issuesOpen: 2, issuesCritical: 1, isActive: true },
  { id: 5, name: "Kavitha Bai", type: "pacs_secretary", mobile: "9999000005", village: "Maheshwaram", district: "Rangareddy", farmersManaged: 38, rating: 4.1, issuesOpen: 0, issuesCritical: 0, isActive: false },
];

const DEMO_ISSUES = [
  { id: 1, sathi: "Priya Sharma", farmer: "Venkat Rao", type: "loan_default_risk", severity: "critical", status: "open", description: "3 EMIs overdue, crop failure reported. Needs restructuring.", openedAt: "2026-04-02", needsFieldVisit: true },
  { id: 2, sathi: "Priya Sharma", farmer: "Suresh Reddy", type: "document_mismatch", severity: "high", status: "open", description: "Aadhaar address doesn't match farm location.", openedAt: "2026-04-05", needsFieldVisit: true },
  { id: 3, sathi: "Mohan Reddy", farmer: "Kiran Kumar", type: "insurance_claim_delay", severity: "medium", status: "acknowledged", description: "PMFBY claim filed 45 days ago, no response.", openedAt: "2026-03-20", needsFieldVisit: false },
  { id: 4, sathi: "Priya Sharma", farmer: "Lakshmi Devi", type: "fraud_suspicion", severity: "critical", status: "open", description: "Duplicate loan application at another branch.", openedAt: "2026-04-08", needsFieldVisit: false },
  { id: 5, sathi: "Ravi Prasad", farmer: "Mohan Das", type: "field_visit_request", severity: "medium", status: "open", description: "Sathi requests banker field visit — farmer has new irrigation setup, needs loan reassessment.", openedAt: "2026-04-09", needsFieldVisit: true },
  { id: 6, sathi: "Mohan Reddy", farmer: "Priya Reddy", type: "input_quality", severity: "low", status: "resolved", description: "Pesticide quality suspect. Lab report pending.", openedAt: "2026-03-15", needsFieldVisit: false },
];

const DEMO_FIELD_VISIT_ALERTS = [
  { id: 101, sathi: "Priya Sharma", farmer: "Venkat Rao", farmerMobile: "9876543214", village: "Ibrahimpatnam", reason: "3 EMIs overdue — crop damage suspected. Sathi requests banker visit for restructuring assessment.", alertedAt: "2026-04-02", status: "pending" },
  { id: 102, sathi: "Priya Sharma", farmer: "Suresh Reddy", farmerMobile: "9876543212", village: "Ibrahimpatnam", reason: "Address mismatch on Aadhaar vs farm location. Needs on-ground verification.", alertedAt: "2026-04-05", status: "pending" },
  { id: 103, sathi: "Ravi Prasad", farmer: "Mohan Das", farmerMobile: "9876543218", village: "Maheshwaram", reason: "New irrigation infrastructure installed. Loan reassessment opportunity.", alertedAt: "2026-04-09", status: "pending" },
];

/* ───── Helpers ───── */

const typeBadge = (t: string) => {
  const colors: Record<string, string> = {
    bank_sakhi: "bg-emerald-50 text-emerald-700 border-emerald-200",
    business_correspondent: "bg-blue-50 text-blue-700 border-blue-200",
    insurance_sakhi: "bg-purple-50 text-purple-700 border-purple-200",
    input_seller: "bg-amber-50 text-amber-700 border-amber-200",
    pacs_secretary: "bg-teal-50 text-teal-700 border-teal-200",
    fpo_secretary: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  return <Badge variant="outline" className={colors[t] || ""}>{t.replace(/_/g, " ")}</Badge>;
};

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
    pending: <Clock className="h-3 w-3" />,
    resolved: <CheckCircle className="h-3 w-3" />,
  };
  const cls: Record<string, string> = {
    open: "bg-red-50 text-red-700 border-red-200",
    acknowledged: "bg-blue-50 text-blue-700 border-blue-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    resolved: "bg-green-50 text-green-700 border-green-200",
  };
  return <Badge variant="outline" className={`${cls[s] || cls.open} flex items-center gap-1`}>{icons[s] || icons.open}{s}</Badge>;
};

/* ───── Page ───── */

export default function SathiNetworkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.has("demo");

  const [loading, setLoading] = useState(!isDemo);
  const [sathis, setSathis] = useState(isDemo ? DEMO_SATHIS : []);
  const [issues, setIssues] = useState(isDemo ? DEMO_ISSUES : []);
  const [fieldAlerts, setFieldAlerts] = useState(isDemo ? DEMO_FIELD_VISIT_ALERTS : []);

  useEffect(() => {
    // In demo mode, use mock data — don't call APIs
    if (isDemo) { setLoading(false); return; }

    const token = localStorage.getItem("fp_token");
    if (!token) { router.push("/login"); return; }

    Promise.all([
      apiGet("/choice/intermediaries?limit=50", token).catch(() => ({ data: [] })),
      apiGet("/sathi/issues/banker-queue", token).catch(() => ({ data: [] })),
    ]).then(([intRes, issRes]) => {
      if (Array.isArray(intRes.data)) setSathis(intRes.data);
      const allIssues = Array.isArray(issRes.data) ? issRes.data : [];
      setIssues(allIssues);
      setFieldAlerts(allIssues.filter((i: any) => i.issue_type === 'field_visit_request' || i.needsFieldVisit));
    }).finally(() => setLoading(false));
  }, [router, isDemo]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;

  const totalFarmers = sathis.reduce((a, s) => a + s.farmersManaged, 0);
  const openIssues = issues.filter((i) => i.status !== "resolved").length;
  const criticalIssues = issues.filter((i) => i.severity === "critical").length;
  const pendingVisits = fieldAlerts.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sathi Network</h1>
        <p className="text-sm text-slate-500">Community Resource Persons associated with your branch</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Active Sathis</p>
                <p className="text-2xl font-bold mt-1">{sathis.filter(s => s.isActive).length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <HandHelping className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Farmers Covered</p>
                <p className="text-2xl font-bold mt-1">{totalFarmers}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Open Issues</p>
                <p className="text-2xl font-bold mt-1">{openIssues}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover border-red-200">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase">Critical</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{criticalIssues}</p>
            <p className="text-xs text-red-400">Needs immediate action</p>
          </CardContent>
        </Card>
        <Card className="card-hover border-amber-200">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-slate-500 uppercase">Field Visit Requests</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{pendingVisits}</p>
            <p className="text-xs text-amber-400">From Sathis</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sathis" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sathis">Sathis ({sathis.length})</TabsTrigger>
          <TabsTrigger value="issues">Flagged Issues ({openIssues})</TabsTrigger>
          <TabsTrigger value="field-visits">Field Visit Alerts ({pendingVisits})</TabsTrigger>
        </TabsList>

        {/* Sathis Tab */}
        <TabsContent value="sathis">
          <Card>
            <CardHeader><CardTitle className="text-base">Associated Sathis</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead className="text-right">Farmers</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                    <TableHead className="text-right">Open Issues</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sathis.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{typeBadge(s.type)}</TableCell>
                      <TableCell className="text-slate-500 font-mono text-xs flex items-center gap-1">
                        <Phone className="h-3 w-3" />{s.mobile}
                      </TableCell>
                      <TableCell className="text-sm flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />{s.village}, {s.district}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{s.farmersManaged}</TableCell>
                      <TableCell className="text-right">
                        <span className={s.rating >= 4.5 ? "text-green-600 font-semibold" : s.rating >= 4.0 ? "text-amber-600" : "text-red-600"}>
                          {s.rating.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {s.issuesOpen > 0 ? (
                          <span className="text-red-600 font-semibold">{s.issuesOpen} {s.issuesCritical > 0 && `(${s.issuesCritical} critical)`}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.isActive
                          ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          : <Badge variant="outline" className="bg-slate-50 text-slate-500">Inactive</Badge>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Issues Flagged by Sathis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sathi</TableHead>
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
                    <TableRow key={issue.id} className={issue.severity === "critical" ? "bg-red-50/50" : ""}>
                      <TableCell className="text-sm text-emerald-700 font-medium">{issue.sathi}</TableCell>
                      <TableCell className="font-medium">{issue.farmer}</TableCell>
                      <TableCell className="text-xs">{issue.type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{severityBadge(issue.severity)}</TableCell>
                      <TableCell>{statusBadge(issue.status)}</TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[250px] truncate">{issue.description}</TableCell>
                      <TableCell className="text-xs text-slate-500">{issue.openedAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Field Visit Alerts Tab */}
        <TabsContent value="field-visits">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Field Visit Requests from Sathis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fieldAlerts.map((alert) => (
                  <Card key={alert.id} className="border-amber-200 bg-amber-50/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-900">{alert.farmer}</span>
                            <span className="text-xs font-mono text-slate-500">{alert.farmerMobile}</span>
                            <Badge variant="outline" className="text-xs bg-white">{alert.village}</Badge>
                          </div>
                          <p className="text-sm text-slate-600">{alert.reason}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                            <span>Flagged by: <span className="text-emerald-700 font-medium">{alert.sathi}</span></span>
                            <span>Date: {alert.alertedAt}</span>
                          </div>
                        </div>
                        {statusBadge(alert.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
