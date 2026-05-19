"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, Search, MapPin, CheckCircle, ChevronUp, ChevronDown } from "lucide-react";
import { apiGet, formatRupees } from "@/lib/api";
import CoachingPriority, { type CoachingPriorityLevel } from "@/components/readiness/CoachingPriority";
import { getReadinessFlags } from "@/lib/readiness";

interface Farmer {
  id: number;
  uuid?: string;
  name: string;
  mobile: string;
  village: string;
  district: string;
  loanStatus: string;
  loanAmount: number;
  insuranceActive: boolean;
  riskStatus: string;
  lastNudge: string | null;
  coachingPriority?: CoachingPriorityLevel | null;
  /** Non-numeric reason text from readiness reasons[] */
  gapReason?: string | null;
}

const DEMO_FARMERS: Farmer[] = [
  { id: 1, uuid: "d1a1a1a1-0001-4000-a000-000000000001", name: "Ramesh Kumar", mobile: "9876543210", village: "Kothapally", district: "Rangareddy", loanStatus: "disbursed", loanAmount: 250000, insuranceActive: true, riskStatus: "on_track", lastNudge: "2026-04-08", coachingPriority: "low", gapReason: "TRUST score on track" },
  { id: 2, uuid: "d1a1a1a1-0002-4000-a000-000000000002", name: "Lakshmi Devi", mobile: "9876543211", village: "Kothapally", district: "Rangareddy", loanStatus: "sanctioned", loanAmount: 150000, insuranceActive: true, riskStatus: "on_track", lastNudge: "2026-04-05", coachingPriority: "medium", gapReason: "TRUST band is Building — needs coaching" },
  { id: 3, uuid: "d1a1a1a1-0003-4000-a000-000000000003", name: "Suresh Reddy", mobile: "9876543212", village: "Ibrahimpatnam", district: "Rangareddy", loanStatus: "disbursed", loanAmount: 500000, insuranceActive: false, riskStatus: "at_risk", lastNudge: "2026-04-09", coachingPriority: "high", gapReason: "TRUST below threshold — schedule coaching" },
  { id: 4, uuid: "d1a1a1a1-0004-4000-a000-000000000004", name: "Anjali Kumari", mobile: "9876543213", village: "Shamshabad", district: "Rangareddy", loanStatus: "repaid", loanAmount: 100000, insuranceActive: true, riskStatus: "on_track", lastNudge: null, coachingPriority: "low", gapReason: null },
  { id: 5, uuid: "d1a1a1a1-0005-4000-a000-000000000005", name: "Venkat Rao", mobile: "9876543214", village: "Ibrahimpatnam", district: "Rangareddy", loanStatus: "overdue", loanAmount: 350000, insuranceActive: false, riskStatus: "off_track", lastNudge: "2026-04-10", coachingPriority: "high", gapReason: "TRUST data missing — collect questionnaire" },
  { id: 6, uuid: "d1a1a1a1-0006-4000-a000-000000000006", name: "Padma Bai", mobile: "9876543215", village: "Kothapally", district: "Rangareddy", loanStatus: "disbursed", loanAmount: 200000, insuranceActive: true, riskStatus: "on_track", lastNudge: "2026-04-03", coachingPriority: "low", gapReason: null },
  { id: 7, uuid: "d1a1a1a1-0007-4000-a000-000000000007", name: "Kiran Kumar", mobile: "9876543216", village: "Chevella", district: "Rangareddy", loanStatus: "sanctioned", loanAmount: 175000, insuranceActive: false, riskStatus: "at_risk", lastNudge: "2026-04-07", coachingPriority: "medium", gapReason: "TRUST band is Building — needs coaching" },
  { id: 8, uuid: "d1a1a1a1-0008-4000-a000-000000000008", name: "Sita Devi", mobile: "9876543217", village: "Shamshabad", district: "Rangareddy", loanStatus: "disbursed", loanAmount: 300000, insuranceActive: true, riskStatus: "on_track", lastNudge: "2026-04-06", coachingPriority: "low", gapReason: null },
];

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

const loanBadge = (s: string) => {
  const m: Record<string, string> = {
    sanctioned: "bg-blue-50 text-blue-700 border-blue-200",
    disbursed: "bg-green-50 text-green-700 border-green-200",
    repaid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
  };
  return <Badge variant="outline" className={m[s] || ""}>{s}</Badge>;
};

const riskBadge = (s: string) => {
  const m: Record<string, string> = {
    on_track: "bg-green-50 text-green-700 border-green-200",
    at_risk: "bg-amber-50 text-amber-700 border-amber-200",
    off_track: "bg-red-50 text-red-700 border-red-200",
  };
  return <Badge variant="outline" className={m[s] || ""}>{s.replace("_", " ")}</Badge>;
};

type PriorityFilter = "all" | CoachingPriorityLevel;
type SortDir = "asc" | "desc";

const FILTER_CHIPS: { value: PriorityFilter; label: string; className: string; activeClassName: string }[] = [
  { value: "all",    label: "All",    className: "border-slate-200 text-slate-600 hover:bg-slate-50", activeClassName: "bg-slate-900 text-white border-slate-900 hover:bg-slate-800" },
  { value: "high",   label: "High",   className: "border-red-200 text-red-600 hover:bg-red-50",       activeClassName: "bg-red-600 text-white border-red-600 hover:bg-red-700" },
  { value: "medium", label: "Medium", className: "border-amber-200 text-amber-600 hover:bg-amber-50", activeClassName: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600" },
  { value: "low",    label: "Low",    className: "border-green-200 text-green-600 hover:bg-green-50", activeClassName: "bg-green-600 text-white border-green-600 hover:bg-green-700" },
];

export default function SathiFarmersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.has("demo");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortDir, setSortDir] = useState<SortDir>("asc"); // asc = High first
  const [alertedFarmers, setAlertedFarmers] = useState<Set<number>>(new Set());
  const [farmers, setFarmers] = useState<Farmer[]>(isDemo ? DEMO_FARMERS : []);
  const [loading, setLoading] = useState(!isDemo);
  const [coachingEnabled, setCoachingEnabled] = useState(false);

  useEffect(() => {
    if (isDemo) { setCoachingEnabled(true); return; }
    const token = localStorage.getItem("sathi_token");
    if (!token) { router.push("/login"); return; }
    Promise.all([
      apiGet("/sathi/dashboard/farmers", token),
      getReadinessFlags(token),
    ])
      .then(([r, flags]) => {
        if (Array.isArray(r.data)) setFarmers(r.data);
        setCoachingEnabled(flags.sathiCoachingPriority);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemo, router]);

  function handleAlertBanker(farmerId: number) {
    const token = localStorage.getItem("sathi_token");
    if (token && !isDemo) {
      apiGet("/sathi/issues", token).catch(() => {});
    }
    setAlertedFarmers((prev) => new Set(prev).add(farmerId));
  }

  const displayed = useMemo(() => {
    let list = farmers.filter(
      (f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.mobile.includes(search) ||
        f.village.toLowerCase().includes(search.toLowerCase())
    );

    // Filter by priority
    if (priorityFilter !== "all") {
      list = list.filter((f) => f.coachingPriority === priorityFilter);
    }

    // Sort by priority: High → Medium → Low (asc) or reverse (desc)
    list = [...list].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.coachingPriority || "low"] ?? 3;
      const pb = PRIORITY_ORDER[b.coachingPriority || "low"] ?? 3;
      return sortDir === "asc" ? pa - pb : pb - pa;
    });

    return list;
  }, [farmers, search, priorityFilter, sortDir]);

  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    farmers.forEach((f) => { if (f.coachingPriority) counts[f.coachingPriority]++; });
    return counts;
  }, [farmers]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading farmers...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Farmers</h1>
        <Badge variant="secondary" className="text-sm">
          <Users className="w-3.5 h-3.5 mr-1" />
          {farmers.length} assigned
        </Badge>
      </div>

      {/* Search + Filter row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, mobile, or village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Priority filter chips — hidden when coaching flag is off */}
        {coachingEnabled && (
          <div className="flex items-center gap-2" data-testid="priority-filters">
            <span className="text-xs font-medium text-slate-500 mr-1">Priority:</span>
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setPriorityFilter(chip.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  priorityFilter === chip.value ? chip.activeClassName : chip.className
                }`}
                data-testid={`filter-${chip.value}`}
              >
                {chip.label}
                {chip.value !== "all" && (
                  <span className="ml-1 opacity-70">({priorityCounts[chip.value] || 0})</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Assigned Farmers</span>
            <span className="text-xs text-slate-400 font-normal">
              {displayed.length} of {farmers.length} shown
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Village</TableHead>
                <TableHead>Loan Status</TableHead>
                <TableHead className="text-right">Loan Amt</TableHead>
                <TableHead>Insurance</TableHead>
                {coachingEnabled && (
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                      onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}
                      data-testid="sort-coaching"
                    >
                      Coaching
                      {sortDir === "asc"
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />
                      }
                    </button>
                  </TableHead>
                )}
                {coachingEnabled && <TableHead>Gap Reason</TableHead>}
                <TableHead>Risk</TableHead>
                <TableHead>Last Nudge</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((f) => (
                <TableRow
                  key={f.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/dashboard/farmers/${f.uuid || f.id}${isDemo ? "?demo=true" : ""}`)}
                >
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="text-slate-500 font-mono text-xs">{f.mobile}</TableCell>
                  <TableCell className="text-sm">{f.village}</TableCell>
                  <TableCell>{loanBadge(f.loanStatus)}</TableCell>
                  <TableCell className="text-right text-sm">{formatRupees(f.loanAmount)}</TableCell>
                  <TableCell>
                    {f.insuranceActive
                      ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                      : <Badge variant="outline" className="bg-slate-50 text-slate-500">None</Badge>
                    }
                  </TableCell>
                  {coachingEnabled && (
                    <TableCell>
                      <CoachingPriority priority={f.coachingPriority} compact />
                    </TableCell>
                  )}
                  {coachingEnabled && (
                    <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                      {f.gapReason || "\u2014"}
                    </TableCell>
                  )}
                  <TableCell>{riskBadge(f.riskStatus)}</TableCell>
                  <TableCell className="text-xs text-slate-500">{f.lastNudge || "\u2014"}</TableCell>
                  <TableCell>
                    <div onClick={(e) => e.stopPropagation()}>
                      {alertedFarmers.has(f.id) ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" /> Alerted
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-50"
                          onClick={() => handleAlertBanker(f.id)}
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          Alert Banker
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {displayed.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-slate-400 py-8">
                    No farmers match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
