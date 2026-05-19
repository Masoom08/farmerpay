"use client";

import Link from "next/link";
import { ChevronRight, ArrowLeft, Download, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/primitives/Skeleton";
import { FarmerHeaderCard } from "@/components/trust/FarmerHeaderCard";
import { useOnline } from "@/hooks/useOnline";
import {
  deriveUiState,
  getStaleBanner,
  getNoAaBanner,
  getOfflineBanner,
  getErrorBanner,
  hasCibilFlag,
  hasNoAa,
  isStale,
  daysSinceCompute,
  type UiStateResult,
  type BannerConfig,
} from "./state";
import type {
  TrustSnapshot,
  FarmerProfile,
  AuditEntry,
  TrustEvidence,
} from "@/lib/trust";

// ─── Props ──────────────────────────────────────────────────────

interface TrustReviewShellProps {
  farmerId: number;
  farmer: FarmerProfile;
  snapshot: TrustSnapshot | null;
  audit: AuditEntry[];
  evidence: TrustEvidence[];
  /** Override for testing — when true, forces error state */
  hasError?: boolean;
}

// ─── Tab IDs ────────────────────────────────────────────────────

const TAB_PILLARS = "pillars";
const TAB_EVIDENCE = "evidence";
const TAB_AUDIT = "audit-trail";
const TAB_DRISHTI = "drishti-projection";

// ─── Component ──────────────────────────────────────────────────

export default function TrustReviewShell({
  farmerId,
  farmer,
  snapshot,
  audit,
  evidence,
  hasError = false,
}: TrustReviewShellProps) {
  const { isOnline } = useOnline();

  const farmerName = farmer
    ? `${farmer.firstName ?? ""} ${farmer.lastName ?? ""}`.trim() || "Farmer"
    : "Farmer";

  const hasSnapshot = snapshot !== null;
  const isLoading = false; // Data already resolved server-side

  // ─── Derive UI state ────────────────────────────────────────
  const uiState: UiStateResult = deriveUiState({
    snapshot,
    farmer,
    isOnline,
    hasError,
  });

  // ─── Banners to render ──────────────────────────────────────
  const banners: BannerConfig[] = [];

  if (uiState.state === "error") {
    banners.push(getErrorBanner());
  }
  if (uiState.state === "offline" || !isOnline) {
    banners.push(getOfflineBanner(snapshot?.computedAt));
  }
  if (hasCibilFlag(snapshot)) {
    // AdverseCibilBanner is rendered separately via context
  }
  if (isStale(snapshot)) {
    const days = snapshot ? daysSinceCompute(snapshot.computedAt) : 0;
    banners.push(getStaleBanner(days));
  }
  if (hasNoAa(farmer, snapshot)) {
    banners.push(getNoAaBanner());
  }

  const footerDisabled = !hasSnapshot || uiState.state === "offline" || uiState.state === "error";

  // ─── Error state (full-screen) ──────────────────────────────
  if (uiState.state === "error" && !hasSnapshot) {
    return (
      <div data-testid="trust-review-page" className="flex flex-col gap-6 pb-24">
        <div
          data-testid="error-state"
          className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-8"
          role="alert"
        >
          <p className="text-lg font-semibold text-destructive">
            Failed to load TRUST data
          </p>
          <p className="text-sm text-muted-foreground">
            Please check your connection and try again.
          </p>
          <Button
            data-testid="error-retry-btn"
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-1.5 size-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="trust-review-page" className="flex flex-col gap-6 pb-24">
      {/* ─── State banners ─────────────────────────────────── */}
      {banners.length > 0 && (
        <div data-testid="state-banners" className="flex flex-col gap-2">
          {banners.map((banner, idx) => (
            <StateBanner key={idx} config={banner} />
          ))}
        </div>
      )}

      {/* ─── Breadcrumb (40px) ──────────────────────────────── */}
      <nav
        aria-label="Breadcrumb"
        className="flex h-10 items-center gap-2 text-sm text-muted-foreground"
      >
        <Link
          href="/dashboard"
          className="hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <ChevronRight className="size-4" />
        <Link
          href="/dashboard/farmers"
          className="hover:text-foreground transition-colors"
        >
          Farmers
        </Link>
        <ChevronRight className="size-4" />
        <span className="font-medium text-foreground">
          {farmerName} &mdash; TRUST Review
        </span>
      </nav>

      {/* ─── Block 1: FarmerHeaderCard (120px) ──────────────── */}
      <FarmerHeaderCard
        name={farmerName}
        village={farmer?.village ?? "—"}
        district={snapshot?.farmer?.village ?? "—"}
        kccId={`KCC-${farmerId}`}
        aaStatus={snapshot?.evidence?.some((e) => e.source === "AA") ? "CONNECTED" : "NONE"}
        aaLastSync={snapshot?.computedAt}
        cibilStatus={snapshot?.cibil?.flag ? "PULLED" : "NONE"}
        cibilPulledAt={snapshot?.computedAt}
        lastSathiVisit={undefined}
        loanAmountInr={0}
        loanPurpose="—"
      />

      {/* ─── Block 2: Score Hero (5 col) + PillarConstellation (7 col) ── */}
      <div
        className="grid grid-cols-12 gap-6"
        style={{ minHeight: 360 }}
      >
        {/* Score hero — 5 cols */}
        <Card
          data-testid="score-hero"
          className="col-span-5 flex flex-col items-center justify-center gap-4"
        >
          <CardContent className="flex flex-col items-center gap-4 p-6">
            {hasSnapshot ? (
              <>
                <div className="text-6xl font-bold tabular-nums tracking-tight">
                  {snapshot.score}
                </div>
                <div className="text-sm text-muted-foreground">/ 1000</div>
                <DecisionBadge decision={snapshot.decision} />
                <p className="text-xs text-muted-foreground">
                  Computed:{" "}
                  {new Date(snapshot.computedAt).toLocaleDateString("en-IN")}
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Skeleton.Score />
                <p className="text-sm">No snapshot available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pillar constellation — 7 cols */}
        <Card
          data-testid="pillar-constellation"
          className="col-span-7"
        >
          <CardContent className="flex flex-col gap-3 p-6">
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              Pillar Scores (0&ndash;100)
            </h2>
            {hasSnapshot && snapshot.pillars.length > 0 ? (
              snapshot.pillars.map((p) => (
                <PillarBar
                  key={p.code}
                  code={p.code}
                  name={p.name}
                  score={p.score}
                />
              ))
            ) : (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 flex-1 rounded-full" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Block 3: Table-2 Group Rollup Strip (120px) ──── */}
      <Card data-testid="group-rollup-strip" className="min-h-[120px]">
        <CardContent className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Group Rollups (Table-2)
          </h2>
          {hasSnapshot && snapshot.groups.length > 0 ? (
            <div className="grid grid-cols-4 gap-4 text-sm">
              {/* Header row */}
              <div className="font-medium text-muted-foreground">Group</div>
              <div className="font-medium text-muted-foreground">Score</div>
              <div className="font-medium text-muted-foreground">
                vs Benchmark
              </div>
              <div />
              {/* Data rows */}
              {snapshot.groups.map((g) => (
                <GroupRow key={g.groupCode} group={g} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Skeleton.Row columns={4} />
              <Skeleton.Row columns={4} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Block 4: Tab Shell (48px) + Panel (560px) ─────── */}
      <Tabs defaultValue={TAB_PILLARS} data-testid="trust-tabs">
        <TabsList variant="line" data-testid="tabs-list">
          <TabsTrigger
            value={TAB_PILLARS}
            disabled={isLoading}
            data-testid="tab-pillars"
          >
            Pillars
          </TabsTrigger>
          <TabsTrigger
            value={TAB_EVIDENCE}
            disabled={isLoading}
            data-testid="tab-evidence"
          >
            Evidence
          </TabsTrigger>
          <TabsTrigger
            value={TAB_AUDIT}
            disabled={isLoading}
            data-testid="tab-audit-trail"
          >
            Audit trail
          </TabsTrigger>
          <TabsTrigger
            value={TAB_DRISHTI}
            disabled={isLoading}
            data-testid="tab-drishti"
          >
            DRISHTI projection
          </TabsTrigger>
        </TabsList>

        <TabsContent value={TAB_PILLARS} className="min-h-[560px] pt-6">
          <PlaceholderPanel label="Pillar detail breakdown" />
        </TabsContent>

        <TabsContent value={TAB_EVIDENCE} className="min-h-[560px] pt-6">
          <PlaceholderPanel label="Evidence sources & confidence" />
        </TabsContent>

        <TabsContent value={TAB_AUDIT} className="min-h-[560px] pt-6">
          <PlaceholderPanel label="Audit trail timeline" />
        </TabsContent>

        <TabsContent value={TAB_DRISHTI} className="min-h-[560px] pt-6">
          <PlaceholderPanel label="DRISHTI scenario projection" />
        </TabsContent>
      </Tabs>

      {/* ─── Sticky Footer (80px) ──────────────────────────── */}
      <div
        data-testid="sticky-footer"
        className="sticky bottom-0 z-10 flex h-20 items-center justify-between border-t border-border bg-background px-6"
      >
        <Button variant="outline" size="sm" disabled={footerDisabled}>
          <Download className="mr-1.5 size-4" />
          Export PDF
        </Button>

        <div className="flex gap-3">
          <Button variant="outline" size="sm" disabled={footerDisabled}>
            <RefreshCw className="mr-1.5 size-4" />
            Recompute
          </Button>
          <Button
            data-testid="btn-reconsider"
            variant="outline"
            size="sm"
            disabled={footerDisabled}
            className="border-decision-reconsider text-decision-reconsider hover:bg-decision-reconsider/10"
          >
            Reconsider
          </Button>
          <Button
            data-testid="btn-reject"
            variant="outline"
            size="sm"
            disabled={footerDisabled}
            className="border-decision-reject text-decision-reject hover:bg-decision-reject/10"
          >
            Reject
          </Button>
          <Button
            data-testid="btn-sanction"
            size="sm"
            disabled={footerDisabled}
            className="bg-decision-sanction text-decision-sanction-fg hover:bg-decision-sanction/90"
          >
            Sanction
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── StateBanner ───────────────────────────────────────────────

function StateBanner({ config }: { config: BannerConfig }) {
  const variantStyles: Record<string, string> = {
    error: "border-destructive/30 bg-destructive/5 text-destructive",
    warning: "border-amber-300 bg-amber-50 text-amber-900",
    info: "border-blue-300 bg-blue-50 text-blue-900",
  };

  return (
    <div
      data-testid={`banner-${config.variant}`}
      className={`flex items-center gap-3 rounded-md border px-4 py-2.5 text-sm ${
        variantStyles[config.variant] ?? variantStyles.info
      }`}
      role={config.variant === "error" ? "alert" : "status"}
    >
      <span className="flex-1">{config.message}</span>
      {config.showRefresh && (
        <Button
          data-testid="banner-refresh-btn"
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="shrink-0"
        >
          <RefreshCw className="mr-1.5 size-4" />
          Refresh
        </Button>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function DecisionBadge({ decision }: { decision: string }) {
  const colorMap: Record<string, string> = {
    SANCTION: "bg-decision-sanction text-decision-sanction-fg",
    RECONSIDER: "bg-decision-reconsider text-decision-reconsider-fg",
    REJECT: "bg-decision-reject text-decision-reject-fg",
  };

  return (
    <span
      data-testid="decision-badge"
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        colorMap[decision] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {decision}
    </span>
  );
}

const PILLAR_COLORS: Record<string, string> = {
  P1: "bg-pillar-p1",
  P2: "bg-pillar-p2",
  P3: "bg-pillar-p3",
  P4: "bg-pillar-p4",
  P5: "bg-pillar-p5",
  P6: "bg-pillar-p6",
};

function PillarBar({
  code,
  name,
  score,
}: {
  code: string;
  name: string;
  score: number;
}) {
  const clamped = Math.min(100, Math.max(0, score));
  const barColor = PILLAR_COLORS[code] ?? "bg-brand-primary-500";

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-xs font-medium text-foreground">
        {code} {name}
      </span>
      <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
        {score}
      </span>
    </div>
  );
}

function GroupRow({
  group,
}: {
  group: { groupCode: string; groupLabel: string; score: number; deltaVsBenchmark: number | null };
}) {
  const delta = group.deltaVsBenchmark;
  return (
    <>
      <div className="text-foreground">{group.groupLabel || group.groupCode}</div>
      <div className="tabular-nums">{group.score ?? "—"}</div>
      <div
        className={
          delta != null
            ? delta >= 0
              ? "text-brand-primary-700"
              : "text-decision-reject"
            : "text-muted-foreground"
        }
      >
        {delta != null ? `${delta >= 0 ? "+" : ""}${delta}` : "—"}
      </div>
      <div />
    </>
  );
}

function PlaceholderPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      {label} &mdash; placeholder
    </div>
  );
}
