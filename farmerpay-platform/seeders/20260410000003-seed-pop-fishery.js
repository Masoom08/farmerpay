'use strict';

/**
 * Seed Package of Practices — Fishery
 *
 * Fishery PoP follows the same operational recurring-care model as Dairy:
 * a cyclic loop the farmer runs per pond-cycle (stocking → feeding →
 * water quality → sampling → harvest) plus daily dailies and periodic
 * health/disease checks. Sea operations are covered via a single
 * PER_EVENT trip-diary touchpoint so hybrid farmers see their trips
 * without bloating the template for pond-majority smallholders.
 *
 * Tier alignment (matches yesterday's Fishery v2 fatigue-reduction work):
 *   SMALL  (<1 ha inland OR ≤1 vessel) → only DAILY essentials up front.
 *   MEDIUM (1–5 ha inland OR 2 vessels) → DAILY + WEEKLY.
 *   LARGE  (>5 ha inland OR 3+ vessels) → WEEKLY bulk entry anchor,
 *                                         DAILY collapsed by default.
 *
 * Idempotent: bulk inserts gated by existence check; cadence backfilled
 * via UPDATE so re-running after a schema change still converges state.
 */

const ACTIVITY = 'FISHERY';

const STAGES = [
  { stage_key: 'pond_prep',    stage_order: 1,  label_en: 'Pond Prep',       label_hi: 'तालाब तैयारी',        icon: '🪣' },
  { stage_key: 'stocking',     stage_order: 2,  label_en: 'Stocking',        label_hi: 'संचय',              icon: '🐟' },
  { stage_key: 'feeding',      stage_order: 3,  label_en: 'Feeding',         label_hi: 'आहार',              icon: '🌾' },
  { stage_key: 'water_quality',stage_order: 4,  label_en: 'Water Quality',   label_hi: 'जल गुणवत्ता',       icon: '💧' },
  { stage_key: 'aeration',     stage_order: 5,  label_en: 'Aeration',        label_hi: 'वायु संचार',        icon: '🌀' },
  { stage_key: 'health',       stage_order: 6,  label_en: 'Health & Disease',label_hi: 'स्वास्थ्य',         icon: '🩺' },
  { stage_key: 'sampling',     stage_order: 7,  label_en: 'Growth Sampling', label_hi: 'वृद्धि नमूना',      icon: '📏' },
  { stage_key: 'harvest',      stage_order: 8,  label_en: 'Harvest',         label_hi: 'कटाई',              icon: '🪝' },
  { stage_key: 'post_harvest', stage_order: 9,  label_en: 'Post-Harvest',    label_hi: 'कटाई उपरांत',       icon: '📦' },
  { stage_key: 'trip_ops',     stage_order: 10, label_en: 'Trip Operations', label_hi: 'यात्रा संचालन',     icon: '🚤' },
];

const TOUCHPOINTS = [
  {
    touchpoint_number: 1,
    stage_key: 'pond_prep',
    cadence: 'PER_EVENT',
    name_en: 'Pond Preparation & Liming',
    name_hi: 'तालाब तैयारी व चूना',
    description_en: 'Per cycle — dry pond, apply lime (250–500 kg/ha) and basal fertiliser; stabilise water for 7 days before stocking.',
  },
  {
    touchpoint_number: 2,
    stage_key: 'stocking',
    cadence: 'PER_EVENT',
    name_en: 'Fingerling Stocking',
    name_hi: 'अंगुलिका संचय',
    description_en: 'Per cycle — stock at recommended density (e.g., 8–10k/ha for composite carp); record species mix, count, unit cost.',
  },
  {
    touchpoint_number: 3,
    stage_key: 'feeding',
    cadence: 'DAILY',
    name_en: 'Daily Feed Ration',
    name_hi: 'दैनिक आहार',
    description_en: 'Daily — feed 2–3% of biomass split morning + evening; log quantity (kg) and cost.',
  },
  {
    touchpoint_number: 4,
    stage_key: 'feeding',
    cadence: 'WEEKLY',
    name_en: 'Feed Quality & Storage Check',
    name_hi: 'आहार गुणवत्ता जाँच',
    description_en: 'Weekly — inspect feed for mould / pellet integrity; keep store dry and rodent-free.',
  },
  {
    touchpoint_number: 5,
    stage_key: 'water_quality',
    cadence: 'WEEKLY',
    name_en: 'Water Quality Test (pH, DO, NH₃)',
    name_hi: 'जल गुणवत्ता परीक्षण',
    description_en: 'Weekly — test pH (6.5–8.5), dissolved oxygen (>4 ppm), ammonia (<0.1 ppm), temperature, turbidity (30–40 cm Secchi).',
  },
  {
    touchpoint_number: 6,
    stage_key: 'aeration',
    cadence: 'DAILY',
    name_en: 'Aerator & Power Operation',
    name_hi: 'एयरेटर संचालन',
    description_en: 'Daily — run aerators as per DO level, especially pre-dawn; log power hours and cost.',
  },
  {
    touchpoint_number: 7,
    stage_key: 'health',
    cadence: 'DAILY',
    name_en: 'Mortality & Disease Observation',
    name_hi: 'मृत्यु व रोग निगरानी',
    description_en: 'Daily — walk the pond; log mortality count, abnormal behaviour, lesions; escalate to vet if mortality >0.5%/day.',
  },
  {
    touchpoint_number: 8,
    stage_key: 'sampling',
    cadence: 'MONTHLY',
    name_en: 'Growth Sampling (Avg Weight)',
    name_hi: 'वृद्धि नमूना',
    description_en: 'Monthly — cast-net sample 20–30 fish, record avg weight; recalibrate feed ration against updated biomass.',
  },
  {
    touchpoint_number: 9,
    stage_key: 'harvest',
    cadence: 'PER_EVENT',
    name_en: 'Harvest (Full / Partial / Thinning)',
    name_hi: 'कटाई',
    description_en: 'Per event — record date, total kg, avg weight, survival %; choose full/partial/thinning method based on market and pond health.',
  },
  {
    touchpoint_number: 10,
    stage_key: 'trip_ops',
    cadence: 'PER_EVENT',
    name_en: 'Sea Trip Diary (Fuel, Ice, Catch, Sale)',
    name_hi: 'यात्रा डायरी',
    description_en: 'Per trip (sea operators) — log depart/return, fuel, ice, bait, crew wages, catch kg by species, landing port, buyer + sale amount.',
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // ─── Stages ───
    const [existingStages] = await queryInterface.sequelize.query(
      `SELECT stage_key FROM activity_pop_stages WHERE activity_code = ?`,
      { replacements: [ACTIVITY] }
    );
    const existingStageKeys = new Set(existingStages.map((r) => r.stage_key));
    const stageRows = STAGES
      .filter((s) => !existingStageKeys.has(s.stage_key))
      .map((s) => ({
        activity_code: ACTIVITY,
        ...s,
        is_active: true,
        created_at: now,
        updated_at: now,
      }));
    if (stageRows.length) {
      await queryInterface.bulkInsert('activity_pop_stages', stageRows);
    }

    // ─── Touchpoints ───
    const [existingTps] = await queryInterface.sequelize.query(
      `SELECT touchpoint_number FROM activity_pop_touchpoints WHERE activity_code = ?`,
      { replacements: [ACTIVITY] }
    );
    const existingTpNumbers = new Set(existingTps.map((r) => r.touchpoint_number));
    const tpRows = TOUCHPOINTS
      .filter((t) => !existingTpNumbers.has(t.touchpoint_number))
      .map((t) => ({
        activity_code: ACTIVITY,
        ...t,
        is_active: true,
        created_at: now,
        updated_at: now,
      }));
    if (tpRows.length) {
      await queryInterface.bulkInsert('activity_pop_touchpoints', tpRows);
    }

    // Backfill cadence on rows that may have been inserted before the
    // cadence column existed (idempotent convergence).
    for (const t of TOUCHPOINTS) {
      await queryInterface.sequelize.query(
        `UPDATE activity_pop_touchpoints
           SET cadence = ?, updated_at = ?
         WHERE activity_code = ? AND touchpoint_number = ? AND (cadence IS NULL OR cadence <> ?)`,
        { replacements: [t.cadence, now, ACTIVITY, t.touchpoint_number, t.cadence] }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('activity_pop_touchpoints', { activity_code: ACTIVITY });
    await queryInterface.bulkDelete('activity_pop_stages', { activity_code: ACTIVITY });
  },
};
