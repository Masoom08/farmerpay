"use client";

import { useEffect, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Users, Search } from "lucide-react";
import { apiGet, formatRupees } from "@/lib/api";

interface Farmer {
  id: string;
  name: string;
  mobile?: string;
  village?: string;
  district?: string;
  loanAmount?: number;
  complianceScore?: number;
  riskStatus?: string;
}

const DEMO_FARMERS: Farmer[] = [
  { id: "1", name: "Ramesh Kumar", mobile: "9876543210", village: "Kothapally", district: "Rangareddy", loanAmount: 250000, complianceScore: 82, riskStatus: "on_track" },
  { id: "2", name: "Lakshmi Devi", mobile: "9876543211", village: "Kothapally", district: "Rangareddy", loanAmount: 150000, complianceScore: 78, riskStatus: "on_track" },
  { id: "3", name: "Suresh Reddy", mobile: "9876543212", village: "Ibrahimpatnam", district: "Rangareddy", loanAmount: 500000, complianceScore: 45, riskStatus: "at_risk" },
  { id: "4", name: "Anjali Kumari", mobile: "9876543213", village: "Shamshabad", district: "Rangareddy", loanAmount: 100000, complianceScore: 91, riskStatus: "on_track" },
  { id: "5", name: "Venkat Rao", mobile: "9876543214", village: "Ibrahimpatnam", district: "Rangareddy", loanAmount: 350000, complianceScore: 28, riskStatus: "off_track" },
  { id: "6", name: "Padma Bai", mobile: "9876543215", village: "Kothapally", district: "Rangareddy", loanAmount: 200000, complianceScore: 75, riskStatus: "on_track" },
  { id: "7", name: "Kiran Kumar", mobile: "9876543216", village: "Chevella", district: "Rangareddy", loanAmount: 175000, complianceScore: 52, riskStatus: "at_risk" },
  { id: "8", name: "Sita Devi", mobile: "9876543217", village: "Shamshabad", district: "Rangareddy", loanAmount: 300000, complianceScore: 84, riskStatus: "on_track" },
  { id: "9", name: "Mohan Das", mobile: "9876543218", village: "Maheshwaram", district: "Rangareddy", loanAmount: 400000, complianceScore: 67, riskStatus: "on_track" },
  { id: "10", name: "Priya Reddy", mobile: "9876543219", village: "Chevella", district: "Rangareddy", loanAmount: 225000, complianceScore: 38, riskStatus: "off_track" },
];

export default function FarmersPage() {
  const router = useRouter();
  const isDemo = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");
  const [farmers, setFarmers] = useState<Farmer[]>(isDemo ? DEMO_FARMERS : []);
  const [loading, setLoading] = useState(!isDemo);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isDemo) return;

    const token = localStorage.getItem("fp_token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        const res = await apiGet("/banker/farmers", token!);
        setFarmers(res.data || res.farmers || []);
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
  }, [router, isDemo]);

  const filtered = farmers.filter(
    (f) =>
      f.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.mobile?.includes(search) ||
      f.village?.toLowerCase().includes(search.toLowerCase())
  );

  const riskBadge = (status?: string) => {
    switch (status) {
      case "on_track":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            On Track
          </Badge>
        );
      case "at_risk":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            At Risk
          </Badge>
        );
      case "off_track":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Off Track
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-500">
            {status || "--"}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Farmers</h1>
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Farmers</h1>
        <Badge variant="secondary" className="text-sm">
          <Users className="w-3.5 h-3.5 mr-1" />
          {farmers.length} farmers
        </Badge>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name, mobile, or village..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Farmer Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Village</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead className="text-right">Loan Amount</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="text-slate-500 font-mono text-sm">
                      {f.mobile || "--"}
                    </TableCell>
                    <TableCell>{f.village || "--"}</TableCell>
                    <TableCell>{f.district || "--"}</TableCell>
                    <TableCell className="text-right">
                      {formatRupees(f.loanAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress
                          value={f.complianceScore ?? 0}
                          className="h-1.5 flex-1"
                        />
                        <span className="text-xs text-slate-500 w-8">
                          {f.complianceScore ?? 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{riskBadge(f.riskStatus)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">
              {search ? "No farmers match your search" : "No farmers found"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
