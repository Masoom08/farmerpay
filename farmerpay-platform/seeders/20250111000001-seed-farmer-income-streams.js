'use strict';

/**
 * Seed Farmer Income Streams
 *
 * Creates income stream records for the 5 demo farmers
 * to support multi-persona farm tab in the mobile app.
 *
 * Activity profiles:
 *   Raju       — Crop + Dairy           (double income)
 *   Lakshmi    — Crop only + SHG        (single agri)
 *   Kumar      — Crop only + Labour     (single agri + other)
 *   Manjunath  — Crop + Dairy + Horti   (triple income)
 *   Savitri    — Crop + Fisheries + SHG (double income)
 */

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // ── Look up farmer IDs ──
    const [farmerRows] = await queryInterface.sequelize.query(
      `SELECT id, user_id FROM users WHERE user_id IN (
        'USR-RAJU-GOWDA-001', 'USR-LAKSHMI-DEVI-002', 'USR-KUMAR-NAIK-003',
        'USR-MANJUNATH-004', 'USR-SAVITRI-BAI-005'
      )`
    );
    const farmerMap = {};
    farmerRows.forEach((r) => { farmerMap[r.user_id] = r.id; });

    const rajuId      = farmerMap['USR-RAJU-GOWDA-001'];
    const lakshmiId   = farmerMap['USR-LAKSHMI-DEVI-002'];
    const kumarId     = farmerMap['USR-KUMAR-NAIK-003'];
    const manjunathId = farmerMap['USR-MANJUNATH-004'];
    const savitriId   = farmerMap['USR-SAVITRI-BAI-005'];

    if (!rajuId || !lakshmiId || !kumarId || !manjunathId || !savitriId) {
      console.warn('[seed-farmer-income-streams] Could not resolve all farmer IDs. Aborting.');
      return;
    }

    await queryInterface.bulkInsert('farmer_income_streams', [
      // ── Raju: Crop + Dairy (double income) ──
      {
        stream_uuid: 'FIS-RAJU-CROP-001',
        farmer_id: rajuId,
        stream_type: 'crop',
        annual_income: 300000.00,
        income_source_description: 'Wheat + Ragi cultivation on 5 ha',
        income_stability_rating: 'stable',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        stream_uuid: 'FIS-RAJU-DAIRY-001',
        farmer_id: rajuId,
        stream_type: 'dairy',
        annual_income: 120000.00,
        income_source_description: '4 milch cows, 12L/day average',
        income_stability_rating: 'very_stable',
        is_active: true,
        created_at: now,
        updated_at: now,
      },

      // ── Lakshmi: Crop + SHG (single agri income) ──
      {
        stream_uuid: 'FIS-LAKSHMI-CROP-001',
        farmer_id: lakshmiId,
        stream_type: 'crop',
        annual_income: 150000.00,
        income_source_description: 'Paddy on 3 ha',
        income_stability_rating: 'moderate',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        stream_uuid: 'FIS-LAKSHMI-SHG-001',
        farmer_id: lakshmiId,
        stream_type: 'shg',
        annual_income: 18000.00,
        income_source_description: 'Lakshmi SHG - monthly savings Rs 500, SHG loan Rs 15,000',
        income_stability_rating: 'stable',
        is_active: true,
        created_at: now,
        updated_at: now,
      },

      // ── Kumar: Crop + Labour (single agri + other) ──
      {
        stream_uuid: 'FIS-KUMAR-CROP-001',
        farmer_id: kumarId,
        stream_type: 'crop',
        annual_income: 400000.00,
        income_source_description: 'Cotton + Jowar on 8 ha',
        income_stability_rating: 'moderate',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        stream_uuid: 'FIS-KUMAR-LABOUR-001',
        farmer_id: kumarId,
        stream_type: 'labour',
        annual_income: 80000.00,
        income_source_description: 'Agricultural and construction labour',
        income_stability_rating: 'unstable',
        is_active: true,
        created_at: now,
        updated_at: now,
      },

      // ── Manjunath: Crop + Dairy + Horticulture (triple income) ──
      {
        stream_uuid: 'FIS-MANJUNATH-CROP-001',
        farmer_id: manjunathId,
        stream_type: 'crop',
        annual_income: 250000.00,
        income_source_description: 'Wheat + Sunflower on 4 ha',
        income_stability_rating: 'stable',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        stream_uuid: 'FIS-MANJUNATH-DAIRY-001',
        farmer_id: manjunathId,
        stream_type: 'dairy',
        annual_income: 100000.00,
        income_source_description: '3 milch cows + 2 buffaloes',
        income_stability_rating: 'very_stable',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        stream_uuid: 'FIS-MANJUNATH-HORTI-001',
        farmer_id: manjunathId,
        stream_type: 'horticulture',
        annual_income: 150000.00,
        income_source_description: 'Mango orchard 2 ha (Alphonso + Totapuri)',
        income_stability_rating: 'stable',
        is_active: true,
        created_at: now,
        updated_at: now,
      },

      // ── Savitri: Crop + Fisheries + SHG (double agri income) ──
      {
        stream_uuid: 'FIS-SAVITRI-CROP-001',
        farmer_id: savitriId,
        stream_type: 'crop',
        annual_income: 80000.00,
        income_source_description: 'Rice on 1.5 ha (small holding)',
        income_stability_rating: 'moderate',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        stream_uuid: 'FIS-SAVITRI-FISH-001',
        farmer_id: savitriId,
        stream_type: 'fisheries',
        annual_income: 60000.00,
        income_source_description: 'Rohu + Catla in 1 pond (0.5 ha)',
        income_stability_rating: 'moderate',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        stream_uuid: 'FIS-SAVITRI-SHG-001',
        farmer_id: savitriId,
        stream_type: 'shg',
        annual_income: 12000.00,
        income_source_description: 'Shakti SHG - monthly savings Rs 300, SHG loan Rs 10,000',
        income_stability_rating: 'stable',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    console.log('[seed-farmer-income-streams] Seeded 13 income streams for 5 demo farmers.');
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('farmer_income_streams', {
      stream_uuid: {
        [require('sequelize').Op.like]: 'FIS-%',
      },
    });
  },
};
