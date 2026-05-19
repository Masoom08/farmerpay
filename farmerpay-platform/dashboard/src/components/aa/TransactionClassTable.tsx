"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ClassifiedTransaction } from "@/lib/aa";

interface Props {
  transactions: ClassifiedTransaction[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  onFilterType: (type: string | null) => void;
  onFilterCategory: (cat: string | null) => void;
  activeType: string | null;
  activeCategory: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  farm_sale: "bg-green-100 text-green-700",
  dairy_livestock: "bg-amber-100 text-amber-700",
  fishery: "bg-blue-100 text-blue-700",
  govt_transfer: "bg-indigo-100 text-indigo-700",
  shg_income: "bg-purple-100 text-purple-700",
  wage_salary: "bg-cyan-100 text-cyan-700",
  remittance: "bg-pink-100 text-pink-700",
  business_income: "bg-slate-100 text-slate-700",
  loan_disbursement: "bg-orange-100 text-orange-700",
  farm_input: "bg-lime-100 text-lime-700",
  emi_repayment: "bg-red-100 text-red-700",
  household: "bg-sky-100 text-sky-700",
  education: "bg-violet-100 text-violet-700",
  health: "bg-rose-100 text-rose-700",
  ceremony: "bg-fuchsia-100 text-fuchsia-700",
  transport: "bg-teal-100 text-teal-700",
  cash_withdrawal: "bg-gray-100 text-gray-700",
};

export default function TransactionClassTable({
  transactions, total, page, onPageChange,
  onFilterType, onFilterCategory, activeType, activeCategory,
}: Props) {
  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-slate-500">Filter:</span>
        {["credit", "debit"].map(t => (
          <button
            key={t}
            onClick={() => onFilterType(activeType === t ? null : t)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-full border transition-colors",
              activeType === t
                ? (t === "credit" ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300")
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            )}
          >
            {t === "credit" ? "Credits" : "Debits"}
          </button>
        ))}
        {activeCategory ? (
          <button
            onClick={() => onFilterCategory(null)}
            className="px-2.5 py-1 text-xs rounded-full bg-blue-100 text-blue-700 border border-blue-300"
          >
            {formatCategory(activeCategory)} &times;
          </button>
        ) : null}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Amount</TableHead>
              <TableHead className="text-xs">Narration</TableHead>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs">Conf.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-slate-400 py-8">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : null}
            {transactions.map((txn) => {
              const category = txn.incomeCategory || txn.expenseCategory || "other";
              const colorClass = CATEGORY_COLORS[category] || "bg-slate-100 text-slate-600";
              return (
                <TableRow key={txn.transactionUuid} className="hover:bg-slate-50/50">
                  <TableCell className="text-xs text-slate-600">{txn.txnDate}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase",
                      txn.txnType === "credit" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                    )}>
                      {txn.txnType}
                    </span>
                  </TableCell>
                  <TableCell className={cn("text-sm font-medium", txn.txnType === "credit" ? "text-green-700" : "text-red-600")}>
                    {formatRupees(txn.amount)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-[200px] truncate">{txn.narration}</TableCell>
                  <TableCell>
                    <button onClick={() => onFilterCategory(category)}>
                      <Badge variant="outline" className={cn("text-[10px] cursor-pointer", colorClass)}>
                        {formatCategory(category)}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {txn.classificationConfidence ? `${Math.round(txn.classificationConfidence * 100)}%` : "-"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{total} transactions total</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Prev
            </Button>
            <span className="px-2 py-1">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
