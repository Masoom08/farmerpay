"use client";

/**
 * Insurance Portfolio — Banker read-only view of insurance_enrollments
 * + loan_insurance_bundled tables. Three tabs:
 *
 *   1. Overview        — KPI strip, product breakdown bar chart, claim
 *                        status pie chart, expiring-in-30-days list
 *   2. Policies        — paginated, filterable table of all enrollments
 *   3. Claims Pipeline — kanban-style columns (Filed → Under Review →
 *                        Approved → Settled, with Rejected in a separate
 *                        gray section)
 *
 * Data comes from 3 endpoints added in Insurance Phase 1:
 *   GET /banker/insurance/portfolio
 *   GET /banker/insurance/policies?product=&status=&search=&page=&pageSize=
 *   GET /banker/insurance/claims
 *
 * Mirrors the existing client-component + useEffect + localStorage fp_token
 * pattern used across dashboard/src/app/dashboard (see farmers/page.tsx,
 * warnings/page.tsx, asset-quality/page.tsx).
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ShieldCheck,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  XCircle,
  TrendingUp,
  Sprout,
  Cloud,
  PawPrint,
  Store,
  Building2,
  Globe,
  Phone,
} from "lucide-react";
import { apiGet, formatRupees, formatRupeesCompact } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────

interface ByProduct {
  product: string;
  label: string;
  count: number;
  sumInsured: number;
  premium: number;
}

interface ClaimStats {
  counts: {
    none: number;
    filed: number;
    under_review: number;
    approved: number;
    rejected: number;
    settled: number;
  };
  totalClaimAmount: number;
  totalClaimPayout: number;
  settlementRatio: number;
  totalClaimsFiled: number;
  totalClaimsPending: number;
}

interface ExpiringPolicy {
  enrollmentId: number;
  farmerId: number;
  farmerName?: string;
  product: string;
  productLabel: string;
  policyNumber: string;
  expiryDate: string;
  daysUntilExpiry: number;
  sumInsured: number;
}

interface PortfolioSummary {
  totalPolicies: number;
  totalSumInsured: number;
  totalPremiumPaid: number;
  totalPremiumSubsidy: number;
  netPremiumFarmer: number;
  byProduct: ByProduct[];
  claimStats: ClaimStats;
  policiesLinkedToLoans: number;
  loanBundledCount: number;
  expiringIn30Days: ExpiringPolicy[];
}

interface PolicyRow {
  enrollmentId: number;
  policyNumber: string | null;
  farmerId: number;
  farmerName: string;
  farmerMobile: string | null;
  insuranceType: string;
  insuranceTypeLabel: string;
  insurerName: string | null;
  sumInsured: number;
  premiumPaid: number;
  premiumSubsidy: number;
  cropInsured: string | null;
  areaInsuredHectares: number;
  animalTagId: string | null;
  season: string | null;
  enrollmentDate: string | null;
  policyExpiryDate: string | null;
  claimFiled: boolean;
  claimAmount: number;
  claimStatus: string;
  claimPayout: number;
  linkedLoanId: number | null;
}

interface ClaimRow {
  enrollmentId: number;
  farmerId: number;
  farmerName: string;
  policyNumber: string | null;
  insurerName: string | null;
  insuranceType: string;
  insuranceTypeLabel: string;
  cropInsured: string | null;
  animalTagId: string | null;
  sumInsured: number;
  claimAmount: number;
  claimPayout: number;
  claimStatus: string;
  updatedAt: string | null;
}

// ─── Phase 2 POS types ──────────────────────────────────────────────

interface PosProduct {
  id: number;
  productCode: string;
  productName: string;
  category: string;
  categoryLabel: string;
  subsidyType: "government" | "non_subsidized";
  subScheme: string;
  subSchemeLabel: string;
  insurerName: string | null;
  farmerPremiumRate: number | null;
  subsidyPct: number | null;
  deepLinkUrl: string | null;
  portalUrl: string | null;
  contactPhone: string | null;
  displayOrder: number;
}

interface FunnelStats {
  counts: { viewed: number; quoted: number; referred: number };
  convertedTrue: number;
  conversionRate: number;
  viewedToQuotedRate: number;
  quotedToReferredRate: number;
  topProducts: {
    productId: number;
    productName: string;
    subsidyType: string | null;
    subScheme: string | null;
    count: number;
  }[];
}

interface ReferralRow {
  referralId: number;
  referralUuid: string;
  farmerId: number;
  farmerName: string;
  farmerMobile: string | null;
  productId: number;
  productName: string | null;
  productSubsidyType: string | null;
  productSubScheme: string | null;
  insurerName: string | null;
  action: "viewed" | "quoted" | "referred";
  quotedSumInsured: number | null;
  quotedPremiumFarmer: number | null;
  quotedPremiumSubsidy: number | null;
  quotedCrop: string | null;
  quotedSeason: string | null;
  converted: boolean | null;
  referredAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const PRODUCT_ICONS: Record<string, typeof ShieldCheck> = {
  pmfby_crop: Sprout,
  livestock: PawPrint,
  weather_index: Cloud,
  aquaculture: ShieldCheck,
  polyhouse: ShieldCheck,
};

const PRODUCT_COLORS: Record<string, string> = {
  pmfby_crop: "#16a34a",
  livestock: "#f59e0b",
  weather_index: "#2563eb",
  aquaculture: "#06b6d4",
  polyhouse: "#7c3aed",
};

const STATUS_COLORS: Record<string, string> = {
  none: "#94a3b8",
  filed: "#f59e0b",
  under_review: "#3b82f6",
  approved: "#10b981",
  rejected: "#ef4444",
  settled: "#059669",
};

const CLAIM_COLUMNS: { key: string; label: string; icon: typeof FileText }[] = [
  { key: "filed", label: "Filed", icon: FileText },
  { key: "under_review", label: "Under Review", icon: Clock },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "settled", label: "Settled", icon: CheckCircle2 },
];

// ─── Page ───────────────────────────────────────────────────────────

export default function InsurancePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [policyMeta, setPolicyMeta] = useState<{
    total: number;
    page: number;
    pageSize: number;
  } | null>(null);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [productFilter, setProductFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Phase 2 POS tabs
  const [posProducts, setPosProducts] = useState<PosProduct[]>([]);
  const [funnel, setFunnel] = useState<FunnelStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [referralMeta, setReferralMeta] = useState<{
    total: number;
    page: number;
    pageSize: number;
  } | null>(null);
  const [referralActionFilter, setReferralActionFilter] = useState<string>("");

  // ── Initial load: portfolio + claims + first page of policies ──
  useEffect(() => {
    const token = localStorage.getItem("fp_token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function loadAll() {
      try {
        const [s, p, c, pos, fn, refs] = await Promise.all([
          apiGet("/banker/insurance/portfolio", token!),
          apiGet("/banker/insurance/policies?pageSize=25", token!),
          apiGet("/banker/insurance/claims", token!),
          apiGet("/banker/insurance/pos-products", token!),
          apiGet("/banker/insurance/referral-funnel", token!),
          apiGet("/banker/insurance/referrals?pageSize=25", token!),
        ]);
        setSummary((s.data || null) as PortfolioSummary | null);
        setPolicies(((p.data || []) as PolicyRow[]));
        setPolicyMeta(p.meta || null);
        setClaims(((c.data || []) as ClaimRow[]));
        setPosProducts((pos.data || []) as PosProduct[]);
        setFunnel((fn.data || null) as FunnelStats | null);
        setReferrals((refs.data || []) as ReferralRow[]);
        setReferralMeta(refs.meta || null);
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "UNAUTHORIZED") {
          localStorage.removeItem("fp_token");
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [router]);

  // ── Re-fetch policies on filter / page change (but not on first load) ──
  useEffect(() => {
    if (loading) return;
    const token = localStorage.getItem("fp_token");
    if (!token) return;

    async function loadPolicies() {
      setPoliciesLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("pageSize", "25");
        if (productFilter) qs.set("product", productFilter);
        if (statusFilter) qs.set("status", statusFilter);
        if (search.trim()) qs.set("search", search.trim());
        const res = await apiGet(`/banker/insurance/policies?${qs.toString()}`, token!);
        setPolicies((res.data || []) as PolicyRow[]);
        setPolicyMeta(res.meta || null);
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "UNAUTHORIZED") {
          localStorage.removeItem("fp_token");
          router.push("/login");
        }
      } finally {
        setPoliciesLoading(false);
      }
    }

    const debounce = setTimeout(loadPolicies, search ? 350 : 0);
    return () => clearTimeout(debounce);
  }, [productFilter, statusFilter, search, page, loading, router]);

  // ── Phase 2: re-fetch referrals on filter change ──
  useEffect(() => {
    if (loading) return;
    const token = localStorage.getItem("fp_token");
    if (!token) return;
    async function loadReferrals() {
      try {
        const qs = new URLSearchParams();
        qs.set("pageSize", "25");
        if (referralActionFilter) qs.set("action", referralActionFilter);
        const res = await apiGet(`/banker/insurance/referrals?${qs.toString()}`, token!);
        setReferrals((res.data || []) as ReferralRow[]);
        setReferralMeta(res.meta || null);
      } catch {
        // silent
      }
    }
    loadReferrals();
  }, [referralActionFilter, loading]);

  // ── Derived ──
  const productChartData = useMemo(() => {
    if (!summary) return [];
    return summary.byProduct.map((p) => ({
      name: p.label,
      count: p.count,
      fill: PRODUCT_COLORS[p.product] || "#64748b",
    }));
  }, [summary]);

  const claimPieData = useMemo(() => {
    if (!summary) return [];
    const c = summary.claimStats.counts;
    return [
      { name: "No claim", value: c.none, fill: STATUS_COLORS.none },
      { name: "Filed", value: c.filed, fill: STATUS_COLORS.filed },
      { name: "Under review", value: c.under_review, fill: STATUS_COLORS.under_review },
      { name: "Approved", value: c.approved, fill: STATUS_COLORS.approved },
      { name: "Settled", value: c.settled, fill: STATUS_COLORS.settled },
      { name: "Rejected", value: c.rejected, fill: STATUS_COLORS.rejected },
    ].filter((d) => d.value > 0);
  }, [summary]);

  const claimsByStatus = useMemo(() => {
    const groups: Record<string, ClaimRow[]> = {
      filed: [],
      under_review: [],
      approved: [],
      settled: [],
      rejected: [],
    };
    for (const c of claims) {
      if (c.claimStatus in groups) groups[c.claimStatus].push(c);
    }
    return groups;
  }, [claims]);

  // Phase 2: funnel chart data
  const funnelChartData = useMemo(() => {
    if (!funnel) return [];
    return [
      { stage: "Viewed", count: funnel.counts.viewed, fill: "#94a3b8" },
      { stage: "Quoted", count: funnel.counts.quoted, fill: "#2563eb" },
      { stage: "Referred", count: funnel.counts.referred, fill: "#16a34a" },
      { stage: "Converted", count: funnel.convertedTrue, fill: "#059669" },
    ];
  }, [funnel]);

  // Phase 2: grouped POS products by subsidy type
  const posProductsGrouped = useMemo(() => {
    const gov = posProducts.filter((p) => p.subsidyType === "government");
    const pvt = posProducts.filter((p) => p.subsidyType === "non_subsidized");
    return { gov, pvt };
  }, [posProducts]);

  const actionBadge = (action: string) => {
    switch (action) {
      case "viewed":
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">
            Viewed
          </Badge>
        );
      case "quoted":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
            Quoted
          </Badge>
        );
      case "referred":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
            Referred
          </Badge>
        );
      default:
        return null;
    }
  };

  const claimStatusBadge = (status: string) => {
    const baseClass = "text-[10px] font-bold uppercase";
    switch (status) {
      case "filed":
        return (
          <Badge variant="outline" className={`${baseClass} bg-amber-50 text-amber-700 border-amber-200`}>
            Filed
          </Badge>
        );
      case "under_review":
        return (
          <Badge variant="outline" className={`${baseClass} bg-blue-50 text-blue-700 border-blue-200`}>
            Under Review
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200`}>
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className={`${baseClass} bg-red-50 text-red-700 border-red-200`}>
            Rejected
          </Badge>
        );
      case "settled":
        return (
          <Badge variant="outline" className={`${baseClass} bg-green-50 text-green-800 border-green-300`}>
            Settled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className={`${baseClass} bg-slate-50 text-slate-600 border-slate-200`}>
            —
          </Badge>
        );
    }
  };

  const productBadge = (product: string, label: string) => {
    const Icon = PRODUCT_ICONS[product] || ShieldCheck;
    const color = PRODUCT_COLORS[product] || "#64748b";
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium"
        style={{ color }}
      >
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-700" />
          Insurance Portfolio
        </h1>
        <Card>
          <CardContent className="p-6">
            <div className="skeleton h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-700" />
          Insurance Portfolio
        </h1>
        <Card>
          <CardContent className="p-6 text-red-600 text-sm">
            Failed to load insurance portfolio. Please try again.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-emerald-700" />
        Insurance Portfolio
        <span className="text-sm font-normal text-slate-500">
          {summary.totalPolicies} active policies across{" "}
          {summary.byProduct.length} products
        </span>
      </h1>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-100 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="policies" className="text-xs">
            Policies ({policyMeta?.total ?? summary.totalPolicies})
          </TabsTrigger>
          <TabsTrigger value="claims" className="text-xs">
            Claims Pipeline ({summary.claimStats.totalClaimsFiled})
          </TabsTrigger>
          <TabsTrigger value="offers" className="text-xs">
            Offers Catalog ({posProducts.length})
          </TabsTrigger>
          <TabsTrigger value="referrals" className="text-xs">
            POS Referrals ({funnel ? funnel.counts.viewed + funnel.counts.quoted + funnel.counts.referred : 0})
          </TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW TAB ─── */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase">Total Policies</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalPolicies}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {summary.policiesLinkedToLoans} linked to loans
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase">Sum Insured</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {formatRupeesCompact(summary.totalSumInsured)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase">Premium Collected</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {formatRupeesCompact(summary.totalPremiumPaid)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">from farmers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase">Govt. Subsidy</p>
                <p className="text-2xl font-bold text-indigo-700 mt-1">
                  {formatRupeesCompact(summary.totalPremiumSubsidy)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">booked</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase">Claims Pending</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {summary.claimStats.totalClaimsPending}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {formatRupeesCompact(summary.claimStats.totalClaimAmount)} filed
                </p>
              </CardContent>
            </Card>
            <Card className="border-green-200">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase">Settlement Ratio</p>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {summary.claimStats.settlementRatio}%
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {formatRupeesCompact(summary.claimStats.totalClaimPayout)} paid
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Policies by Product
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {productChartData.map((e, i) => (
                          <Cell key={i} fill={e.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Claim Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {claimPieData.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">No claim data yet.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={claimPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          labelLine={false}
                          fontSize={11}
                        >
                          {claimPieData.map((e, i) => (
                            <Cell key={i} fill={e.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Expiring-in-30-days */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Expiring in 30 days ({summary.expiringIn30Days.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.expiringIn30Days.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">
                  No policies expiring in the next 30 days.
                </p>
              ) : (
                <div className="space-y-2">
                  {summary.expiringIn30Days.map((p) => (
                    <div
                      key={p.enrollmentId}
                      className="flex items-center justify-between p-3 rounded-md bg-amber-50 border border-amber-100"
                    >
                      <div className="flex items-center gap-3">
                        {productBadge(p.product, p.productLabel)}
                        <div>
                          <div className="font-medium text-sm">{p.farmerName || `Farmer #${p.farmerId}`}</div>
                          <div className="text-xs text-slate-500">
                            Policy {p.policyNumber || "—"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-amber-700">
                          {p.daysUntilExpiry}d
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatRupees(p.sumInsured)} insured
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── POLICIES TAB ─── */}
        <TabsContent value="policies" className="space-y-4">
          {/* Filter bar */}
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by farmer name or mobile..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <select
                value={productFilter}
                onChange={(e) => {
                  setProductFilter(e.target.value);
                  setPage(1);
                }}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">All products</option>
                <option value="pmfby_crop">PMFBY Crop</option>
                <option value="livestock">Livestock</option>
                <option value="weather_index">Weather Index</option>
                <option value="aquaculture">Aquaculture</option>
                <option value="polyhouse">Polyhouse</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">All statuses</option>
                <option value="none">No claim</option>
                <option value="filed">Filed</option>
                <option value="under_review">Under review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="settled">Settled</option>
              </select>
              {(productFilter || statusFilter || search) && (
                <button
                  onClick={() => {
                    setProductFilter("");
                    setStatusFilter("");
                    setSearch("");
                    setPage(1);
                  }}
                  className="text-xs text-indigo-700 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {policies.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">
                    {policiesLoading ? "Loading policies..." : "No policies match your filters."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Policy #</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Crop / Animal</TableHead>
                      <TableHead className="text-right">Sum Insured</TableHead>
                      <TableHead className="text-right">Premium</TableHead>
                      <TableHead className="text-right">Subsidy</TableHead>
                      <TableHead>Claim</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map((p) => (
                      <TableRow
                        key={p.enrollmentId}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() =>
                          setExpandedRow(expandedRow === p.enrollmentId ? null : p.enrollmentId)
                        }
                      >
                        <TableCell>
                          <code className="text-[11px]">{p.policyNumber || "—"}</code>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{p.farmerName}</div>
                          <div className="text-[11px] text-slate-500">{p.farmerMobile || "—"}</div>
                        </TableCell>
                        <TableCell>{productBadge(p.insuranceType, p.insuranceTypeLabel)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {p.cropInsured || p.animalTagId || "—"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {p.areaInsuredHectares > 0 ? `${p.areaInsuredHectares} ha` : p.season || ""}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatRupees(p.sumInsured)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatRupees(p.premiumPaid)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-indigo-700">
                          {formatRupees(p.premiumSubsidy)}
                        </TableCell>
                        <TableCell>{claimStatusBadge(p.claimStatus)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {policyMeta && policyMeta.total > policyMeta.pageSize && (
                <div className="flex items-center justify-between p-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    Page {policyMeta.page} of {Math.ceil(policyMeta.total / policyMeta.pageSize)} ·{" "}
                    {policyMeta.total} total
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={policyMeta.page <= 1 || policiesLoading}
                      className="px-3 py-1 text-xs border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={
                        policyMeta.page >= Math.ceil(policyMeta.total / policyMeta.pageSize) ||
                        policiesLoading
                      }
                      className="px-3 py-1 text-xs border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── CLAIMS PIPELINE TAB ─── */}
        <TabsContent value="claims" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {CLAIM_COLUMNS.map((col) => {
              const rows = claimsByStatus[col.key] || [];
              const Icon = col.icon;
              return (
                <Card key={col.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Icon
                          className="w-4 h-4"
                          style={{ color: STATUS_COLORS[col.key] }}
                        />
                        {col.label}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {rows.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-3 pt-0">
                    {rows.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-4">—</p>
                    ) : (
                      rows.map((c) => (
                        <div
                          key={c.enrollmentId}
                          className="p-3 rounded-md border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                          style={{ borderLeftWidth: 3, borderLeftColor: STATUS_COLORS[col.key] }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{c.farmerName}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {productBadge(c.insuranceType, c.insuranceTypeLabel)}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-1">
                                {c.cropInsured || c.animalTagId || "—"}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-xs">
                            <span className="text-slate-500">Claimed</span>
                            <span className="font-semibold">{formatRupees(c.claimAmount)}</span>
                          </div>
                          {c.claimPayout > 0 && (
                            <div className="flex justify-between text-xs mt-0.5">
                              <span className="text-slate-500">Paid</span>
                              <span className="font-semibold text-green-700">
                                {formatRupees(c.claimPayout)}
                              </span>
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-2 truncate">
                            {c.policyNumber}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Rejected — separate gray section below */}
          {claimsByStatus.rejected && claimsByStatus.rejected.length > 0 && (
            <Card className="border-slate-200 bg-slate-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-600">
                  <XCircle className="w-4 h-4" />
                  Rejected ({claimsByStatus.rejected.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 p-3 pt-0">
                {claimsByStatus.rejected.map((c) => (
                  <div
                    key={c.enrollmentId}
                    className="p-2 rounded-md border border-slate-200 bg-white opacity-70"
                  >
                    <div className="font-medium text-sm">{c.farmerName}</div>
                    <div className="text-[11px] text-slate-500">
                      {c.insuranceTypeLabel} · {formatRupees(c.claimAmount)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── OFFERS CATALOG TAB (Phase 2 POS) ─── */}
        <TabsContent value="offers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <Store className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Government schemes</p>
                    <p className="text-2xl font-bold text-green-700">
                      {posProductsGrouped.gov.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Private insurers</p>
                    <p className="text-2xl font-bold text-amber-700">
                      {posProductsGrouped.pvt.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total offers</p>
                    <p className="text-2xl font-bold text-slate-900">{posProducts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Government products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="w-4 h-4 text-green-700" />
                Government-subsidized schemes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Insurer</TableHead>
                    <TableHead className="text-right">Farmer rate</TableHead>
                    <TableHead className="text-right">Govt. subsidy</TableHead>
                    <TableHead>Portal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posProductsGrouped.gov.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <code className="text-[11px]">{p.productCode}</code>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{p.productName}</TableCell>
                      <TableCell className="text-xs text-slate-500">{p.subSchemeLabel}</TableCell>
                      <TableCell className="text-xs">{p.categoryLabel}</TableCell>
                      <TableCell className="text-xs text-slate-500">{p.insurerName}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {p.farmerPremiumRate}%
                      </TableCell>
                      <TableCell className="text-right text-sm text-green-700">
                        {p.subsidyPct ? `up to ${p.subsidyPct}%` : "—"}
                      </TableCell>
                      <TableCell>
                        {p.deepLinkUrl ? (
                          <a
                            href={p.deepLinkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-700 hover:underline text-xs flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            Visit
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Private products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-700" />
                Private (non-subsidized) insurers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Insurer</TableHead>
                    <TableHead className="text-right">Market rate</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Portal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posProductsGrouped.pvt.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <code className="text-[11px]">{p.productCode}</code>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{p.productName}</TableCell>
                      <TableCell className="text-xs">{p.categoryLabel}</TableCell>
                      <TableCell className="text-xs text-slate-500">{p.insurerName}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {p.farmerPremiumRate}%
                      </TableCell>
                      <TableCell>
                        {p.contactPhone ? (
                          <a
                            href={`tel:${p.contactPhone}`}
                            className="text-indigo-700 hover:underline text-xs flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {p.contactPhone}
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.deepLinkUrl ? (
                          <a
                            href={p.deepLinkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-700 hover:underline text-xs flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            Visit
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── POS REFERRALS TAB (Phase 2 POS) ─── */}
        <TabsContent value="referrals" className="space-y-6">
          {/* Funnel KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase">Viewed</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {funnel?.counts.viewed ?? 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">offers opened</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase">Quoted</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {funnel?.counts.quoted ?? 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {funnel ? `${funnel.viewedToQuotedRate}% of viewed` : ""}
                </p>
              </CardContent>
            </Card>
            <Card className="border-green-200">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase">Referred</p>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {funnel?.counts.referred ?? 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {funnel ? `${funnel.quotedToReferredRate}% of quoted` : ""}
                </p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase">Converted</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">
                  {funnel?.convertedTrue ?? 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {funnel ? `${funnel.conversionRate}% of referred` : ""}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Funnel chart + top products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-700" />
                  Funnel stages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {funnelChartData.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">No funnel data yet.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="stage" fontSize={11} stroke="#94a3b8" />
                        <YAxis fontSize={11} stroke="#94a3b8" />
                        <Tooltip />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {funnelChartData.map((e, i) => (
                            <Cell key={i} fill={e.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="w-4 h-4 text-green-700" />
                  Top products by referral activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {funnel && funnel.topProducts.length > 0 ? (
                  <div className="space-y-2">
                    {funnel.topProducts.slice(0, 8).map((p) => (
                      <div
                        key={p.productId}
                        className="flex items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-100"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{p.productName}</div>
                          <div className="text-[11px] text-slate-500">
                            {p.subsidyType === "government" ? "🏛 Govt" : "🏢 Private"} ·{" "}
                            {p.subScheme}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {p.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 py-8 text-center">
                    No product activity yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent referrals table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  Recent referrals ({referralMeta?.total ?? referrals.length})
                </span>
                <select
                  value={referralActionFilter}
                  onChange={(e) => setReferralActionFilter(e.target.value)}
                  className="border border-slate-300 rounded-md px-3 py-1 text-xs bg-white"
                >
                  <option value="">All actions</option>
                  <option value="viewed">Viewed</option>
                  <option value="quoted">Quoted</option>
                  <option value="referred">Referred</option>
                </select>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {referrals.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">
                    No referrals yet. Farmers haven&apos;t browsed any offers.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">Quoted premium</TableHead>
                      <TableHead className="text-right">Govt. share</TableHead>
                      <TableHead>Converted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((r) => (
                      <TableRow key={r.referralId}>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(r.referredAt).toLocaleDateString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{r.farmerName}</div>
                          <div className="text-[11px] text-slate-500">{r.farmerMobile || "—"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm truncate max-w-xs">{r.productName || "—"}</div>
                          <div className="text-[11px] text-slate-500">
                            {r.productSubsidyType === "government" ? "🏛 Govt" : "🏢 Private"} ·{" "}
                            {r.insurerName || ""}
                          </div>
                        </TableCell>
                        <TableCell>{actionBadge(r.action)}</TableCell>
                        <TableCell className="text-right text-sm">
                          {r.quotedPremiumFarmer ? formatRupees(r.quotedPremiumFarmer) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm text-green-700">
                          {r.quotedPremiumSubsidy ? formatRupees(r.quotedPremiumSubsidy) : "—"}
                        </TableCell>
                        <TableCell>
                          {r.converted === true ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                              Yes
                            </Badge>
                          ) : r.converted === false ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                              No
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-slate-400">pending</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
