"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoadmapItem {
  title: string;
  module: string;
  done: boolean;
}

interface Phase {
  name: string;
  description: string;
  completed: number;
  total: number;
  color: string;
  items: RoadmapItem[];
}

const PHASES: Phase[] = [
  {
    name: "Phase 1 - Foundation",
    description: "Core banking integration, farmer onboarding, and basic lending",
    completed: 28,
    total: 28,
    color: "green",
    items: [
      { title: "Farmer registration with Aadhaar eKYC", module: "Onboarding", done: true },
      { title: "AgriStack land record integration", module: "AgriStack", done: true },
      { title: "KCC loan origination via Finacle", module: "Core Banking", done: true },
      { title: "CIBIL credit check integration", module: "Credit Bureau", done: true },
      { title: "UPI collection for repayments", module: "Payments", done: true },
      { title: "NACH mandate setup", module: "Payments", done: true },
      { title: "Basic portfolio dashboard", module: "Dashboard", done: true },
      { title: "PMFBY insurance enrollment", module: "Insurance", done: true },
      { title: "eNAM mandi price feed", module: "Market Data", done: true },
      { title: "MSP comparison alerts", module: "Market Data", done: true },
      { title: "IBJA gold price integration", module: "Gold Loan", done: true },
      { title: "Gold loan LTV calculator", module: "Gold Loan", done: true },
      { title: "RBI DLG compliance framework", module: "Compliance", done: true },
      { title: "Consent management system", module: "Compliance", done: true },
      { title: "Grievance redressal portal", module: "Compliance", done: true },
      { title: "Key Fact Statement generation", module: "Compliance", done: true },
      { title: "Farmer risk scoring (basic)", module: "Risk", done: true },
      { title: "Early warning system (v1)", module: "Risk", done: true },
      { title: "SMS/WhatsApp notifications", module: "Comms", done: true },
      { title: "Banker mobile app (basic)", module: "Mobile", done: true },
      { title: "PAN verification", module: "KYC", done: true },
      { title: "Scale of Finance data", module: "DICE", done: true },
      { title: "Loan disbursement via NEFT/RTGS", module: "Payments", done: true },
      { title: "Portfolio overview analytics", module: "Analytics", done: true },
      { title: "Compliance trend tracking", module: "Analytics", done: true },
      { title: "Farmer profile management", module: "Onboarding", done: true },
      { title: "Document upload and storage", module: "Platform", done: true },
      { title: "Audit trail logging", module: "Platform", done: true },
    ],
  },
  {
    name: "Phase 2 - Intelligence",
    description: "AI-powered insights, advanced risk analytics, and forecasting",
    completed: 12,
    total: 12,
    color: "blue",
    items: [
      { title: "ML-based crop yield prediction", module: "AI/ML", done: true },
      { title: "Satellite imagery crop health monitoring", module: "AgriStack", done: true },
      { title: "Weather-indexed risk scoring", module: "Risk", done: true },
      { title: "Commodity price forecasting (7d/15d/30d)", module: "Market Data", done: true },
      { title: "Dynamic interest rate adjustment", module: "Core Banking", done: true },
      { title: "Automated loan restructuring recommendations", module: "AI/ML", done: true },
      { title: "NPA prediction model", module: "Risk", done: true },
      { title: "Farmer income estimation", module: "AI/ML", done: true },
      { title: "Smart collection scheduling", module: "Collections", done: true },
      { title: "Video KYC integration", module: "KYC", done: true },
      { title: "Multi-language support (11 languages)", module: "Platform", done: true },
      { title: "Advanced analytics dashboard", module: "Analytics", done: true },
    ],
  },
  {
    name: "Phase 3 - Ecosystem",
    description: "Marketplace, supply chain finance, and partner integrations",
    completed: 10,
    total: 10,
    color: "purple",
    items: [
      { title: "Farmer marketplace for inputs", module: "Marketplace", done: true },
      { title: "Supply chain finance for aggregators", module: "SCF", done: true },
      { title: "Warehouse receipt financing", module: "SCF", done: true },
      { title: "FPO lending module", module: "Lending", done: true },
      { title: "Livestock insurance integration", module: "Insurance", done: true },
      { title: "Weather insurance products", module: "Insurance", done: true },
      { title: "DigiLocker document fetch", module: "KYC", done: true },
      { title: "eRupi voucher disbursement", module: "Payments", done: true },
      { title: "CRIF High Mark integration", module: "Credit Bureau", done: true },
      { title: "Commodity futures hedging advisory", module: "Market Data", done: true },
    ],
  },
  {
    name: "Phase 4 - Scale",
    description: "Multi-bank platform, open APIs, and national rollout",
    completed: 8,
    total: 8,
    color: "amber",
    items: [
      { title: "Multi-bank support (white-label)", module: "Platform", done: true },
      { title: "Open API marketplace", module: "Platform", done: true },
      { title: "Account aggregator integration", module: "Data", done: true },
      { title: "OCEN lending network integration", module: "Lending", done: true },
      { title: "Real-time CBS integration (beyond Finacle)", module: "Core Banking", done: true },
      { title: "State-level customization engine", module: "Platform", done: true },
      { title: "Regulatory reporting automation", module: "Compliance", done: true },
      { title: "Performance benchmarking across banks", module: "Analytics", done: true },
    ],
  },
];

const PHASE_COLORS: Record<string, { progress: string; badge: string; bg: string }> = {
  green: {
    progress: "bg-green-600",
    badge: "bg-green-50 text-green-700 border-green-200",
    bg: "bg-green-500",
  },
  blue: {
    progress: "bg-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    bg: "bg-blue-500",
  },
  purple: {
    progress: "bg-purple-600",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    bg: "bg-purple-500",
  },
  amber: {
    progress: "bg-amber-600",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    bg: "bg-amber-500",
  },
};

export default function RoadmapPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(PHASES.map((p) => [p.name, true]))
  );

  function toggle(name: string) {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Feature Roadmap</h1>

      {/* Summary bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {PHASES.map((phase) => {
          const pct = Math.round((phase.completed / phase.total) * 100);
          const colors = PHASE_COLORS[phase.color];
          return (
            <Card key={phase.name} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", colors.bg)} />
                  <p className="text-xs font-medium text-slate-500 truncate">
                    {phase.name.split(" - ")[1]}
                  </p>
                </div>
                <p className="text-xl font-bold text-slate-900 mb-1">
                  {phase.completed}/{phase.total}
                </p>
                <Progress value={pct} className="h-1.5" />
                <p className="text-xs text-slate-400 mt-1">{pct}% complete</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Phase details */}
      <div className="space-y-4">
        {PHASES.map((phase) => {
          const pct = Math.round((phase.completed / phase.total) * 100);
          const colors = PHASE_COLORS[phase.color];
          return (
            <Card key={phase.name}>
              <CardHeader
                className="cursor-pointer py-4"
                onClick={() => toggle(phase.name)}
              >
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn("w-3 h-3 rounded-full", colors.bg)}
                    />
                    <span>{phase.name}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", colors.badge)}
                    >
                      {phase.completed}/{phase.total}
                    </Badge>
                    {pct === 100 && (
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        Complete
                      </Badge>
                    )}
                  </div>
                  {expanded[phase.name] ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </CardTitle>
                <p className="text-sm text-slate-500 ml-6 mt-1">
                  {phase.description}
                </p>
              </CardHeader>
              {expanded[phase.name] && (
                <CardContent className="pt-0 pb-4">
                  <div className="space-y-1">
                    {phase.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50"
                      >
                        {item.done ? (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        )}
                        <span
                          className={cn(
                            "text-sm flex-1",
                            item.done
                              ? "text-slate-600"
                              : "text-slate-800"
                          )}
                        >
                          {item.title}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-slate-500 border-slate-200"
                        >
                          {item.module}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
