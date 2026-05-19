'use strict';

/**
 * Demo Harvest Data Seeder — Phase 1 of the PULSE Sell-or-Store wizard.
 *
 * Without this seeder, the new /sell-or-store farmer wizard would
 * render with all-zero defaults because the demo farmer's cycles are
 * stuck in 'planning' status with no expense or harvest rows.
 *
 * What this seeder does (idempotent — safe to re-run):
 *
 *   1. Flips Ramesh's wheat cycle (cycle_uuid 894daf00-...) from
 *      'planning' to 'post_harvest' so the activity-crop drill-in
 *      banner fires AND the wizard's auto-pick logic finds it.
 *   2. Inserts a cultivation_cycle_expense_summaries row with
 *      total_expenses = ₹35,000 (₹29,166/ha × 1.2 ha) — realistic
 *      for a small wheat plot in Karnataka.
 *   3. Inserts a harvest_records row with
 *      total_harvest_quantity_kg = 2400 (24 quintals from 1.2 ha,
 *      yield_per_hectare_kg = 2000) — typical Karnataka rabi wheat.
 *
 * After running:
 *   - Open /sell-or-store from the persona home → Step 1 should
 *     auto-pick the wheat cycle, Step 3 should show ₹35,000 cost
 *     and 24 qtl harvest.
 *   - The cycle still belongs to Ramesh (farmer_id = 1) so the
 *     existing /loan-journey wizard still finds it as his "linked
 *     crop loan" cycle.
 *
 * To find the right cycle on a different DB:
 *   SELECT id, cycle_uuid, cycle_status FROM cultivation_cycles
 *   WHERE farmer_id = (SELECT id FROM users WHERE mobile = '+919876500002')
 *     AND crop_id = (SELECT crop_id FROM crop_masters WHERE crop_code = 'WHEAT');
 */

const RAMESH_WHEAT_CYCLE_UUID = '894daf00-7aa5-4d29-b29d-c8b80fe49ef0';
const TARGET_FARMER_ID = 1;
const HECTARES = 1.2;
const TOTAL_EXPENSES = 35000;
const EXPENSE_PER_HA = Math.round(TOTAL_EXPENSES / HECTARES);
const HARVEST_KG = 2400;
const YIELD_PER_HA_KG = Math.round(HARVEST_KG / HECTARES);

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // ── Step 1: confirm the wheat cycle exists (don't fail loudly
    //    on a fresh DB — just log and skip the rest of the seeder) ──
    const [cycles] = await queryInterface.sequelize.query(
      `SELECT id, cycle_uuid FROM cultivation_cycles WHERE cycle_uuid = ? LIMIT 1`,
      { replacements: [RAMESH_WHEAT_CYCLE_UUID] },
    );
    if (cycles.length === 0) {
      console.log(
        `[seed-demo-harvest-data] Skipping — wheat cycle ${RAMESH_WHEAT_CYCLE_UUID} not found. ` +
          `Run the loan-journey seeder (or earlier dev setup) first.`,
      );
      return;
    }

    // ── Step 2: flip cycle_status → post_harvest ──
    await queryInterface.sequelize.query(
      `UPDATE cultivation_cycles
       SET cycle_status = 'post_harvest',
           cycle_actual_harvest_date = ?,
           updated_at = ?
       WHERE cycle_uuid = ?`,
      { replacements: ['2026-04-01', now, RAMESH_WHEAT_CYCLE_UUID] },
    );

    // ── Step 3: upsert the expense summary row ──
    const [existingExp] = await queryInterface.sequelize.query(
      `SELECT id FROM cultivation_cycle_expense_summaries WHERE cycle_id = ? LIMIT 1`,
      { replacements: [RAMESH_WHEAT_CYCLE_UUID] },
    );
    if (existingExp.length === 0) {
      await queryInterface.bulkInsert('cultivation_cycle_expense_summaries', [
        {
          cycle_id: RAMESH_WHEAT_CYCLE_UUID,
          total_input_cost: 12000, // seeds + fertilizer + pesticide
          total_labor_cost: 14000, // hired + family
          total_machinery_cost: 6000, // hire + operating
          total_other_expenses: 3000, // transport + misc
          total_expenses: TOTAL_EXPENSES,
          expense_per_hectare: EXPENSE_PER_HA,
          last_updated_at: now,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    } else {
      await queryInterface.sequelize.query(
        `UPDATE cultivation_cycle_expense_summaries
         SET total_input_cost = ?, total_labor_cost = ?,
             total_machinery_cost = ?, total_other_expenses = ?,
             total_expenses = ?, expense_per_hectare = ?,
             last_updated_at = ?, updated_at = ?
         WHERE cycle_id = ?`,
        {
          replacements: [
            12000, 14000, 6000, 3000,
            TOTAL_EXPENSES, EXPENSE_PER_HA,
            now, now, RAMESH_WHEAT_CYCLE_UUID,
          ],
        },
      );
    }

    // ── Step 4: upsert the harvest_records row ──
    const [existingHarvest] = await queryInterface.sequelize.query(
      `SELECT id FROM harvest_records WHERE cycle_id = ? LIMIT 1`,
      { replacements: [RAMESH_WHEAT_CYCLE_UUID] },
    );
    if (existingHarvest.length === 0) {
      const { v4: uuidv4 } = require('uuid');
      await queryInterface.bulkInsert('harvest_records', [
        {
          record_uuid: uuidv4(),
          cycle_id: RAMESH_WHEAT_CYCLE_UUID,
          harvest_start_date: '2026-03-25',
          harvest_end_date: '2026-04-01',
          total_harvest_quantity_kg: HARVEST_KG,
          harvest_quality_grade: 'A',
          yield_per_hectare_kg: YIELD_PER_HA_KG,
          expected_yield_achieved_percent: 95,
          loss_due_to_weather: 2.5,
          loss_due_to_pest: 1.0,
          loss_due_to_disease: 0.5,
          post_harvest_loss_percent: 1.5,
          harvest_notes: 'Demo seed — Ramesh wheat Rabi 2025-26 harvest, good quality',
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    console.log(
      `[seed-demo-harvest-data] OK — cycle ${RAMESH_WHEAT_CYCLE_UUID} → post_harvest, ` +
        `expenses ₹${TOTAL_EXPENSES}, harvest ${HARVEST_KG} kg`,
    );
  },

  async down(queryInterface) {
    // Revert the cycle status + delete the seeded rows
    await queryInterface.sequelize.query(
      `UPDATE cultivation_cycles SET cycle_status = 'planning' WHERE cycle_uuid = ?`,
      { replacements: [RAMESH_WHEAT_CYCLE_UUID] },
    );
    await queryInterface.sequelize.query(
      `DELETE FROM cultivation_cycle_expense_summaries WHERE cycle_id = ?`,
      { replacements: [RAMESH_WHEAT_CYCLE_UUID] },
    );
    await queryInterface.sequelize.query(
      `DELETE FROM harvest_records WHERE cycle_id = ?`,
      { replacements: [RAMESH_WHEAT_CYCLE_UUID] },
    );
  },
};
