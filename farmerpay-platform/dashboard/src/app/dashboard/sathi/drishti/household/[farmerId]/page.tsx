"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getHouseholdIncome, upsertHouseholdIncome,
  getHouseholdExpenses, upsertHouseholdExpense,
  getHouseholdSummary, formatCompact,
} from "@/lib/drishti";
import { formatRupees } from "@/lib/api";

const INCOME_TYPES = [
  { key: "spouse_shg", label: "Spouse SHG Income", icon: "👩‍🤝‍👩" },
  { key: "wage_labor", label: "Wage Labor", icon: "🔨" },
  { key: "mgnrega", label: "MGNREGA", icon: "🏗️" },
  { key: "pension", label: "Pension", icon: "👴" },
  { key: "remittance", label: "Remittances", icon: "💸" },
  { key: "petty_business", label: "Petty Business / Shop", icon: "🏪" },
  { key: "govt_transfer", label: "Govt Transfers (PM-KISAN)", icon: "🏛️" },
  { key: "rental", label: "Rental Income", icon: "🏡" },
  { key: "other", label: "Other Income", icon: "💰" },
];

const EXPENSE_TYPES = [
  { key: "food_groceries", label: "Food & Groceries" },
  { key: "education", label: "Education" },
  { key: "healthcare", label: "Healthcare" },
  { key: "housing", label: "Housing / Rent" },
  { key: "social_obligations", label: "Festivals / Ceremonies" },
  { key: "transportation", label: "Transportation" },
  { key: "utilities", label: "Utilities" },
  { key: "non_farm_loan_emi", label: "Non-Farm Loan EMI" },
];

export default function HouseholdCollector() {
  const { farmerId } = useParams<{ farmerId: string }>();
  const [step, setStep] = useState<"income" | "expenses" | "summary">("income");
  const [incomeValues, setIncomeValues] = useState<Record<string, string>>({});
  const [expenseValues, setExpenseValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") || "" : "";

  // Load existing data
  useEffect(() => {
    if (!farmerId || !token) return;
    getHouseholdIncome(token, Number(farmerId)).then((items: any[]) => {
      const vals: Record<string, string> = {};
      (items || []).forEach((item: any) => { vals[item.sourceType || item.source_type] = String(item.amountMonthlyEquivalent || item.amount || 0); });
      setIncomeValues(vals);
    }).catch(() => {});
    getHouseholdExpenses(token, Number(farmerId)).then((items: any[]) => {
      const vals: Record<string, string> = {};
      (items || []).forEach((item: any) => { vals[item.category] = String(item.amountMonthlyEquivalent || item.amount || 0); });
      setExpenseValues(vals);
    }).catch(() => {});
  }, [farmerId, token]);

  const saveIncome = async () => {
    setSaving(true);
    try {
      for (const [type, amount] of Object.entries(incomeValues)) {
        if (Number(amount) > 0) {
          await upsertHouseholdIncome(token, Number(farmerId), {
            source_type: type, earning_member: "farmer",
            amount: Number(amount), frequency: "monthly",
          });
        }
      }
      setStep("expenses");
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const saveExpenses = async () => {
    setSaving(true);
    try {
      for (const [category, amount] of Object.entries(expenseValues)) {
        if (Number(amount) > 0) {
          await upsertHouseholdExpense(token, Number(farmerId), {
            category, amount: Number(amount), frequency: "monthly",
          });
        }
      }
      const sum = await getHouseholdSummary(token, Number(farmerId));
      setSummary(sum);
      setStep("summary");
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Household Data — Farmer #{farmerId}</h1>
        <p className="text-sm text-slate-500">Collect income sources and expenses during field visit</p>
      </div>

      {/* Steps indicator */}
      <div className="flex gap-2">
        {["income", "expenses", "summary"].map((s, i) => (
          <div key={s} className={`flex-1 h-1.5 rounded ${step === s ? "bg-green-500" : i < ["income", "expenses", "summary"].indexOf(step) ? "bg-green-300" : "bg-slate-200"}`} />
        ))}
      </div>

      {step === "income" && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Step 1: Non-Farm Income Sources</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {INCOME_TYPES.map((t) => (
              <div key={t.key} className="flex items-center gap-3">
                <span className="text-lg w-8">{t.icon}</span>
                <span className="text-sm font-medium w-40">{t.label}</span>
                <Input type="number" placeholder="₹ per month" value={incomeValues[t.key] || ""}
                  onChange={(e) => setIncomeValues({ ...incomeValues, [t.key]: e.target.value })} className="max-w-32" />
              </div>
            ))}
            <Button onClick={saveIncome} disabled={saving} className="w-full mt-4">{saving ? "Saving..." : "Save & Continue →"}</Button>
          </CardContent>
        </Card>
      )}

      {step === "expenses" && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Step 2: Monthly Household Expenses</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {EXPENSE_TYPES.map((t) => (
              <div key={t.key} className="flex items-center gap-3">
                <span className="text-sm font-medium w-48">{t.label}</span>
                <Input type="number" placeholder="₹ per month" value={expenseValues[t.key] || ""}
                  onChange={(e) => setExpenseValues({ ...expenseValues, [t.key]: e.target.value })} className="max-w-32" />
              </div>
            ))}
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setStep("income")}>← Back</Button>
              <Button onClick={saveExpenses} disabled={saving} className="flex-1">{saving ? "Saving..." : "Save & View Summary →"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "summary" && summary && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Household Financial Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-slate-500">Monthly Income</p>
                <p className="text-xl font-bold text-green-700">{formatRupees(summary.totals?.monthly_income)}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-slate-500">Monthly Expenses</p>
                <p className="text-xl font-bold text-red-700">{formatRupees(summary.totals?.monthly_expense)}</p>
              </div>
              <div className={`p-3 rounded-lg col-span-2 ${summary.totals?.monthly_surplus >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                <p className="text-xs text-slate-500">Monthly Surplus/Deficit</p>
                <p className={`text-2xl font-bold ${summary.totals?.monthly_surplus >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {formatRupees(summary.totals?.monthly_surplus)}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">{summary.income?.stream_count || 0} income streams · {summary.expenses?.category_count || 0} expense categories</p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setStep("expenses")}>← Edit</Button>
              <Button className="flex-1" onClick={() => window.open(`/dashboard/drishti/farmer-risk/${farmerId}`, "_blank")}>
                📊 Run Portfolio Optimizer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
