"use client";

/**
 * Loan Inbox — banker triage surface for pending applications.
 *
 * Ported from the vanilla HTML dashboard's loaninbox tab. Wraps the same
 * /banker/loan-inbox endpoints:
 *   GET  /banker/loan-inbox?status=submitted,under_review&limit=50
 *   GET  /banker/loan-inbox/:applicationId
 *   POST /banker/loan-inbox/:applicationId/claim
 *   POST /banker/loan-inbox/:applicationId/approve
 *   POST /banker/loan-inbox/:applicationId/reject
 *
 * Layout follows the farmers/page.tsx template (client component + useEffect
 * data loading) and the gold-loan/page.tsx action pattern (Loader2 spinner
 * + try/catch + disabled-while-loading).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Inbox,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  FileText,
  TrendingUp,
} from "lucide-react";
import { apiGet, apiPost, formatRupees, formatRupeesCompact } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────

interface LandContext {
  surveyNumber?: string;
  areaHectares?: number;
  village?: string;
  district?: string;
  state?: string;
}

interface InboxRow {
  applicationId: number;
  applicationUuid?: string;
  farmerName: string;
  farmerMobile?: string;
  intendedUse?: string;
  appliedAmount: number;
  appliedTenureMonths?: number;
  calculatedRecommendedAmount?: number;
  hasOverSofFlag?: boolean;
  daysWaiting: number;
  status: "submitted" | "under_review" | string;
  landContext?: LandContext;
  sizingMethod?: string;
}

interface LoanDetailResponse {
  application: InboxRow & {
    appliedAt?: string;
    sofCostPerHectare?: number;
    nabardBenchmarkPerHectare?: number;
    productName?: string;
    providerName?: string;
    minInterestRate?: number;
    maxInterestRate?: number;
  };
  statusHistory?: { fromStatus?: string; toStatus: string; at: string; transitionReason?: string }[];
  documents?: { documentType: string; verified: boolean }[];
}

// ─── Page ───────────────────────────────────────────────────────────

const DEMO_INBOX: InboxRow[] = [
  { applicationId: 1001, farmerName: "Ramesh Kumar", farmerMobile: "9876543210", intendedUse: "Kharif paddy — seeds + fertilizer", appliedAmount: 250000, appliedTenureMonths: 12, calculatedRecommendedAmount: 220000, hasOverSofFlag: false, daysWaiting: 3, status: "submitted", landContext: { surveyNumber: "112/A", areaHectares: 2.5, village: "Kothapally", district: "Rangareddy", state: "Telangana" }, sizingMethod: "sof_nabard" },
  { applicationId: 1002, farmerName: "Suresh Reddy", farmerMobile: "9876543212", intendedUse: "Bore well repair + drip irrigation", appliedAmount: 500000, appliedTenureMonths: 36, calculatedRecommendedAmount: 350000, hasOverSofFlag: true, daysWaiting: 7, status: "under_review", landContext: { surveyNumber: "87/B", areaHectares: 4.0, village: "Ibrahimpatnam", district: "Rangareddy", state: "Telangana" }, sizingMethod: "sof_nabard" },
  { applicationId: 1003, farmerName: "Kiran Kumar", farmerMobile: "9876543216", intendedUse: "Cattle purchase — 2 crossbred cows", appliedAmount: 175000, appliedTenureMonths: 24, calculatedRecommendedAmount: 175000, hasOverSofFlag: false, daysWaiting: 1, status: "submitted", landContext: { village: "Chevella", district: "Rangareddy", state: "Telangana" }, sizingMethod: "unit_economics" },
  { applicationId: 1004, farmerName: "Padma Bai", farmerMobile: "9876543215", intendedUse: "Rabi wheat — Scale of Finance", appliedAmount: 200000, appliedTenureMonths: 12, calculatedRecommendedAmount: 195000, hasOverSofFlag: false, daysWaiting: 5, status: "submitted", landContext: { surveyNumber: "156", areaHectares: 3.2, village: "Kothapally", district: "Rangareddy", state: "Telangana" }, sizingMethod: "sof_nabard" },
  { applicationId: 1005, farmerName: "Venkat Rao", farmerMobile: "9876543214", intendedUse: "Gold loan top-up — harvest logistics", appliedAmount: 350000, appliedTenureMonths: 6, calculatedRecommendedAmount: 250000, hasOverSofFlag: true, daysWaiting: 12, status: "under_review", landContext: { village: "Ibrahimpatnam", district: "Rangareddy", state: "Telangana" }, sizingMethod: "trust_score" },
];

export default function LoanInboxPage() {
  const router = useRouter();
  const isDemo = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");
  const [rows, setRows] = useState<InboxRow[]>(isDemo ? DEMO_INBOX : []);
  const [loading, setLoading] = useState(!isDemo);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LoanDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<"claim" | "approve" | "reject" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [approveAmount, setApproveAmount] = useState<string>("");
  const [approveRate, setApproveRate] = useState<string>("");
  const [approveTenure, setApproveTenure] = useState<string>("");
  const [approveNotes, setApproveNotes] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string>("");

  // ── Load inbox list ──
  const loadInbox = async () => {
    if (isDemo) { setLoading(false); return; }
    const token = localStorage.getItem("fp_token");
    if (!token) {
      router.push("/login");
      return;
    }
    setLoading(true);
    try {
      const res = await apiGet(
        "/banker/loan-inbox?status=submitted,under_review&limit=50",
        token,
      );
      setRows((res.data || []) as InboxRow[]);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        localStorage.removeItem("fp_token");
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load single application detail ──
  const openDetail = async (appId: number) => {
    const token = localStorage.getItem("fp_token");
    if (!token) return;
    setDetailLoading(true);
    setSelected(null);
    setShowApproveForm(false);
    setShowRejectForm(false);
    setActionError(null);
    try {
      const res = await apiGet(`/banker/loan-inbox/${appId}`, token);
      const d = (res.data || {}) as LoanDetailResponse;
      setSelected(d);
      if (d.application?.calculatedRecommendedAmount) {
        setApproveAmount(String(d.application.calculatedRecommendedAmount));
      }
      if (d.application?.minInterestRate) {
        setApproveRate(String(d.application.minInterestRate));
      }
      if (d.application?.appliedTenureMonths) {
        setApproveTenure(String(d.application.appliedTenureMonths));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        localStorage.removeItem("fp_token");
        router.push("/login");
      }
      setActionError(err instanceof Error ? err.message : "Failed to load detail");
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Actions ──
  const handleClaim = async () => {
    if (!selected) return;
    const token = localStorage.getItem("fp_token");
    if (!token) return;
    setActionLoading("claim");
    setActionError(null);
    try {
      await apiPost(`/banker/loan-inbox/${selected.application.applicationId}/claim`, {}, token);
      await openDetail(selected.application.applicationId);
      await loadInbox();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    const token = localStorage.getItem("fp_token");
    if (!token) return;
    setActionLoading("approve");
    setActionError(null);
    try {
      await apiPost(
        `/banker/loan-inbox/${selected.application.applicationId}/approve`,
        {
          approvalAmount: parseFloat(approveAmount || "0"),
          approvalInterestRate: parseFloat(approveRate || "0"),
          approvalTenureMonths: parseInt(approveTenure || "12", 10),
          notes: approveNotes,
        },
        token,
      );
      setSelected(null);
      setShowApproveForm(false);
      await loadInbox();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) {
      setActionError("Rejection reason is required.");
      return;
    }
    const token = localStorage.getItem("fp_token");
    if (!token) return;
    setActionLoading("reject");
    setActionError(null);
    try {
      await apiPost(
        `/banker/loan-inbox/${selected.application.applicationId}/reject`,
        { rejectionReason: rejectReason.trim() },
        token,
      );
      setSelected(null);
      setShowRejectForm(false);
      setRejectReason("");
      await loadInbox();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Derived state ──
  const filtered = rows.filter(
    (r) =>
      !search ||
      r.farmerName?.toLowerCase().includes(search.toLowerCase()) ||
      r.farmerMobile?.includes(search) ||
      (r.intendedUse || "").toLowerCase().includes(search.toLowerCase()),
  );

  const subCount = rows.filter((a) => a.status === "submitted").length;
  const revCount = rows.filter((a) => a.status === "under_review").length;
  const overCount = rows.filter((a) => a.hasOverSofFlag).length;
  const totalApplied = rows.reduce((s, a) => s + (a.appliedAmount || 0), 0);

  const statusBadge = (s: string) => {
    if (s === "submitted") {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
          SUBMITTED
        </Badge>
      );
    }
    if (s === "under_review") {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
          UNDER REVIEW
        </Badge>
      );
    }
    return <Badge variant="outline" className="text-xs">{s}</Badge>;
  };

  // ── Render ──
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">📥 Loan Inbox</h1>
        <Card>
          <CardContent className="p-6">
            <div className="skeleton h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Detail panel ──
  if (selected) {
    const app = selected.application;
    const land = app.landContext || {};
    const ha = land.areaHectares || 0;
    const sofPerHa = app.sofCostPerHectare || 0;
    const nabardPerHa = app.nabardBenchmarkPerHectare || 0;
    const sofTotal = sofPerHa * ha;
    const nabardTotal = nabardPerHa * ha;
    const recommended = app.calculatedRecommendedAmount || 0;
    const overSof = (app.appliedAmount || 0) - sofTotal;
    const history = selected.statusHistory || [];
    const docs = selected.documents || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to inbox
          </Button>
        </div>

        <Card className="border-l-4 border-indigo-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start gap-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Application #{(app.applicationUuid || "").slice(0, 8).toUpperCase()}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {app.farmerName} · {app.farmerMobile || ""} · Applied{" "}
                  {(app.appliedAt || "").slice(0, 10)}
                </p>
              </div>
              <div>{statusBadge(app.status)}</div>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="text-xs font-bold text-green-700 uppercase">DLTC Scale of Finance</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{formatRupees(sofTotal)}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {formatRupees(sofPerHa)}/ha × {ha} ha
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-700 uppercase">NABARD Benchmark</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{formatRupees(nabardTotal)}</div>
                <div className="text-xs text-slate-500 mt-1">{formatRupees(nabardPerHa)}/ha</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs font-bold text-amber-700 uppercase">Farmer requested</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {formatRupees(app.appliedAmount || 0)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {app.appliedTenureMonths} months · {app.sizingMethod || "manual"}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-700 uppercase">Recommended</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{formatRupees(recommended)}</div>
                <div className="text-xs text-slate-500 mt-1">system auto-calc</div>
              </div>
            </div>

            {overSof > 0 && (
              <div className="mt-4 p-3 rounded-md border-l-4 border-red-600 bg-red-50">
                <strong className="text-red-700">⚠ Above DLTC norms:</strong>{" "}
                <span className="text-sm text-slate-700">
                  Farmer requested {formatRupees(overSof)} more than the DLTC Scale of Finance for this
                  district+crop+season. Requires bank review.
                </span>
              </div>
            )}

            {/* Crop + Product grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">🌾 Crop & land</h3>
                <p className="font-bold text-slate-900">{app.intendedUse || "—"}</p>
                <p className="text-sm text-slate-500 mt-1">
                  Survey {land.surveyNumber || "—"} · {ha} ha
                </p>
                <p className="text-sm text-slate-500">
                  {land.village || "—"}, {land.district || "—"}, {land.state || "—"}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">📋 Product</h3>
                <p className="font-bold text-slate-900">{app.productName || "—"}</p>
                <p className="text-sm text-slate-500 mt-1">{app.providerName || "—"}</p>
                <p className="text-sm text-slate-500">
                  Rate: {app.minInterestRate ?? "—"}%–{app.maxInterestRate ?? "—"}% p.a.
                </p>
              </div>
            </div>

            {/* Status timeline */}
            {history.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">⏳ Status timeline</h3>
                <div className="bg-slate-50 rounded-lg p-3">
                  {history.map((h, i) => (
                    <div
                      key={i}
                      className={`py-2 ${i < history.length - 1 ? "border-b border-slate-200" : ""}`}
                    >
                      <div className="flex items-baseline gap-2">
                        <strong className="text-sm">
                          {h.fromStatus || "(new)"} → {h.toStatus}
                        </strong>
                        <span className="text-xs text-slate-500">
                          {(h.at || "").slice(0, 16).replace("T", " ")}
                        </span>
                      </div>
                      {h.transitionReason && (
                        <div className="text-xs text-slate-600 mt-1">{h.transitionReason}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">
                <FileText className="inline w-3 h-3 mr-1" />
                Documents ({docs.length})
              </h3>
              {docs.length > 0 ? (
                <div className="bg-slate-50 rounded-lg p-3">
                  {docs.map((doc, i) => (
                    <div key={i} className="py-1 text-sm">
                      {doc.verified ? "✓" : "⏳"} {doc.documentType}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No documents captured yet.</p>
              )}
            </div>

            {/* Action error banner */}
            {actionError && (
              <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                {actionError}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-slate-200">
              {app.status === "submitted" && (
                <Button
                  onClick={handleClaim}
                  disabled={actionLoading !== null}
                  className="bg-indigo-800 hover:bg-indigo-900"
                >
                  {actionLoading === "claim" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Claiming...
                    </>
                  ) : (
                    "Claim for review"
                  )}
                </Button>
              )}
              {app.status === "under_review" && !showApproveForm && !showRejectForm && (
                <>
                  <Button
                    onClick={() => setShowApproveForm(true)}
                    disabled={actionLoading !== null}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                  </Button>
                  <Button
                    onClick={() => setShowRejectForm(true)}
                    disabled={actionLoading !== null}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </>
              )}
            </div>

            {/* Approve form */}
            {showApproveForm && (
              <div className="mt-5 p-5 rounded-lg border-l-4 border-green-600 bg-green-50">
                <h3 className="font-bold text-slate-900 mb-3">
                  Approve application #{app.applicationId}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <label className="text-xs font-bold text-slate-600 space-y-1">
                    <span className="block">Approval amount (₹)</span>
                    <Input
                      type="number"
                      value={approveAmount}
                      onChange={(e) => setApproveAmount(e.target.value)}
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600 space-y-1">
                    <span className="block">Interest rate (%)</span>
                    <Input
                      type="number"
                      step="0.1"
                      value={approveRate}
                      onChange={(e) => setApproveRate(e.target.value)}
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600 space-y-1">
                    <span className="block">Tenure (months)</span>
                    <Input
                      type="number"
                      value={approveTenure}
                      onChange={(e) => setApproveTenure(e.target.value)}
                    />
                  </label>
                </div>
                <label className="text-xs font-bold text-slate-600 space-y-1 block">
                  <span className="block">Notes (optional)</span>
                  <textarea
                    rows={2}
                    value={approveNotes}
                    onChange={(e) => setApproveNotes(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                  />
                </label>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading !== null}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {actionLoading === "approve" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                      </>
                    ) : (
                      "Confirm approval"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowApproveForm(false)}
                    disabled={actionLoading !== null}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Reject form */}
            {showRejectForm && (
              <div className="mt-5 p-5 rounded-lg border-l-4 border-red-600 bg-red-50">
                <h3 className="font-bold text-slate-900 mb-3">
                  Reject application #{app.applicationId}
                </h3>
                <label className="text-xs font-bold text-slate-600 space-y-1 block">
                  <span className="block">Reason (required — the farmer will see this)</span>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Land documents incomplete — please re-upload Patta"
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                  />
                </label>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleReject}
                    disabled={actionLoading !== null}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {actionLoading === "reject" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                      </>
                    ) : (
                      "Confirm rejection"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectReason("");
                    }}
                    disabled={actionLoading !== null}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Inbox list view ──
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
        <Inbox className="w-6 h-6 text-indigo-700" />
        Loan Inbox
        <span className="text-sm font-normal text-slate-500">({rows.length} pending)</span>
      </h1>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Newly submitted</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{subCount}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Under review</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{revCount}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Above SoF</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{overCount}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total applied</p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {formatRupeesCompact(totalApplied)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by farmer, mobile, or crop..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-700" />
            Pending applications ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {rows.length === 0
                  ? "No pending loan applications — all caught up! 🎉"
                  : "No applications match your search."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Crop & Land</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const land = a.landContext || {};
                  const ref = (a.applicationUuid || "").slice(0, 8).toUpperCase();
                  return (
                    <TableRow
                      key={a.applicationId}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => openDetail(a.applicationId)}
                    >
                      <TableCell>
                        <code className="text-xs">{ref}</code>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{a.farmerName}</div>
                        <div className="text-xs text-slate-500">{a.farmerMobile || "—"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{a.intendedUse || "—"}</div>
                        <div className="text-xs text-slate-500">
                          Survey {land.surveyNumber || "—"} · {land.areaHectares || "—"} ha ·{" "}
                          {land.village || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-semibold">{formatRupees(a.appliedAmount)}</div>
                        {a.hasOverSofFlag && (
                          <Badge
                            variant="outline"
                            className="mt-1 bg-red-50 text-red-700 border-red-200 text-[10px]"
                          >
                            ABOVE SoF
                          </Badge>
                        )}
                        <div className="text-xs text-slate-500 mt-0.5">
                          rec {formatRupees(a.calculatedRecommendedAmount || 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {a.daysWaiting > 3 ? (
                          <span className="text-red-600 font-bold">{a.daysWaiting}d</span>
                        ) : (
                          <span>{a.daysWaiting}d</span>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(a.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(a.applicationId);
                          }}
                        >
                          View →
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {detailLoading && (
            <div className="text-center py-4">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin mx-auto" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
