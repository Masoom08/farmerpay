"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Calendar, MapPin } from "lucide-react";
import { formatRupees } from "@/lib/api";

const DEMO_POLICIES = [
  { id: 1, type: "PMFBY", crop: "Paddy (Kharif 2026)", sumInsured: 220000, premium: 4400, subsidized: true, status: "active", validTill: "2026-09-30", village: "Kothapally", claimStatus: null },
  { id: 2, type: "Livestock", animal: "2 crossbred cows", sumInsured: 140000, premium: 7000, subsidized: false, status: "active", validTill: "2027-02-15", village: "Kothapally", claimStatus: null },
  { id: 3, type: "PMFBY", crop: "Wheat (Rabi 2025)", sumInsured: 180000, premium: 3600, subsidized: true, status: "expired", validTill: "2026-03-31", village: "Kothapally", claimStatus: "settled" },
];

export default function FarmerInsurancePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Insurance</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{DEMO_POLICIES.length}</p>
          <p className="text-xs text-slate-500">Total Policies</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{DEMO_POLICIES.filter(p => p.status === "active").length}</p>
          <p className="text-xs text-green-600">Active</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{formatRupees(DEMO_POLICIES.reduce((a, p) => a + p.sumInsured, 0))}</p>
          <p className="text-xs text-slate-500">Total Coverage</p>
        </CardContent></Card>
      </div>

      <div className="space-y-4">
        {DEMO_POLICIES.map((p) => (
          <Card key={p.id} className={`card-hover ${p.status === "active" ? "border-l-4 border-l-green-500" : "opacity-70"}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold text-lg">{p.type}</span>
                    <Badge variant="outline" className={p.status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500"}>
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{p.crop || p.animal}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatRupees(p.sumInsured)}</p>
                  <p className="text-xs text-slate-400">Sum insured</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-3">
                <span>Premium: {formatRupees(p.premium)} {p.subsidized && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200 ml-1">Subsidized</Badge>}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Valid till: {p.validTill}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.village}</span>
                {p.claimStatus && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Claim: {p.claimStatus}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
