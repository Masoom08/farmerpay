"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Wallet, CalendarClock, CheckCircle, Clock } from "lucide-react";
import { formatRupees } from "@/lib/api";

const DEMO_LOANS = [
  { id: 1, product: "KCC Crop Loan", provider: "District Cooperative Bank", amount: 250000, sanctionedAmount: 220000, tenure: 12, status: "disbursed", intendedUse: "Kharif paddy — seeds + fertilizer", appliedAt: "2026-02-10", disbursedAt: "2026-02-28", nextEmi: 8500, nextEmiDate: "2026-04-15", paidEmis: 1, totalEmis: 12 },
  { id: 2, product: "Dairy Term Loan", provider: "Regional Rural Bank", amount: 175000, sanctionedAmount: 175000, tenure: 24, status: "sanctioned", intendedUse: "Cattle purchase — 2 crossbred cows", appliedAt: "2026-03-20", disbursedAt: null, nextEmi: null, nextEmiDate: null, paidEmis: 0, totalEmis: 24 },
  { id: 3, product: "KCC Crop Loan", provider: "District Cooperative Bank", amount: 180000, sanctionedAmount: 180000, tenure: 12, status: "closed", intendedUse: "Rabi wheat 2025", appliedAt: "2025-09-15", disbursedAt: "2025-10-01", nextEmi: null, nextEmiDate: null, paidEmis: 12, totalEmis: 12 },
];

const statusStyle: Record<string, { cls: string; label: string }> = {
  draft: { cls: "bg-slate-50 text-slate-600", label: "Draft" },
  submitted: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Submitted" },
  sanctioned: { cls: "bg-blue-50 text-blue-700 border-blue-200", label: "Sanctioned" },
  disbursed: { cls: "bg-green-50 text-green-700 border-green-200", label: "Disbursed" },
  closed: { cls: "bg-slate-50 text-slate-500", label: "Closed" },
  rejected: { cls: "bg-red-50 text-red-700 border-red-200", label: "Rejected" },
};

export default function FarmerLoansPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Loans</h1>

      <div className="space-y-4">
        {DEMO_LOANS.map((loan) => {
          const s = statusStyle[loan.status] || statusStyle.draft;
          const repayPercent = loan.totalEmis > 0 ? Math.round((loan.paidEmis / loan.totalEmis) * 100) : 0;
          return (
            <Card key={loan.id} className={`card-hover ${loan.status === "disbursed" ? "border-l-4 border-l-green-500" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{loan.product}</span>
                      <Badge variant="outline" className={s.cls}>{s.label}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">{loan.provider}</p>
                    <p className="text-xs text-slate-400 mt-1">{loan.intendedUse}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatRupees(loan.sanctionedAmount)}</p>
                    <p className="text-xs text-slate-400">{loan.tenure} months tenure</p>
                  </div>
                </div>

                {loan.status === "disbursed" && loan.nextEmi && (
                  <div className="bg-amber-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">Next EMI: {formatRupees(loan.nextEmi)}</span>
                      </div>
                      <span className="text-xs text-amber-600">Due: {loan.nextEmiDate}</span>
                    </div>
                  </div>
                )}

                {loan.totalEmis > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Repayment: {loan.paidEmis} / {loan.totalEmis} EMIs</span>
                      <span>{repayPercent}%</span>
                    </div>
                    <Progress value={repayPercent} className="h-2" />
                  </div>
                )}

                <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                  <span>Applied: {loan.appliedAt}</span>
                  {loan.disbursedAt && <span>Disbursed: {loan.disbursedAt}</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
