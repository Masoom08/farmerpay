/**
 * cycleStageService
 *
 * Pure date-math + DB lookup. Given a CultivationCycle id, returns the
 * PoP workband the cycle is currently in based on
 *   daysElapsed = today - cycle_sowing_date
 * matched against pop_workbands.days_from_sowing_start / days_from_sowing_end.
 *
 * Used by the SAGE crop advisory engine and (future) the farmer-app
 * "current stage" UI.
 */

const logger = require('../../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../../shared/models');
  return db;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the current stage for a cycle.
 *
 * @param {number} cycleId
 * @returns {Promise<{
 *   cycle: object,
 *   workband: object,
 *   daysElapsed: number,
 *   daysIntoStage: number,
 *   daysRemainingInStage: number,
 *   isPastHarvest: boolean
 * } | null>}
 */
const getCycleCurrentStage = async (cycleId) => {
  const { CultivationCycle, PackageOfPractice, PopWorkband, GoogleFieldObservation } = getDb();

  const cycle = await CultivationCycle.findOne({ where: { id: cycleId, is_active: true } });
  if (!cycle) return null;
  if (!cycle.pop_id) return null;

  // Phase 2A.1 — prefer Google satellite-derived sowing date when present.
  // The mock fetcher writes a row whose sowing_date drifts ±2 days from
  // self-report; in production this is the ground truth from Sentinel +
  // Google's season detection algorithm.
  let sowingSource = 'self_declared';
  let sowingDate = cycle.cycle_sowing_date ? new Date(cycle.cycle_sowing_date) : null;
  if (GoogleFieldObservation) {
    const googleObs = await GoogleFieldObservation.findOne({
      where: { cycle_id: cycleId, is_active: true },
      order: [['last_observed_at', 'DESC']],
    });
    if (googleObs && googleObs.sowing_date) {
      sowingDate = new Date(googleObs.sowing_date);
      sowingSource = `satellite:${googleObs.source}`;
    }
  }
  if (!sowingDate) return null;

  const today = new Date();
  // Strip time so daysElapsed is whole-day count.
  const sowingDayMs = Math.floor(sowingDate.getTime() / ONE_DAY_MS) * ONE_DAY_MS;
  const todayDayMs = Math.floor(today.getTime() / ONE_DAY_MS) * ONE_DAY_MS;
  const daysElapsed = Math.max(0, Math.floor((todayDayMs - sowingDayMs) / ONE_DAY_MS));

  // CultivationCycle.pop_id is a UUID string referencing package_of_practices.pop_uuid.
  // PopWorkband.pop_id is the same UUID string (not the int id).
  const workbands = await PopWorkband.findAll({
    where: { pop_id: cycle.pop_id, is_active: true },
    order: [['workband_order', 'ASC']],
  });
  if (workbands.length === 0) return null;

  // Find the workband whose [start, end] window contains daysElapsed.
  let workband = workbands.find((w) =>
    w.days_from_sowing_start != null &&
    w.days_from_sowing_end != null &&
    daysElapsed >= w.days_from_sowing_start &&
    daysElapsed <= w.days_from_sowing_end
  );

  let isPastHarvest = false;
  if (!workband) {
    // Fall through: pick the workband with the largest start that's still ≤ daysElapsed.
    // Handles "past final stage" cases gracefully.
    const past = workbands
      .filter((w) => w.days_from_sowing_start != null && w.days_from_sowing_start <= daysElapsed)
      .sort((a, b) => b.days_from_sowing_start - a.days_from_sowing_start);
    workband = past[0] || workbands[0];
    if (workband && workband.days_from_sowing_end != null && daysElapsed > workband.days_from_sowing_end) {
      isPastHarvest = true;
    }
  }

  if (!workband) return null;

  const startDay = workband.days_from_sowing_start || 0;
  const endDay = workband.days_from_sowing_end || startDay;
  const daysIntoStage = Math.max(0, daysElapsed - startDay);
  const daysRemainingInStage = Math.max(0, endDay - daysElapsed);

  return {
    cycle,
    workband,
    daysElapsed,
    daysIntoStage,
    daysRemainingInStage,
    isPastHarvest,
    sowingSource,
    effectiveSowingDate: sowingDate.toISOString().slice(0, 10),
  };
};

/**
 * Convenience: list all stages for a cycle along with their position
 * (current / past / upcoming). Used by the future "my crop" screen.
 */
const getCycleStageTimeline = async (cycleId) => {
  const { CultivationCycle, PopWorkband } = getDb();
  const cycle = await CultivationCycle.findOne({ where: { id: cycleId, is_active: true } });
  if (!cycle || !cycle.pop_id || !cycle.cycle_sowing_date) return null;

  const workbands = await PopWorkband.findAll({
    where: { pop_id: cycle.pop_id, is_active: true },
    order: [['workband_order', 'ASC']],
  });

  const sowingDayMs = Math.floor(new Date(cycle.cycle_sowing_date).getTime() / ONE_DAY_MS) * ONE_DAY_MS;
  const todayDayMs = Math.floor(Date.now() / ONE_DAY_MS) * ONE_DAY_MS;
  const daysElapsed = Math.max(0, Math.floor((todayDayMs - sowingDayMs) / ONE_DAY_MS));

  return workbands.map((w) => {
    let position = 'upcoming';
    if (
      w.days_from_sowing_start != null &&
      w.days_from_sowing_end != null &&
      daysElapsed >= w.days_from_sowing_start &&
      daysElapsed <= w.days_from_sowing_end
    ) {
      position = 'current';
    } else if (w.days_from_sowing_end != null && daysElapsed > w.days_from_sowing_end) {
      position = 'past';
    }
    return {
      id: w.id,
      workbandOrder: w.workband_order,
      workbandName: w.workband_name,
      daysFromSowingStart: w.days_from_sowing_start,
      daysFromSowingEnd: w.days_from_sowing_end,
      position,
    };
  });
};

module.exports = {
  getCycleCurrentStage,
  getCycleStageTimeline,
};
