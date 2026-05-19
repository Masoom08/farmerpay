/**
 * PillarConstellation — Stories
 *
 * Variants: default, missing pillars, low confidence, all states.
 */

import React from "react";
import {
  PillarConstellation,
  type Pillar,
  type PillarCode,
} from "../index";

export default {
  title: "Trust/PillarConstellation",
  component: PillarConstellation,
};

const PILLARS: Pillar[] = [
  { code: "P1", name: "Personal", score: 75, weight: 0.15, confidence: "HIGH" },
  { code: "P2", name: "Farm Details", score: 80, weight: 0.20, confidence: "HIGH" },
  { code: "P3", name: "Financial", score: 65, weight: 0.20, confidence: "MEDIUM" },
  { code: "P4", name: "Repayment", score: 70, weight: 0.20, confidence: "HIGH" },
  { code: "P5", name: "Collateral", score: 60, weight: 0.15, confidence: "LOW" },
  { code: "P6", name: "Network", score: 55, weight: 0.10, confidence: "HIGH" },
];

const noop = () => {};

export const Default = () => (
  <div className="w-[500px] rounded-lg border p-4">
    <PillarConstellation
      pillars={PILLARS}
      onPillarClick={(code) => console.log("Clicked:", code)}
    />
  </div>
);

export const HighScores = () => (
  <div className="w-[500px] rounded-lg border p-4">
    <PillarConstellation
      pillars={PILLARS.map((p) => ({ ...p, score: 85 + Math.random() * 15 }))}
      onPillarClick={noop}
    />
  </div>
);

export const LowScores = () => (
  <div className="w-[500px] rounded-lg border p-4">
    <PillarConstellation
      pillars={PILLARS.map((p) => ({ ...p, score: 20 + Math.random() * 25 }))}
      onPillarClick={noop}
    />
  </div>
);

export const WithMissingPillars = () => (
  <div className="w-[500px] rounded-lg border p-4">
    <PillarConstellation
      pillars={PILLARS}
      onPillarClick={noop}
      missingPillars={["P2", "P4"]}
    />
  </div>
);

export const WithLowConfidence = () => (
  <div className="w-[500px] rounded-lg border p-4">
    <PillarConstellation
      pillars={PILLARS}
      onPillarClick={noop}
      lowConfidenceOnly={["P3", "P5"]}
    />
  </div>
);

export const MissingAndLowConfidence = () => (
  <div className="w-[500px] rounded-lg border p-4">
    <PillarConstellation
      pillars={PILLARS}
      onPillarClick={noop}
      missingPillars={["P4"]}
      lowConfidenceOnly={["P3", "P5"]}
    />
  </div>
);
