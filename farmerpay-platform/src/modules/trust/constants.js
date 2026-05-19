/**
 * TRUST v2 Constants
 * Thresholds, pillar mappings, group definitions.
 */

// ─── Decision Thresholds (spec §1.3 + §8.1) ─────────────────────
// MVP: fixed thresholds. Per-bank override parked per §8.1.
const SANCTION_THRESHOLD = 600;
const RECONSIDER_FLOOR = 500;

// ─── Pillar Code ↔ Section Code Map ─────────────────────────────
// Must match B1 migration seed exactly.
const PILLAR_CODE_BY_SECTION_CODE = {
  PERSONAL_PROFILE: 'P1',
  FARM_DETAILS: 'P2',
  FINANCIAL_LITERACY: 'P3',
  REPAYMENT_CAPACITY: 'P4',
  COLLATERAL_ASSETS: 'P5',
  NETWORK_REFERENCES: 'P6',
};

const SECTION_CODE_BY_PILLAR = Object.fromEntries(
  Object.entries(PILLAR_CODE_BY_SECTION_CODE).map(([s, p]) => [p, s]),
);

const PILLAR_CODES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

// ─── Table-2 Group Definitions ──────────────────────────────────
// DEMO=P1, OPS=P2+P3, ASSET=P4+P5, EXT=P6
const GROUP_DEFINITIONS = [
  { groupCode: 'DEMO', groupLabel: 'Demographics', pillars: ['P1'] },
  { groupCode: 'OPS', groupLabel: 'Operations', pillars: ['P2', 'P3'] },
  { groupCode: 'ASSET', groupLabel: 'Assets & Leverage', pillars: ['P4', 'P5'] },
  { groupCode: 'EXT', groupLabel: 'External Validation', pillars: ['P6'] },
];

// ─── Pillar → Sathi Task Type Mapping ───────────────────────────
const PILLAR_TO_TASK_TYPE = {
  P1: 'FARMER_REQUESTED',
  P2: 'VERIFY_LAND',
  P3: 'COLLECT_HOUSEHOLD',
  P4: 'COLLECT_HOUSEHOLD',
  P5: 'UPLOAD_INSURANCE',
  P6: 'FARMER_REQUESTED',
};

const PILLAR_TO_REASON_CODE = {
  P1: 'FARMER_REQUESTED',
  P2: 'LAND_EXPIRES',
  P3: 'HOUSEHOLD_REFRESH',
  P4: 'HOUSEHOLD_REFRESH',
  P5: 'INSURANCE_MISSING',
  P6: 'FARMER_REQUESTED',
};

// ─── Cache Keys ─────────────────────────────────────────────────
const CACHE_TTL = 86400; // 24 hours
const CACHE_PREFIX = {
  SNAPSHOT: 'trust:snapshot:farmer:',
  PORTFOLIO: 'trust:portfolio:',
};

// ─── Staleness ──────────────────────────────────────────────────
const STALE_DAYS = 30;

module.exports = {
  SANCTION_THRESHOLD,
  RECONSIDER_FLOOR,
  PILLAR_CODE_BY_SECTION_CODE,
  SECTION_CODE_BY_PILLAR,
  PILLAR_CODES,
  GROUP_DEFINITIONS,
  PILLAR_TO_TASK_TYPE,
  PILLAR_TO_REASON_CODE,
  CACHE_TTL,
  CACHE_PREFIX,
  STALE_DAYS,
};
