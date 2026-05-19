/**
 * Farmer Health Summary Service
 *
 * Aggregates compliance scores, stage progress, financials, and alerts
 * across all active activities for a single farmer.
 * Powers the "Am I on Track?" dashboard.
 */

const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const MS_PER_DAY = 86400000;

const scoreColor = (score) => {
  if (score === null || score === undefined) return 'grey';
  if (score >= 80) return 'green';
  if (score >= 60) return 'amber';
  return 'red';
};

const getHealthSummary = async (farmerId) => {
  const {
    CultivationCycle, WorkbandExecution, PopWorkband,
    RootsComplianceSnapshot, RootsRedFlag, SoilHealthRecord,
    SageAdvisory, Field,
  } = getDb();

  const activities = [];

  // ─── Crop activities ───
  const activeCycles = await CultivationCycle.findAll({
    where: {
      farmer_id: farmerId,
      is_active: true,
      cycle_status: { [Op.in]: ['sowing', 'growing', 'monitoring', 'harvesting', 'post_harvest'] },
    },
    order: [['created_at', 'DESC']],
  });

  for (const cycle of activeCycles) {
    try {
      // Get latest compliance snapshot
      const snapshot = await RootsComplianceSnapshot.findOne({
        where: { farmer_id: farmerId, activity_type: 'CROP', activity_reference_id: cycle.id, is_active: true },
        order: [['snapshot_date', 'DESC']],
      });

      // Get workband executions
      const wbExecs = await WorkbandExecution.findAll({
        where: { cycle_id: cycle.cycle_uuid, is_active: true },
        attributes: ['pop_workband_id', 'workband_status', 'workband_start_date', 'workband_end_date'],
      });
      const execByPwId = {};
      wbExecs.forEach((e) => { if (e.pop_workband_id) execByPwId[e.pop_workband_id] = e; });

      // Get PoP workbands
      const popWbs = cycle.pop_id
        ? await PopWorkband.findAll({
          where: { pop_id: cycle.pop_id, is_active: true },
          order: [['workband_order', 'ASC']],
        })
        : [];

      const totalStages = popWbs.length;
      const daysSinceSowing = cycle.cycle_sowing_date
        ? Math.floor((Date.now() - new Date(cycle.cycle_sowing_date).getTime()) / MS_PER_DAY)
        : 0;

      // Build stage statuses
      let currentStage = 0;
      const stageStatuses = popWbs.map((pw, idx) => {
        const exec = execByPwId[pw.id];
        const st = exec ? (exec.workband_status || '').toLowerCase() : 'planned';

        if (st === 'completed') return 'completed';
        if (st === 'in_progress') { currentStage = idx + 1; return 'current'; }
        if (st === 'skipped') return 'skipped';
        if (st === 'delayed') { currentStage = idx + 1; return 'delayed'; }

        // Check if window has passed
        const windowEnd = pw.days_from_sowing_end || pw.days_from_sowing_start || 0;
        if (daysSinceSowing > windowEnd + 14) return 'missed';
        if (daysSinceSowing >= (pw.days_from_sowing_start || 0)) { currentStage = idx + 1; return 'current'; }
        return 'upcoming';
      });

      if (currentStage === 0) {
        const firstNonComplete = stageStatuses.findIndex((s) => s !== 'completed' && s !== 'skipped');
        currentStage = firstNonComplete >= 0 ? firstNonComplete + 1 : totalStages;
      }

      // Find next action
      let nextAction = null;
      for (const pw of popWbs) {
        const exec = execByPwId[pw.id];
        const st = exec ? (exec.workband_status || '').toLowerCase() : 'planned';
        if (st === 'completed' || st === 'skipped') continue;

        const windowStart = pw.days_from_sowing_start || 0;
        const dueInDays = windowStart - daysSinceSowing;
        nextAction = { name: pw.workband_name, dueInDays: Math.max(dueInDays, 0) };
        break;
      }

      // Financial summary from snapshot
      const spent = snapshot ? parseFloat(snapshot.total_actual_cost || 0) : 0;
      const expected = snapshot ? parseFloat(snapshot.total_expected_cost || 0) : 0;
      const variancePct = expected > 0 ? Math.round(((spent - expected) / expected) * 100 * 10) / 10 : 0;

      // Soil health available?
      const fieldId = cycle.field_id;
      let soilHealthAvailable = false;
      if (fieldId) {
        const soilRec = await SoilHealthRecord.findOne({
          where: { field_id: fieldId, is_active: true },
          attributes: ['id'],
        });
        soilHealthAvailable = !!soilRec;
      }

      // Open red flags as alerts
      const flags = await RootsRedFlag.findAll({
        where: { farmer_id: farmerId, activity_reference_id: cycle.id, status: 'OPEN', is_active: true },
        attributes: ['description'],
        limit: 3,
      });
      const alerts = flags.map((f) => f.description).filter(Boolean);

      const overallScore = snapshot
        ? parseFloat(snapshot.overall_compliance_score || 0)
        : null;

      const cropName = cycle.self_declared_crop || cycle.crop_id || 'Crop';
      const seasonLabel = cycle.cycle_season ? `${cycle.cycle_season.charAt(0).toUpperCase() + cycle.cycle_season.slice(1)} ${cycle.cycle_year || ''}` : '';

      activities.push({
        type: 'CROP',
        name: `${cropName} — ${seasonLabel}`.trim(),
        cycleId: cycle.id,
        cycleUuid: cycle.cycle_uuid,
        overallScore: overallScore !== null ? Math.round(overallScore * 10) / 10 : null,
        scoreColor: scoreColor(overallScore),
        currentStage,
        totalStages,
        stageStatuses,
        nextAction,
        financials: { spent: Math.round(spent), expected: Math.round(expected), variancePct },
        soilHealthAvailable,
        alerts,
      });
    } catch (err) {
      logger.warn(`Health summary: failed for cycle ${cycle.cycle_uuid}`, { error: err.message });
    }
  }

  // ─── Overall farm health score ───
  const scoredActivities = activities.filter((a) => a.overallScore !== null);
  const farmHealthScore = scoredActivities.length > 0
    ? Math.round(scoredActivities.reduce((sum, a) => sum + a.overallScore, 0) / scoredActivities.length * 10) / 10
    : null;

  // Pending actions = stages that are current or overdue
  const pendingActions = activities.reduce((sum, a) => {
    return sum + a.stageStatuses.filter((s) => s === 'current' || s === 'missed' || s === 'delayed').length;
  }, 0);

  // Unread advisories
  let unreadAdvisories = 0;
  try {
    unreadAdvisories = await SageAdvisory.count({
      where: { farmer_id: farmerId, acknowledged_at: null, is_active: true },
    });
  } catch {}

  return {
    activities,
    farmHealthScore,
    farmHealthColor: scoreColor(farmHealthScore),
    pendingActions,
    unreadAdvisories,
  };
};

module.exports = { getHealthSummary };
