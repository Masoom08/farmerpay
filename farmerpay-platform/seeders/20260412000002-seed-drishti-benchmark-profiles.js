'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * DRISHTI Benchmark Profiles — Seed Data
 *
 * Populates drishti_benchmark_profiles with realistic district-level benchmarks
 * for major crops, dairy, and fishery across Maharashtra, Karnataka, and Madhya Pradesh.
 *
 * Data is based on publicly available agricultural statistics (NABARD, state
 * agriculture dept reports, ICAR crop estimates). All values are approximate
 * and represent 2025-26 season averages.
 *
 * Uses district_code lookups to resolve IDs dynamically.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // ── Look up district IDs by district_code ──
    const [districts] = await queryInterface.sequelize.query(
      `SELECT id, district_code, district_name FROM lgd_districts WHERE district_code IN (
        '2701','2702','2703','2704',
        '2901','2902','2903','2904',
        '2301','2302','2303'
      )`
    );

    const districtMap = {};
    for (const d of districts) {
      districtMap[d.district_code] = d.id;
    }

    // Helper to create a benchmark row
    const b = (districtCode, season, activityType, cropId, data) => ({
      benchmark_uuid: uuidv4(),
      district_id: districtMap[districtCode] || 1,
      season,
      activity_type: activityType,
      crop_id: cropId,
      ...data,
      benchmark_date: today,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    const benchmarks = [];

    // ═══════════════════════════════════════════════════════════════
    // MAHARASHTRA (27xx) — Pune, Nashik, Nagpur, Kolhapur
    // ═══════════════════════════════════════════════════════════════

    // ── Pune (2701) — Diversified: sugarcane, soybean, onion ──
    benchmarks.push(
      b('2701', 'kharif', 'crop', 'crop_paddy', {
        avg_yield_kg_per_hectare: 2800, avg_cost_per_hectare: 48000, avg_revenue_per_hectare: 67200, avg_profit_per_hectare: 19200,
        yield_rainfall_elasticity: -0.55, yield_temperature_sensitivity: -0.30,
        historical_claim_rate_pct: 22, avg_claim_payout: 14000, sample_size: 450,
      }),
      b('2701', 'kharif', 'crop', 'crop_soybean', {
        avg_yield_kg_per_hectare: 1400, avg_cost_per_hectare: 32000, avg_revenue_per_hectare: 63000, avg_profit_per_hectare: 31000,
        yield_rainfall_elasticity: -0.45, yield_temperature_sensitivity: -0.25,
        historical_claim_rate_pct: 28, avg_claim_payout: 12000, sample_size: 380,
      }),
      b('2701', 'rabi', 'crop', 'crop_wheat', {
        avg_yield_kg_per_hectare: 2200, avg_cost_per_hectare: 38000, avg_revenue_per_hectare: 52800, avg_profit_per_hectare: 14800,
        yield_rainfall_elasticity: -0.30, yield_temperature_sensitivity: -0.35,
        historical_claim_rate_pct: 15, avg_claim_payout: 10000, sample_size: 200,
      }),
      b('2701', null, 'dairy', null, {
        avg_milk_yield_per_animal: 8.5, avg_monthly_cost_per_animal: 5200, avg_monthly_revenue_per_animal: 8925,
        sample_size: 320,
      }),
    );

    // ── Nashik (2702) — Grape/onion belt, kharif pulses ──
    benchmarks.push(
      b('2702', 'kharif', 'crop', 'crop_paddy', {
        avg_yield_kg_per_hectare: 2600, avg_cost_per_hectare: 45000, avg_revenue_per_hectare: 62400, avg_profit_per_hectare: 17400,
        yield_rainfall_elasticity: -0.50, yield_temperature_sensitivity: -0.28,
        historical_claim_rate_pct: 25, avg_claim_payout: 13000, sample_size: 350,
      }),
      b('2702', 'kharif', 'crop', 'crop_cotton', {
        avg_yield_kg_per_hectare: 350, avg_cost_per_hectare: 42000, avg_revenue_per_hectare: 63000, avg_profit_per_hectare: 21000,
        yield_rainfall_elasticity: -0.60, yield_temperature_sensitivity: -0.35,
        historical_claim_rate_pct: 32, avg_claim_payout: 18000, sample_size: 280,
      }),
      b('2702', null, 'dairy', null, {
        avg_milk_yield_per_animal: 7.0, avg_monthly_cost_per_animal: 4800, avg_monthly_revenue_per_animal: 7350,
        sample_size: 250,
      }),
    );

    // ── Nagpur (2703) — Vidarbha: cotton + soybean belt, drought-prone ──
    benchmarks.push(
      b('2703', 'kharif', 'crop', 'crop_cotton', {
        avg_yield_kg_per_hectare: 300, avg_cost_per_hectare: 40000, avg_revenue_per_hectare: 54000, avg_profit_per_hectare: 14000,
        yield_rainfall_elasticity: -0.65, yield_temperature_sensitivity: -0.40,
        historical_claim_rate_pct: 38, avg_claim_payout: 20000, sample_size: 600,
      }),
      b('2703', 'kharif', 'crop', 'crop_soybean', {
        avg_yield_kg_per_hectare: 1200, avg_cost_per_hectare: 30000, avg_revenue_per_hectare: 54000, avg_profit_per_hectare: 24000,
        yield_rainfall_elasticity: -0.50, yield_temperature_sensitivity: -0.30,
        historical_claim_rate_pct: 35, avg_claim_payout: 15000, sample_size: 500,
      }),
      b('2703', 'rabi', 'crop', 'crop_chickpea', {
        avg_yield_kg_per_hectare: 900, avg_cost_per_hectare: 25000, avg_revenue_per_hectare: 45000, avg_profit_per_hectare: 20000,
        yield_rainfall_elasticity: -0.35, yield_temperature_sensitivity: -0.25,
        historical_claim_rate_pct: 20, avg_claim_payout: 11000, sample_size: 350,
      }),
      b('2703', null, 'dairy', null, {
        avg_milk_yield_per_animal: 5.5, avg_monthly_cost_per_animal: 3800, avg_monthly_revenue_per_animal: 5775,
        sample_size: 180,
      }),
    );

    // ── Kolhapur (2704) — Sugarcane + dairy powerhouse ──
    benchmarks.push(
      b('2704', 'kharif', 'crop', 'crop_paddy', {
        avg_yield_kg_per_hectare: 3200, avg_cost_per_hectare: 52000, avg_revenue_per_hectare: 76800, avg_profit_per_hectare: 24800,
        yield_rainfall_elasticity: -0.40, yield_temperature_sensitivity: -0.25,
        historical_claim_rate_pct: 18, avg_claim_payout: 12000, sample_size: 400,
      }),
      b('2704', null, 'dairy', null, {
        avg_milk_yield_per_animal: 10.0, avg_monthly_cost_per_animal: 6000, avg_monthly_revenue_per_animal: 10500,
        sample_size: 500,
      }),
      b('2704', null, 'fishery', null, {
        avg_yield_kg_per_hectare_pond: 4000, avg_cost_per_hectare_pond: 160000, avg_revenue_per_hectare_pond: 480000,
        sample_size: 80,
      }),
    );

    // ═══════════════════════════════════════════════════════════════
    // KARNATAKA (29xx) — Bengaluru, Mysuru, Belagavi, Dharwad
    // ═══════════════════════════════════════════════════════════════

    // ── Belagavi (2903) — Sugarcane, maize, soybean ──
    benchmarks.push(
      b('2903', 'kharif', 'crop', 'crop_paddy', {
        avg_yield_kg_per_hectare: 3400, avg_cost_per_hectare: 50000, avg_revenue_per_hectare: 81600, avg_profit_per_hectare: 31600,
        yield_rainfall_elasticity: -0.45, yield_temperature_sensitivity: -0.28,
        historical_claim_rate_pct: 20, avg_claim_payout: 14000, sample_size: 400,
      }),
      b('2903', 'kharif', 'crop', 'crop_soybean', {
        avg_yield_kg_per_hectare: 1300, avg_cost_per_hectare: 28000, avg_revenue_per_hectare: 58500, avg_profit_per_hectare: 30500,
        yield_rainfall_elasticity: -0.40, yield_temperature_sensitivity: -0.22,
        historical_claim_rate_pct: 22, avg_claim_payout: 11000, sample_size: 300,
      }),
      b('2903', null, 'dairy', null, {
        avg_milk_yield_per_animal: 7.5, avg_monthly_cost_per_animal: 5000, avg_monthly_revenue_per_animal: 7875,
        sample_size: 350,
      }),
    );

    // ── Dharwad (2904) — Cotton, groundnut, jowar ──
    benchmarks.push(
      b('2904', 'kharif', 'crop', 'crop_cotton', {
        avg_yield_kg_per_hectare: 320, avg_cost_per_hectare: 38000, avg_revenue_per_hectare: 57600, avg_profit_per_hectare: 19600,
        yield_rainfall_elasticity: -0.55, yield_temperature_sensitivity: -0.35,
        historical_claim_rate_pct: 30, avg_claim_payout: 16000, sample_size: 280,
      }),
      b('2904', 'rabi', 'crop', 'crop_wheat', {
        avg_yield_kg_per_hectare: 1800, avg_cost_per_hectare: 35000, avg_revenue_per_hectare: 43200, avg_profit_per_hectare: 8200,
        yield_rainfall_elasticity: -0.25, yield_temperature_sensitivity: -0.30,
        historical_claim_rate_pct: 12, avg_claim_payout: 8000, sample_size: 150,
      }),
      b('2904', null, 'dairy', null, {
        avg_milk_yield_per_animal: 6.0, avg_monthly_cost_per_animal: 4200, avg_monthly_revenue_per_animal: 6300,
        sample_size: 200,
      }),
    );

    // ── Mysuru (2902) — Tobacco, ragi, silk ──
    benchmarks.push(
      b('2902', 'kharif', 'crop', 'crop_paddy', {
        avg_yield_kg_per_hectare: 3600, avg_cost_per_hectare: 55000, avg_revenue_per_hectare: 86400, avg_profit_per_hectare: 31400,
        yield_rainfall_elasticity: -0.40, yield_temperature_sensitivity: -0.25,
        historical_claim_rate_pct: 15, avg_claim_payout: 12000, sample_size: 300,
      }),
      b('2902', null, 'dairy', null, {
        avg_milk_yield_per_animal: 8.0, avg_monthly_cost_per_animal: 5500, avg_monthly_revenue_per_animal: 8400,
        sample_size: 280,
      }),
      b('2902', null, 'fishery', null, {
        avg_yield_kg_per_hectare_pond: 3200, avg_cost_per_hectare_pond: 130000, avg_revenue_per_hectare_pond: 384000,
        sample_size: 60,
      }),
    );

    // ═══════════════════════════════════════════════════════════════
    // MADHYA PRADESH (23xx) — Bhopal, Indore, Jabalpur
    // ═══════════════════════════════════════════════════════════════

    // ── Indore (2302) — Soybean capital of India ──
    benchmarks.push(
      b('2302', 'kharif', 'crop', 'crop_soybean', {
        avg_yield_kg_per_hectare: 1500, avg_cost_per_hectare: 30000, avg_revenue_per_hectare: 67500, avg_profit_per_hectare: 37500,
        yield_rainfall_elasticity: -0.45, yield_temperature_sensitivity: -0.25,
        historical_claim_rate_pct: 25, avg_claim_payout: 14000, sample_size: 800,
      }),
      b('2302', 'rabi', 'crop', 'crop_wheat', {
        avg_yield_kg_per_hectare: 3200, avg_cost_per_hectare: 42000, avg_revenue_per_hectare: 76800, avg_profit_per_hectare: 34800,
        yield_rainfall_elasticity: -0.25, yield_temperature_sensitivity: -0.35,
        historical_claim_rate_pct: 12, avg_claim_payout: 10000, sample_size: 600,
      }),
      b('2302', 'rabi', 'crop', 'crop_chickpea', {
        avg_yield_kg_per_hectare: 1100, avg_cost_per_hectare: 26000, avg_revenue_per_hectare: 55000, avg_profit_per_hectare: 29000,
        yield_rainfall_elasticity: -0.30, yield_temperature_sensitivity: -0.20,
        historical_claim_rate_pct: 18, avg_claim_payout: 12000, sample_size: 400,
      }),
      b('2302', null, 'dairy', null, {
        avg_milk_yield_per_animal: 6.5, avg_monthly_cost_per_animal: 4000, avg_monthly_revenue_per_animal: 6825,
        sample_size: 250,
      }),
    );

    // ── Bhopal (2301) — Wheat + pulses ──
    benchmarks.push(
      b('2301', 'kharif', 'crop', 'crop_paddy', {
        avg_yield_kg_per_hectare: 2400, avg_cost_per_hectare: 42000, avg_revenue_per_hectare: 57600, avg_profit_per_hectare: 15600,
        yield_rainfall_elasticity: -0.50, yield_temperature_sensitivity: -0.30,
        historical_claim_rate_pct: 28, avg_claim_payout: 13000, sample_size: 350,
      }),
      b('2301', 'rabi', 'crop', 'crop_wheat', {
        avg_yield_kg_per_hectare: 2800, avg_cost_per_hectare: 40000, avg_revenue_per_hectare: 67200, avg_profit_per_hectare: 27200,
        yield_rainfall_elasticity: -0.25, yield_temperature_sensitivity: -0.32,
        historical_claim_rate_pct: 14, avg_claim_payout: 10000, sample_size: 400,
      }),
      b('2301', null, 'dairy', null, {
        avg_milk_yield_per_animal: 5.0, avg_monthly_cost_per_animal: 3500, avg_monthly_revenue_per_animal: 5250,
        sample_size: 180,
      }),
    );

    // ── Jabalpur (2303) — Paddy + pulses, Narmada belt ──
    benchmarks.push(
      b('2303', 'kharif', 'crop', 'crop_paddy', {
        avg_yield_kg_per_hectare: 3000, avg_cost_per_hectare: 46000, avg_revenue_per_hectare: 72000, avg_profit_per_hectare: 26000,
        yield_rainfall_elasticity: -0.48, yield_temperature_sensitivity: -0.28,
        historical_claim_rate_pct: 22, avg_claim_payout: 14000, sample_size: 400,
      }),
      b('2303', 'rabi', 'crop', 'crop_chickpea', {
        avg_yield_kg_per_hectare: 1000, avg_cost_per_hectare: 24000, avg_revenue_per_hectare: 50000, avg_profit_per_hectare: 26000,
        yield_rainfall_elasticity: -0.30, yield_temperature_sensitivity: -0.22,
        historical_claim_rate_pct: 20, avg_claim_payout: 11000, sample_size: 300,
      }),
      b('2303', null, 'dairy', null, {
        avg_milk_yield_per_animal: 6.0, avg_monthly_cost_per_animal: 4000, avg_monthly_revenue_per_animal: 6300,
        sample_size: 200,
      }),
      b('2303', null, 'fishery', null, {
        avg_yield_kg_per_hectare_pond: 3500, avg_cost_per_hectare_pond: 140000, avg_revenue_per_hectare_pond: 420000,
        sample_size: 50,
      }),
    );

    await queryInterface.bulkInsert('drishti_benchmark_profiles', benchmarks);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('drishti_benchmark_profiles', null, {});
  },
};
