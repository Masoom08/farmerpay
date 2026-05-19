"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Gem, Calculator, Loader2 } from "lucide-react";
import { apiGet, apiPost, formatRupees } from "@/lib/api";

interface IbjaPrice {
  price22k?: number;
  price24k?: number;
  date?: string;
}

interface CalcResult {
  netWeight?: number;
  purityFactor?: number;
  totalValue?: number;
  maxLoan85?: number;
  maxLoan80?: number;
  maxLoan75?: number;
}

const LTV_TIERS = [
  {
    ltv: "85%",
    label: "Tier 1",
    desc: "Up to 2 lakhs",
    color: "bg-green-50 text-green-700",
  },
  {
    ltv: "80%",
    label: "Tier 2",
    desc: "2-5 lakhs",
    color: "bg-blue-50 text-blue-700",
  },
  {
    ltv: "75%",
    label: "Tier 3",
    desc: "Above 5 lakhs",
    color: "bg-amber-50 text-amber-700",
  },
];

export default function GoldLoanPage() {
  const router = useRouter();
  const [ibja, setIbja] = useState<IbjaPrice | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculator state
  const [weight, setWeight] = useState("");
  const [stoneDeduction, setStoneDeduction] = useState("");
  const [purity, setPurity] = useState("");
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [calcError, setCalcError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("fp_token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        const res = await apiGet("/dice/gold-loan/ibja-price", token!);
        setIbja(res.data || res);
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

  async function handleCalculate() {
    const token = localStorage.getItem("fp_token");
    if (!token) return;

    setCalcError("");
    setCalcLoading(true);

    try {
      const res = await apiPost(
        "/dice/gold-loan/calculate-value",
        {
          weight: parseFloat(weight),
          stoneDeduction: parseFloat(stoneDeduction || "0"),
          purity: parseFloat(purity || "22"),
        },
        token
      );
      const data = res.data || res;
      setCalcResult({
        netWeight: data.netWeight || data.net_weight,
        purityFactor: data.purityFactor || data.purity_factor,
        totalValue: data.totalValue || data.total_value || data.goldValue,
        maxLoan85: data.maxLoan85 || data.ltv85 || (data.totalValue || data.goldValue || 0) * 0.85,
        maxLoan80: data.maxLoan80 || data.ltv80 || (data.totalValue || data.goldValue || 0) * 0.80,
        maxLoan75: data.maxLoan75 || data.ltv75 || (data.totalValue || data.goldValue || 0) * 0.75,
      });
    } catch {
      setCalcError("Calculation failed. Please check inputs.");
    } finally {
      setCalcLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Gold Loan Management
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="skeleton h-4 w-24 mb-3" />
                <div className="skeleton h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">
        Gold Loan Management
      </h1>

      {/* IBJA Price Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Gem className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  IBJA 22K Price
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatRupees(ibja?.price22k)}/g
                </p>
              </div>
            </div>
            {ibja?.date && (
              <p className="text-xs text-slate-400">
                As of {new Date(ibja.date).toLocaleDateString("en-IN")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                <Gem className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  IBJA 24K Price
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatRupees(ibja?.price24k)}/g
                </p>
              </div>
            </div>
            {ibja?.date && (
              <p className="text-xs text-slate-400">
                As of {new Date(ibja.date).toLocaleDateString("en-IN")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* LTV Tiering Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">LTV Tiering Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>LTV Ratio</TableHead>
                <TableHead>Loan Range</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LTV_TIERS.map((tier) => (
                <TableRow key={tier.ltv}>
                  <TableCell>
                    <Badge variant="outline" className={tier.color}>
                      {tier.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{tier.ltv}</TableCell>
                  <TableCell className="text-slate-600">{tier.desc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Gold Value Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-600" />
            Gold Value Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Gross Weight (g)
              </label>
              <Input
                type="number"
                placeholder="e.g. 50"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Stone Deduction (g)
              </label>
              <Input
                type="number"
                placeholder="e.g. 2"
                value={stoneDeduction}
                onChange={(e) => setStoneDeduction(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Purity (K)
              </label>
              <Input
                type="number"
                placeholder="e.g. 22"
                value={purity}
                onChange={(e) => setPurity(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleCalculate}
                disabled={!weight || calcLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {calcLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Calculator className="w-4 h-4 mr-2" />
                )}
                Calculate
              </Button>
            </div>
          </div>

          {calcError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
              {calcError}
            </div>
          )}

          {calcResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Net Weight</p>
                <p className="text-lg font-bold text-slate-900">
                  {calcResult.netWeight?.toFixed(2) ?? "--"} g
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Purity Factor</p>
                <p className="text-lg font-bold text-slate-900">
                  {calcResult.purityFactor?.toFixed(3) ?? "--"}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <p className="text-xs text-amber-600 mb-1">Total Gold Value</p>
                <p className="text-lg font-bold text-amber-700">
                  {formatRupees(calcResult.totalValue)}
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs text-green-600 mb-1">
                  Max Loan @ 85% LTV
                </p>
                <p className="text-lg font-bold text-green-700">
                  {formatRupees(calcResult.maxLoan85)}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-600 mb-1">
                  Max Loan @ 80% LTV
                </p>
                <p className="text-lg font-bold text-blue-700">
                  {formatRupees(calcResult.maxLoan80)}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-xs text-purple-600 mb-1">
                  Max Loan @ 75% LTV
                </p>
                <p className="text-lg font-bold text-purple-700">
                  {formatRupees(calcResult.maxLoan75)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
