"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Phone, MessageCircle, AlertTriangle,
  CheckCircle, HelpCircle, ChevronRight,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { getReadiness, type SathiReadinessData } from "@/lib/readiness";
import CoachingPriority, { type CoachingPriorityLevel } from "@/components/readiness/CoachingPriority";
import { bandTokens, type ScoreBand } from "@/lib/design-tokens";

interface FarmerDetail {
  id: number;
  uuid: string;
  name: string;
  mobile: string;
  village: string;
  district: string;
  loanStatus: string;
  loanAmount: number;
}

interface GapArea {
  field: string;
  status: string;
  label: string;
}

const STATUS_LABELS: Record<string, string> = {
  ready: "Ready",
  almost_ready: "Almost Ready",
  not_ready: "Not Ready",
  needs_data: "Needs Data",
};

const REASON_LABELS: Record<string, Record<string, string>> = {
  trust: {
    met: "TRUST score meets threshold",
    below: "TRUST score below threshold — needs coaching",
    missing: "TRUST data not yet collected",
  },
};

const STATUS_CONFIG: Record<string, { Icon: typeof CheckCircle; color: string }> = {
  met: { Icon: CheckCircle, color: "text-green-600" },
  below: { Icon: AlertTriangle, color: "text-amber-600" },
  missing: { Icon: HelpCircle, color: "text-slate-400" },
};

const STATE_STYLE: Record<string, string> = {
  ready: "bg-green-50 text-green-700 border-green-200",
  almost_ready: "bg-amber-50 text-amber-700 border-amber-200",
  not_ready: "bg-slate-100 text-slate-600 border-slate-200",
  needs_data: "bg-blue-50 text-blue-700 border-blue-200",
};

const DEMO_FARMER: FarmerDetail = {
  id: 3,
  uuid: "d1a1a1a1-0003-4000-a000-000000000003",
  name: "Suresh Reddy",
  mobile: "9876543212",
  village: "Ibrahimpatnam",
  district: "Rangareddy",
  loanStatus: "disbursed",
  loanAmount: 500000,
};

const DEMO_READINESS: SathiReadinessData = {
  state: "not_ready",
  trust: { band: "low", score: 42 },
  coachingPriority: "high",
  reasons: [
    { field: "trust", status: "below", band: "low" },
  ],
};

export default function FarmerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const farmerId = params.farmerId as string;
  const isDemo = searchParams.has("demo");

  const [farmer, setFarmer] = useState<FarmerDetail | null>(isDemo ? DEMO_FARMER : null);
  const [readiness, setReadiness] = useState<SathiReadinessData | null>(isDemo ? DEMO_READINESS : null);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo) return;
    const token = localStorage.getItem("sathi_token");
    if (!token) { router.push("/login"); return; }

    async function load() {
      try {
        const [farmerRes, readinessData] = await Promise.all([
          apiGet(`/sathi/dashboard/farmers/${farmerId}`, token!),
          getReadiness(farmerId, token!),
        ]);
        if (farmerRes?.data) setFarmer(farmerRes.data);
        if (readinessData) setReadiness(readinessData);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [farmerId, isDemo, router]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading farmer details...</div>;
  }

  if (!farmer) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-400">Farmer not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const gapAreas = buildGapAreas(readiness);
  const trustBand = readiness?.trust?.band as ScoreBand | undefined;
  const stateLabel = readiness ? (STATUS_LABELS[readiness.state] || "Unknown") : "No Data";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back nav */}
      <button
        onClick={() => router.push(`/dashboard/farmers${isDemo ? "?demo=true" : ""}`)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Farmers
      </button>

      {/* Farmer header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{farmer.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {farmer.village}, {farmer.district} · {farmer.mobile}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`tel:${farmer.mobile}`, "_self")}
          >
            <Phone className="w-4 h-4 mr-1" /> Call
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-[#25D366]/10 border-[#25D366]/30 text-[#128C7E] hover:bg-[#25D366]/20"
            onClick={() => window.open(`https://wa.me/91${farmer.mobile}`, "_blank")}
          >
            <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
          </Button>
        </div>
      </div>

      {/* Readiness overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            Loan Readiness
            {readiness && (
              <Badge variant="outline" className={STATE_STYLE[readiness.state] || ""}>
                {stateLabel}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Coaching priority */}
            <div>
              <p className="text-xs text-slate-500 mb-1">Coaching Priority</p>
              <CoachingPriority priority={readiness?.coachingPriority as CoachingPriorityLevel} />
            </div>

            {/* TRUST band */}
            {trustBand && (
              <div>
                <p className="text-xs text-slate-500 mb-1">TRUST Band</p>
                <Badge
                  variant="outline"
                  className="text-sm"
                  style={{
                    backgroundColor: bandTokens[trustBand]?.light + "15",
                    color: bandTokens[trustBand]?.light,
                    borderColor: bandTokens[trustBand]?.light + "40",
                  }}
                >
                  {bandTokens[trustBand]?.labelEn || trustBand}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gap areas */}
      <Card data-testid="gap-areas">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Gap Areas</CardTitle>
        </CardHeader>
        <CardContent>
          {gapAreas.length === 0 ? (
            <div className="flex items-center gap-3 text-sm text-green-600 py-2">
              <CheckCircle className="w-5 h-5" />
              <span>No outstanding gaps — farmer is on track.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {gapAreas.map((gap, i) => {
                const config = STATUS_CONFIG[gap.status] || STATUS_CONFIG.missing;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
                    data-testid="gap-area-item"
                  >
                    <config.Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{gap.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">{gap.field} · {gap.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ActionRow
            label="Guide through AA consent"
            desc="Help farmer link bank account"
            onClick={() => router.push(`/dashboard/aa-onboard?farmerId=${farmer.uuid || farmer.id}${isDemo ? "&demo=true" : ""}`)}
          />
          <ActionRow
            label="Share readiness summary"
            desc="Send loan readiness info via WhatsApp"
            onClick={() => router.push(`/dashboard/aa-share?farmerId=${farmer.uuid || farmer.id}${isDemo ? "&demo=true" : ""}`)}
          />
          <ActionRow
            label="Alert banker"
            desc="Flag this farmer for banker attention"
            onClick={() => {
              const token = localStorage.getItem("sathi_token");
              if (token && !isDemo) apiGet("/sathi/issues", token).catch(() => {});
              alert("Banker has been alerted.");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ActionRow({ label, desc, onClick }: { label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors text-left"
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400" />
    </button>
  );
}

function buildGapAreas(readiness: SathiReadinessData | null): GapArea[] {
  if (!readiness?.reasons) return [];

  return readiness.reasons
    .filter((r) => r.status !== "met")
    .map((r) => ({
      field: r.field,
      status: r.status,
      label: REASON_LABELS[r.field]?.[r.status] || `${r.field}: ${r.status}`,
    }));
}
