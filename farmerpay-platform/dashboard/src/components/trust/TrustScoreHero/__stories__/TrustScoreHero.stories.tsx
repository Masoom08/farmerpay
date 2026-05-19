/**
 * TrustScoreHero — Stories
 *
 * Matrix: decision (3) x delta direction (3) + loading + fresh-compute.
 */

import React from "react";
import { TrustScoreHero, type Decision } from "../index";

export default {
  title: "Trust/TrustScoreHero",
  component: TrustScoreHero,
};

const noop = () => {};

const BASE = {
  persona: "banker" as const,
  asOf: "2026-04-14T10:00:00Z",
  onViewEvidence: noop,
};

// ─── Decision × Delta Direction ─────────────────────────────────

const DECISIONS: Decision[] = ["SANCTION", "RECONSIDER", "REJECT"];
const SCORES: Record<Decision, number> = {
  SANCTION: 864,
  RECONSIDER: 550,
  REJECT: 300,
};

export const AllDecisionsWithDeltaUp = () => (
  <div className="flex flex-col gap-8 p-6">
    {DECISIONS.map((d) => (
      <div key={d} className="rounded-lg border p-4">
        <TrustScoreHero
          {...BASE}
          score={SCORES[d]}
          decision={d}
          previousScore={SCORES[d] - 47}
        />
      </div>
    ))}
  </div>
);

export const AllDecisionsWithDeltaDown = () => (
  <div className="flex flex-col gap-8 p-6">
    {DECISIONS.map((d) => (
      <div key={d} className="rounded-lg border p-4">
        <TrustScoreHero
          {...BASE}
          score={SCORES[d]}
          decision={d}
          previousScore={SCORES[d] + 37}
        />
      </div>
    ))}
  </div>
);

export const AllDecisionsUnchanged = () => (
  <div className="flex flex-col gap-8 p-6">
    {DECISIONS.map((d) => (
      <div key={d} className="rounded-lg border p-4">
        <TrustScoreHero
          {...BASE}
          score={SCORES[d]}
          decision={d}
          previousScore={SCORES[d]}
        />
      </div>
    ))}
  </div>
);

export const NoPreviousScore = () => (
  <div className="flex flex-col gap-8 p-6">
    {DECISIONS.map((d) => (
      <div key={d} className="rounded-lg border p-4">
        <TrustScoreHero
          {...BASE}
          score={SCORES[d]}
          decision={d}
          previousScore={undefined}
        />
      </div>
    ))}
  </div>
);

// ─── Special States ─────────────────────────────────────────────

export const Loading = () => (
  <div className="rounded-lg border p-4">
    <TrustScoreHero
      {...BASE}
      score={null}
      decision={undefined}
    />
  </div>
);

export const FreshCompute = () => (
  <div className="rounded-lg border p-4">
    <TrustScoreHero
      {...BASE}
      score={864}
      decision="SANCTION"
      previousScore={817}
      isFreshCompute
    />
  </div>
);

export const FreshComputeReconsider = () => (
  <div className="rounded-lg border p-4">
    <TrustScoreHero
      {...BASE}
      score={550}
      decision="RECONSIDER"
      previousScore={600}
      isFreshCompute
    />
  </div>
);
