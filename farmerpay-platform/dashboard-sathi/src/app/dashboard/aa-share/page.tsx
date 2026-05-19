"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, CheckCircle, MessageCircle } from "lucide-react";
import { apiGet, formatRupees } from "@/lib/api";
import { bandTokens, type ScoreBand } from "@/lib/design-tokens";
import { getReadinessFlags } from "@/lib/readiness";
import { instrumentReadiness } from "@/lib/readinessShadowLog";

interface ReadinessSummary {
  farmerName: string;
  readinessState: string;
  trustBand: ScoreBand | null;
  coachingPriority: string;
  nextSteps: string[];
}

const STATE_LABELS: Record<string, string> = {
  ready: "Ready",
  almost_ready: "Almost Ready",
  not_ready: "Not Ready",
  needs_data: "Needs Data",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
};

export default function AASharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const farmerId = searchParams.get("farmerId");
  const isDemo = searchParams.has("demo");

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReadinessSummary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("sathi_token");
    if (!token && !isDemo) { router.push("/login"); return; }

    async function load() {
      try {
        if (isDemo || !farmerId) {
          setSummary({
            farmerName: "Raju Kisan",
            readinessState: "almost_ready",
            trustBand: "building",
            coachingPriority: "medium",
            nextSteps: ["Guide farmer through AA consent to complete readiness assessment"],
          });
        } else {
          const [readinessRes, farmerRes] = await Promise.all([
            apiGet(`/readiness/${farmerId}`, token!),
            apiGet(`/banker/portfolio/farmers/${farmerId}`, token!).catch(() => null),
          ]);

          const flags = await getReadinessFlags(token!);
          let data = readinessRes.data;
          if (data && flags.sathiShadowLog) {
            data = instrumentReadiness(data, "aa-share", token!);
          }
          const farmerData = farmerRes?.data;

          setSummary({
            farmerName: farmerData?.name || `Farmer #${farmerId}`,
            readinessState: data?.state || "needs_data",
            trustBand: data?.trust?.band || null,
            coachingPriority: data?.coachingPriority || "medium",
            nextSteps: data?.reasons
              ?.filter((r: any) => r.status !== "met")
              .map((r: any) => r.labelKey || r.field) || [],
          });
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [farmerId, isDemo, router]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Loading...</p></div>;
  }

  if (!summary) {
    return <div className="text-center py-20 text-slate-400">No readiness data available for this farmer.</div>;
  }

  const shareText = buildShareText(summary);
  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stateLabel = STATE_LABELS[summary.readinessState] || "Needs Data";
  const priorityLabel = PRIORITY_LABELS[summary.coachingPriority] || "Medium Priority";

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-slate-900">Share Readiness Summary</h1>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-slate-500">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-50 rounded-lg p-4 text-sm font-mono whitespace-pre-line text-slate-700 leading-relaxed">
            {shareText}
          </div>
        </CardContent>
      </Card>

      {/* Readiness Badge */}
      <div className="flex items-center justify-center gap-3">
        <div className={`text-center px-6 py-3 rounded-xl ${stateStyle(summary.readinessState)}`}>
          <p className="text-lg font-bold">{stateLabel}</p>
          <p className="text-xs font-semibold">Loan Readiness</p>
        </div>
        {summary.trustBand && (
          <Badge variant="outline" className={bandStyle(summary.trustBand)}>
            TRUST: {bandTokens[summary.trustBand]?.labelEn || summary.trustBand}
          </Badge>
        )}
        <Badge variant="outline" className={priorityStyle(summary.coachingPriority)}>
          {priorityLabel}
        </Badge>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          className="w-full bg-[#25D366] hover:bg-[#1da851] text-white"
          onClick={() => window.open(whatsAppUrl, "_blank")}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Share via WhatsApp
        </Button>

        <Button variant="outline" className="w-full" onClick={handleCopy}>
          {copied ? <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2" />}
          {copied ? "Copied!" : "Copy to Clipboard"}
        </Button>
      </div>
    </div>
  );
}

function buildShareText(s: ReadinessSummary): string {
  const lines = [
    `Loan Readiness Summary — ${s.farmerName}`,
    ``,
    `Status: ${STATE_LABELS[s.readinessState] || "Needs Data"}`,
  ];
  if (s.trustBand) {
    lines.push(`TRUST Band: ${bandTokens[s.trustBand]?.labelEn || s.trustBand}`);
  }
  lines.push(`Coaching Priority: ${PRIORITY_LABELS[s.coachingPriority] || s.coachingPriority}`);
  lines.push(``);
  lines.push(`Generated via FarmerPay`);
  return lines.join("\n");
}

function stateStyle(state: string): string {
  switch (state) {
    case "ready": return "bg-green-50 text-green-700";
    case "almost_ready": return "bg-amber-50 text-amber-700";
    case "not_ready": return "bg-slate-50 text-slate-600";
    case "needs_data": return "bg-blue-50 text-blue-700";
    default: return "bg-slate-50 text-slate-500";
  }
}

function bandStyle(band: ScoreBand): string {
  switch (band) {
    case "strong": return "bg-green-50 text-green-600 border-green-200";
    case "building": return "bg-amber-50 text-amber-600 border-amber-200";
    case "low": return "bg-slate-50 text-slate-600 border-slate-200";
    default: return "";
  }
}

function priorityStyle(priority: string): string {
  switch (priority) {
    case "high": return "bg-red-50 text-red-600 border-red-200";
    case "medium": return "bg-amber-50 text-amber-600 border-amber-200";
    case "low": return "bg-green-50 text-green-600 border-green-200";
    default: return "";
  }
}
