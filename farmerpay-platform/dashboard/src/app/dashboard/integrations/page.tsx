"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Leaf,
  CreditCard,
  UserCheck,
  Shield,
  CloudRain,
  Banknote,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

type IntegrationStatus = "LIVE" | "READY" | "STUB" | "PLANNED";

interface Integration {
  name: string;
  description: string;
  status: IntegrationStatus;
}

interface Category {
  title: string;
  icon: React.ElementType;
  color: string;
  items: Integration[];
}

const STATUS_STYLES: Record<IntegrationStatus, string> = {
  LIVE: "bg-green-50 text-green-700 border-green-200",
  READY: "bg-blue-50 text-blue-700 border-blue-200",
  STUB: "bg-amber-50 text-amber-700 border-amber-200",
  PLANNED: "bg-slate-50 text-slate-500 border-slate-200",
};

const CATEGORIES: Category[] = [
  {
    title: "Core Banking (Finacle)",
    icon: Database,
    color: "text-blue-600",
    items: [
      { name: "Account Inquiry", description: "Real-time account balance and transaction fetch", status: "LIVE" },
      { name: "Loan Origination", description: "KCC/Gold loan creation and disbursement", status: "LIVE" },
      { name: "Loan Repayment", description: "EMI collection and prepayment processing", status: "LIVE" },
      { name: "Standing Instructions", description: "Auto-debit mandate management", status: "READY" },
    ],
  },
  {
    title: "AgriStack",
    icon: Leaf,
    color: "text-green-600",
    items: [
      { name: "Farmer Registry", description: "Aadhaar-linked farmer identity verification", status: "LIVE" },
      { name: "Land Records", description: "Digital land parcel and ownership validation", status: "LIVE" },
      { name: "Crop Sowing Data", description: "Satellite-based crop identification", status: "STUB" },
      { name: "Weather Advisory", description: "Geo-tagged weather alerts and advisories", status: "READY" },
    ],
  },
  {
    title: "Vistaar (Agri Lending)",
    icon: BarChart3,
    color: "text-purple-600",
    items: [
      { name: "Credit Scoring", description: "Alternative credit scoring for farmers", status: "LIVE" },
      { name: "Loan Monitoring", description: "Portfolio risk monitoring and alerts", status: "LIVE" },
      { name: "Collection Engine", description: "Automated collection workflow", status: "READY" },
    ],
  },
  {
    title: "Credit Bureau",
    icon: CreditCard,
    color: "text-indigo-600",
    items: [
      { name: "CIBIL Check", description: "TransUnion CIBIL score and report pull", status: "LIVE" },
      { name: "Equifax Check", description: "Equifax credit report integration", status: "STUB" },
      { name: "CRIF High Mark", description: "Microfinance bureau data", status: "PLANNED" },
    ],
  },
  {
    title: "KYC & Identity",
    icon: UserCheck,
    color: "text-teal-600",
    items: [
      { name: "Aadhaar eKYC", description: "UIDAI-based electronic KYC", status: "LIVE" },
      { name: "PAN Verification", description: "Income tax PAN validation", status: "LIVE" },
      { name: "Video KYC", description: "RBI-compliant video KYC for remote onboarding", status: "READY" },
      { name: "DigiLocker", description: "Document fetch from DigiLocker", status: "STUB" },
    ],
  },
  {
    title: "Insurance",
    icon: Shield,
    color: "text-emerald-600",
    items: [
      { name: "PMFBY Integration", description: "Crop insurance enrollment and claims", status: "LIVE" },
      { name: "Weather Insurance", description: "Index-based weather insurance products", status: "STUB" },
      { name: "Livestock Insurance", description: "Cattle and livestock coverage", status: "PLANNED" },
    ],
  },
  {
    title: "Market Data",
    icon: CloudRain,
    color: "text-orange-600",
    items: [
      { name: "eNAM Prices", description: "Real-time mandi prices from eNAM", status: "LIVE" },
      { name: "IBJA Gold Rates", description: "Daily gold price feed from IBJA", status: "LIVE" },
      { name: "IMD Weather", description: "India Meteorological Department forecasts", status: "READY" },
      { name: "Commodity Futures", description: "NCDEX/MCX commodity derivatives data", status: "PLANNED" },
    ],
  },
  {
    title: "Payments",
    icon: Banknote,
    color: "text-cyan-600",
    items: [
      { name: "UPI Collection", description: "UPI-based loan repayment collection", status: "LIVE" },
      { name: "NACH Mandate", description: "National Automated Clearing House debit", status: "LIVE" },
      { name: "NEFT/RTGS", description: "Fund transfer for loan disbursement", status: "LIVE" },
      { name: "eRupi Voucher", description: "Purpose-bound digital vouchers", status: "PLANNED" },
    ],
  },
];

export default function IntegrationsPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.title, true]))
  );

  function toggle(title: string) {
    setExpanded((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Integration Hub</h1>
        <div className="flex gap-3 text-xs">
          {(["LIVE", "READY", "STUB", "PLANNED"] as IntegrationStatus[]).map(
            (s) => (
              <div key={s} className="flex items-center gap-1.5">
                <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[s])}>
                  {s}
                </Badge>
              </div>
            )
          )}
        </div>
      </div>

      <div className="space-y-4">
        {CATEGORIES.map((cat) => (
          <Card key={cat.title}>
            <CardHeader
              className="cursor-pointer py-4"
              onClick={() => toggle(cat.title)}
            >
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <cat.icon className={cn("w-5 h-5", cat.color)} />
                  <span>{cat.title}</span>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {cat.items.length} integrations
                  </Badge>
                </div>
                {expanded[cat.title] ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </CardTitle>
            </CardHeader>
            {expanded[cat.title] && (
              <CardContent className="pt-0 pb-4">
                <div className="space-y-2">
                  {cat.items.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", STATUS_STYLES[item.status])}
                      >
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
