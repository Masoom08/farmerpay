/**
 * FarmerHeaderCard — Stories
 *
 * Shows the full 3x3 matrix of (aaStatus x cibilStatus) combinations
 * plus edge cases for missing fields and long names.
 */

import React from "react";
import {
  FarmerHeaderCard,
  type AaStatus,
  type CibilStatus,
} from "../index";

// ─── Base props ─────────────────────────────────────────────────

const BASE_PROPS = {
  name: "Ramesh Kulkarni",
  village: "Banganga",
  district: "Pune",
  kccId: "KCC-2026-00481",
  aaLastSync: "2026-04-14T10:00:00Z",
  cibilPulledAt: "2026-04-11T10:00:00Z",
  lastSathiVisit: "2026-04-09T10:00:00Z",
  loanAmountInr: 350000,
  loanPurpose: "Kharif inputs",
};

// ─── 3x3 matrix: AA status x CIBIL status ──────────────────────

const AA_STATUSES: AaStatus[] = ["CONNECTED", "PENDING", "NONE"];
const CIBIL_STATUSES: CibilStatus[] = ["PULLED", "STALE", "NONE"];

export default {
  title: "Trust/FarmerHeaderCard",
  component: FarmerHeaderCard,
};

// Generate all 9 combinations
export const AllCombinations = () => (
  <div className="flex flex-col gap-6 p-6">
    {AA_STATUSES.map((aa) =>
      CIBIL_STATUSES.map((cibil) => (
        <FarmerHeaderCard
          key={`${aa}-${cibil}`}
          {...BASE_PROPS}
          aaStatus={aa}
          cibilStatus={cibil}
          aaLastSync={aa === "CONNECTED" ? BASE_PROPS.aaLastSync : undefined}
          cibilPulledAt={cibil === "PULLED" ? BASE_PROPS.cibilPulledAt : undefined}
        />
      ))
    )}
  </div>
);

// Individual named stories for easy discovery

export const ConnectedPulled = () => (
  <FarmerHeaderCard
    {...BASE_PROPS}
    aaStatus="CONNECTED"
    cibilStatus="PULLED"
  />
);

export const ConnectedStale = () => (
  <FarmerHeaderCard
    {...BASE_PROPS}
    aaStatus="CONNECTED"
    cibilStatus="STALE"
    cibilPulledAt={undefined}
  />
);

export const ConnectedNone = () => (
  <FarmerHeaderCard
    {...BASE_PROPS}
    aaStatus="CONNECTED"
    cibilStatus="NONE"
    cibilPulledAt={undefined}
  />
);

export const PendingPulled = () => (
  <FarmerHeaderCard
    {...BASE_PROPS}
    aaStatus="PENDING"
    aaLastSync={undefined}
    cibilStatus="PULLED"
  />
);

export const PendingStale = () => (
  <FarmerHeaderCard
    {...BASE_PROPS}
    aaStatus="PENDING"
    aaLastSync={undefined}
    cibilStatus="STALE"
    cibilPulledAt={undefined}
  />
);

export const PendingNone = () => (
  <FarmerHeaderCard
    {...BASE_PROPS}
    aaStatus="PENDING"
    aaLastSync={undefined}
    cibilStatus="NONE"
    cibilPulledAt={undefined}
  />
);

export const NoneConnectedPulled = () => (
  <FarmerHeaderCard
    {...BASE_PROPS}
    aaStatus="NONE"
    aaLastSync={undefined}
    cibilStatus="PULLED"
  />
);

export const NoneStale = () => (
  <FarmerHeaderCard
    {...BASE_PROPS}
    aaStatus="NONE"
    aaLastSync={undefined}
    cibilStatus="STALE"
    cibilPulledAt={undefined}
  />
);

export const NoneNone = () => (
  <FarmerHeaderCard
    {...BASE_PROPS}
    aaStatus="NONE"
    aaLastSync={undefined}
    cibilStatus="NONE"
    cibilPulledAt={undefined}
  />
);

// ─── Edge cases ─────────────────────────────────────────────────

export const LongName = () => (
  <FarmerHeaderCard
    {...BASE_PROPS}
    name="Raghunathaprasadaramachandra Kulkarni Deshmukh Patil"
    aaStatus="CONNECTED"
    cibilStatus="PULLED"
  />
);

export const NoOptionalFields = () => (
  <FarmerHeaderCard
    {...BASE_PROPS}
    aaStatus="NONE"
    aaLastSync={undefined}
    cibilStatus="NONE"
    cibilPulledAt={undefined}
    lastSathiVisit={undefined}
  />
);

export const HighLoanAmount = () => (
  <FarmerHeaderCard
    {...BASE_PROPS}
    loanAmountInr={12500000}
    loanPurpose="Land purchase + bore well"
    aaStatus="CONNECTED"
    cibilStatus="PULLED"
  />
);
