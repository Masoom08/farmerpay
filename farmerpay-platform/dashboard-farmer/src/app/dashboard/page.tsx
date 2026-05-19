"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sprout, Wallet, ShieldCheck, HandHelping, CalendarClock, TrendingUp, ArrowRight,
} from "lucide-react";
import { formatRupees, formatRupeesCompact } from "@/lib/api";

export default function FarmerHomePage() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.has("demo");
  const q = isDemo ? "?demo=true" : "";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Namaste, Ramesh!</h1>
            <p className="text-green-100 text-sm">Kharif 2026 season is active</p>
          </div>
        </div>
        <div className="flex gap-6 mt-4 text-sm">
          <div><span className="text-green-200">Persona:</span> <span className="font-medium">Mixed farmer (Crop + Dairy)</span></div>
          <div><span className="text-green-200">Village:</span> <span className="font-medium">Kothapally, Rangareddy</span></div>
        </div>
        {isDemo && <Badge className="mt-3 bg-white/20 text-white border-white/30">Demo Mode</Badge>}
      </div>

      {/* Quick action tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Active Loan</p>
                <p className="text-xl font-bold mt-1">{formatRupees(250000)}</p>
                <p className="text-xs text-green-600">Disbursed — Kharif paddy</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Next EMI</p>
                <p className="text-xl font-bold mt-1">{formatRupees(8500)}</p>
                <p className="text-xs text-amber-600">Due: 15 Apr 2026</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <CalendarClock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Insurance</p>
                <p className="text-xl font-bold mt-1">PMFBY</p>
                <p className="text-xs text-green-600">Active till Sep 2026</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">My Sathi</p>
                <p className="text-xl font-bold mt-1">Priya Sharma</p>
                <p className="text-xs text-emerald-600">Bank Sakhi</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <HandHelping className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile completeness */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile Completeness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>82% complete</span>
            <span className="text-xs text-muted-foreground">Missing: Soil Health Card, Bank Passbook</span>
          </div>
          <Progress value={82} className="h-3" />
        </CardContent>
      </Card>

      {/* Activity cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">My Activities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="card-hover border-l-4 border-l-green-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌾</span>
                    <span className="font-semibold">Crop Farming</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Active</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Paddy — 2.5 ha — Kharif 2026</p>
                  <p className="text-xs text-slate-400 mt-1">Est. income: {formatRupeesCompact(180000)} / season</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover border-l-4 border-l-amber-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🐄</span>
                    <span className="font-semibold">Dairy</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Active</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">2 crossbred cows — avg 12L/day</p>
                  <p className="text-xs text-slate-400 mt-1">Est. income: {formatRupeesCompact(240000)} / year</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href={`/dashboard/loans${q}`} className="block">
          <Card className="card-hover text-center p-4"><Wallet className="h-6 w-6 mx-auto text-blue-600 mb-2" /><p className="text-sm font-medium">My Loans</p></Card>
        </Link>
        <Link href={`/dashboard/insurance${q}`} className="block">
          <Card className="card-hover text-center p-4"><ShieldCheck className="h-6 w-6 mx-auto text-purple-600 mb-2" /><p className="text-sm font-medium">Insurance</p></Card>
        </Link>
        <Link href={`/dashboard/my-sathi${q}`} className="block">
          <Card className="card-hover text-center p-4"><HandHelping className="h-6 w-6 mx-auto text-emerald-600 mb-2" /><p className="text-sm font-medium">My Sathi</p></Card>
        </Link>
        <Card className="card-hover text-center p-4 opacity-60">
          <TrendingUp className="h-6 w-6 mx-auto text-slate-400 mb-2" /><p className="text-sm font-medium text-slate-400">Market Prices</p>
        </Card>
      </div>
    </div>
  );
}
