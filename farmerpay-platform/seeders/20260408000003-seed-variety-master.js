'use strict';

/**
 * Seeds VarietyMaster + minimal VarietySoilCompatibility for the pilot
 * crops (paddy, cotton, wheat, maize, tur). Without this the farmer-app
 * variety dropdown is empty and Phase 1 ROOTS onboarding can't capture a
 * variety_id.
 *
 * Idempotent: looks up crops by crop_code and skips inserting a variety
 * if a row with the same (crop_id, variety_name) already exists.
 */

const { v4: uuidv4 } = require('uuid');

const CATALOG = {
  RICE: [
    { name: 'IR-64', code: 'IR64', durationMin: 110, durationMax: 125, yield: 5500, hybrid: false },
    { name: 'Pusa Basmati 1121', code: 'PB1121', durationMin: 140, durationMax: 150, yield: 4500, hybrid: false },
    { name: 'Swarna (MTU 7029)', code: 'SWARNA', durationMin: 140, durationMax: 150, yield: 5800, hybrid: false },
    { name: 'BPT 5204 (Samba Mahsuri)', code: 'BPT5204', durationMin: 145, durationMax: 155, yield: 5500, hybrid: false },
    { name: 'PHB 71 (Hybrid)', code: 'PHB71', durationMin: 125, durationMax: 135, yield: 7500, hybrid: true },
  ],
  COTTON: [
    { name: 'Bt Cotton MRC 7351', code: 'MRC7351', durationMin: 160, durationMax: 180, yield: 2200, hybrid: true },
    { name: 'RCH 659 BG II', code: 'RCH659', durationMin: 160, durationMax: 180, yield: 2400, hybrid: true },
    { name: 'NCS 855 BG II', code: 'NCS855', durationMin: 160, durationMax: 180, yield: 2300, hybrid: true },
    { name: 'JK Durga (Desi)', code: 'JKDURGA', durationMin: 150, durationMax: 170, yield: 1500, hybrid: false },
    { name: 'Suraj', code: 'SURAJ', durationMin: 150, durationMax: 170, yield: 1700, hybrid: false },
  ],
  WHEAT: [
    { name: 'HD 2967', code: 'HD2967', durationMin: 140, durationMax: 150, yield: 5500, hybrid: false },
    { name: 'HD 3086', code: 'HD3086', durationMin: 140, durationMax: 150, yield: 5700, hybrid: false },
    { name: 'PBW 343', code: 'PBW343', durationMin: 140, durationMax: 150, yield: 5400, hybrid: false },
    { name: 'DBW 88', code: 'DBW88', durationMin: 135, durationMax: 145, yield: 5500, hybrid: false },
    { name: 'Lok 1', code: 'LOK1', durationMin: 110, durationMax: 120, yield: 4500, hybrid: false },
  ],
  MAIZE: [
    { name: 'Pioneer 30V92', code: 'P30V92', durationMin: 100, durationMax: 110, yield: 7500, hybrid: true },
    { name: 'NK 6240', code: 'NK6240', durationMin: 95, durationMax: 110, yield: 7800, hybrid: true },
    { name: 'DKC 9108', code: 'DKC9108', durationMin: 100, durationMax: 115, yield: 8000, hybrid: true },
    { name: 'Vivek QPM 9', code: 'VIVEK9', durationMin: 85, durationMax: 95, yield: 5500, hybrid: false },
    { name: 'HQPM 5', code: 'HQPM5', durationMin: 95, durationMax: 105, yield: 6500, hybrid: false },
  ],
  // Tur (pigeon pea) — crop master uses code RED_GRAM if present; we
  // also try CHICKPEA as a fallback so the seeder still seeds 5 crops.
  RED_GRAM: [
    { name: 'BSMR 736', code: 'BSMR736', durationMin: 160, durationMax: 180, yield: 1800, hybrid: false },
    { name: 'ICPL 87119 (Asha)', code: 'ICPL87119', durationMin: 175, durationMax: 195, yield: 2000, hybrid: false },
    { name: 'GTH 1', code: 'GTH1', durationMin: 160, durationMax: 175, yield: 2200, hybrid: true },
    { name: 'Maruti', code: 'MARUTI', durationMin: 160, durationMax: 180, yield: 1900, hybrid: false },
    { name: 'TJT 501', code: 'TJT501', durationMin: 160, durationMax: 175, yield: 1800, hybrid: false },
  ],
};

module.exports = {
  async up(queryInterface) {
    const [crops] = await queryInterface.sequelize.query(`
      SELECT crop_id, crop_code FROM crop_masters
    `);
    const cropIdByCode = {};
    for (const c of crops) cropIdByCode[c.crop_code] = c.crop_id;

    const [existing] = await queryInterface.sequelize.query(`
      SELECT crop_id, variety_name FROM variety_masters
    `);
    const seenKey = new Set(existing.map((e) => `${e.crop_id}::${e.variety_name}`));

    const now = new Date();
    const rows = [];

    for (const [code, varieties] of Object.entries(CATALOG)) {
      const cropId = cropIdByCode[code];
      if (!cropId) continue; // crop not present in this DB
      for (const v of varieties) {
        const key = `${cropId}::${v.name}`;
        if (seenKey.has(key)) continue;
        rows.push({
          variety_id: uuidv4(),
          crop_id: cropId,
          variety_name: v.name,
          variety_code: v.code,
          variety_description: null,
          duration_days_min: v.durationMin,
          duration_days_max: v.durationMax,
          expected_yield_kg_per_hectare: v.yield,
          seed_company: null,
          seed_treatment_recommended: false,
          is_hybrid: v.hybrid,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      }
    }

    if (rows.length > 0) {
      await queryInterface.bulkInsert('variety_masters', rows);
    }
  },

  async down(queryInterface) {
    const codes = Object.values(CATALOG).flat().map((v) => v.code);
    if (codes.length === 0) return;
    await queryInterface.bulkDelete('variety_masters', {
      variety_code: codes,
    });
  },
};
