'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * DRISHTI Scenario Templates — Seed Data
 *
 * Populates drishti_scenario_templates with pre-built templates for all 6 engines.
 * These power the UI dropdowns and guided scenario builder flows.
 */

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const t = (overrides) => ({ template_uuid: uuidv4(), is_system: true, is_active: true, created_at: now, updated_at: now, ...overrides });

    await queryInterface.bulkInsert('drishti_scenario_templates', [

      // ═══════════════════════════════════════════════════════════════
      // PRE-LOAN TEMPLATES
      // ═══════════════════════════════════════════════════════════════

      t({
        engine_type: 'pre_loan',
        template_name: 'Standard Kharif Crop Loan',
        template_name_key: 'drishti.template.pre_loan.kharif_crop',
        description: 'Evaluate a typical kharif season crop loan — paddy, soybean, cotton, or millets',
        default_variables: JSON.stringify({
          loan_amount: 100000, loan_tenure_months: 12, repayment_type: 'emi',
          activity: { type: 'crop', season: 'kharif', irrigation_type: 'rainfed', acreage_hectares: 1.0 },
          computation_mode: 'deterministic', include_insurance_comparison: true,
        }),
        variable_ranges: JSON.stringify({
          loan_amount: { min: 10000, max: 500000, step: 10000 },
          loan_tenure_months: { min: 6, max: 24, step: 3 },
          acreage_hectares: { min: 0.25, max: 10, step: 0.25 },
        }),
        activity_types: JSON.stringify(['crop']),
        display_order: 1,
      }),

      t({
        engine_type: 'pre_loan',
        template_name: 'Rabi Crop Loan',
        template_name_key: 'drishti.template.pre_loan.rabi_crop',
        description: 'Evaluate a rabi season crop loan — wheat, mustard, chickpea, or vegetables',
        default_variables: JSON.stringify({
          loan_amount: 80000, loan_tenure_months: 9, repayment_type: 'emi',
          activity: { type: 'crop', season: 'rabi', irrigation_type: 'irrigated', acreage_hectares: 0.8 },
          computation_mode: 'deterministic', include_insurance_comparison: true,
        }),
        variable_ranges: JSON.stringify({
          loan_amount: { min: 10000, max: 300000, step: 10000 },
          loan_tenure_months: { min: 6, max: 18, step: 3 },
          acreage_hectares: { min: 0.25, max: 10, step: 0.25 },
        }),
        activity_types: JSON.stringify(['crop']),
        display_order: 2,
      }),

      t({
        engine_type: 'pre_loan',
        template_name: 'Dairy Expansion Loan',
        template_name_key: 'drishti.template.pre_loan.dairy_expansion',
        description: 'Evaluate a dairy expansion loan — purchase animals, shed construction, feed infrastructure',
        default_variables: JSON.stringify({
          loan_amount: 200000, loan_tenure_months: 36, repayment_type: 'emi',
          activity: { type: 'dairy', animal_count: 3, feed_quality: 'standard' },
          computation_mode: 'deterministic', include_insurance_comparison: false,
        }),
        variable_ranges: JSON.stringify({
          loan_amount: { min: 50000, max: 500000, step: 25000 },
          loan_tenure_months: { min: 12, max: 60, step: 6 },
          animal_count: { min: 1, max: 20, step: 1 },
        }),
        activity_types: JSON.stringify(['dairy']),
        display_order: 3,
      }),

      t({
        engine_type: 'pre_loan',
        template_name: 'Equipment Purchase Loan',
        template_name_key: 'drishti.template.pre_loan.equipment',
        description: 'Evaluate a farm equipment loan — tractor, pump set, sprayer, or thresher',
        default_variables: JSON.stringify({
          loan_amount: 300000, loan_tenure_months: 48, repayment_type: 'emi',
          activity: { type: 'crop', season: 'annual', irrigation_type: 'irrigated', acreage_hectares: 2.0 },
          computation_mode: 'deterministic', include_insurance_comparison: false,
        }),
        variable_ranges: JSON.stringify({
          loan_amount: { min: 50000, max: 1000000, step: 50000 },
          loan_tenure_months: { min: 24, max: 84, step: 12 },
        }),
        activity_types: JSON.stringify(['crop', 'dairy', 'fishery', 'horticulture']),
        display_order: 4,
      }),

      t({
        engine_type: 'pre_loan',
        template_name: 'Fishery Pond Loan',
        template_name_key: 'drishti.template.pre_loan.fishery',
        description: 'Evaluate a fishery/aquaculture loan — pond construction, fingerlings, feed',
        default_variables: JSON.stringify({
          loan_amount: 150000, loan_tenure_months: 24, repayment_type: 'emi',
          activity: { type: 'fishery', pond_area_hectares: 0.5, stocking_density: 'standard', cycle_months: 8 },
          computation_mode: 'deterministic', include_insurance_comparison: false,
        }),
        variable_ranges: JSON.stringify({
          loan_amount: { min: 25000, max: 500000, step: 25000 },
          pond_area_hectares: { min: 0.1, max: 5, step: 0.1 },
        }),
        activity_types: JSON.stringify(['fishery']),
        display_order: 5,
      }),

      // ═══════════════════════════════════════════════════════════════
      // HOUSEHOLD PORTFOLIO TEMPLATES
      // ═══════════════════════════════════════════════════════════════

      t({
        engine_type: 'household_portfolio',
        template_name: 'Add Dairy to Farm',
        template_name_key: 'drishti.template.portfolio.add_dairy',
        description: 'What if I start dairy alongside my crops? Projects combined household income with 2-3 animals',
        default_variables: JSON.stringify({
          proposed_farm_activities: {
            crops: [{ crop_id: null, acreage_hectares: 1.0, season: 'kharif', irrigation: 'rainfed' }],
            dairy: { animal_count: 2, feed_quality: 'standard' },
          },
          time_horizon_months: 12, include_stress_scenarios: true,
        }),
        variable_ranges: JSON.stringify({
          animal_count: { min: 1, max: 10, step: 1 },
          acreage_hectares: { min: 0.25, max: 10, step: 0.25 },
        }),
        activity_types: JSON.stringify(['crop', 'dairy']),
        display_order: 1,
      }),

      t({
        engine_type: 'household_portfolio',
        template_name: 'Shift to Horticulture',
        template_name_key: 'drishti.template.portfolio.shift_horti',
        description: 'What if I shift some acreage from grains to vegetables or fruits?',
        default_variables: JSON.stringify({
          proposed_farm_activities: {
            crops: [
              { crop_id: null, acreage_hectares: 0.5, season: 'kharif', irrigation: 'rainfed' },
              { crop_id: null, acreage_hectares: 0.5, season: 'rabi', irrigation: 'irrigated' },
            ],
          },
          time_horizon_months: 12, include_stress_scenarios: true,
        }),
        variable_ranges: JSON.stringify({
          acreage_hectares: { min: 0.25, max: 5, step: 0.25 },
        }),
        activity_types: JSON.stringify(['crop', 'horticulture']),
        display_order: 2,
      }),

      t({
        engine_type: 'household_portfolio',
        template_name: 'SHG Formation Impact',
        template_name_key: 'drishti.template.portfolio.shg_formation',
        description: 'What if spouse joins an SHG? Projects the impact of micro-enterprise income on household resilience',
        default_variables: JSON.stringify({
          proposed_farm_activities: {},
          household_income: {
            use_saved_profile: true,
            additional_sources: [
              { source_type: 'spouse_shg', earning_member: 'spouse', amount_monthly: 3000, reliability: 'regular' },
            ],
          },
          time_horizon_months: 12, include_stress_scenarios: true,
        }),
        variable_ranges: JSON.stringify({
          shg_monthly_income: { min: 500, max: 10000, step: 500 },
        }),
        activity_types: JSON.stringify(['crop', 'dairy', 'fishery', 'horticulture']),
        display_order: 3,
      }),

      t({
        engine_type: 'household_portfolio',
        template_name: 'Add Fishery Pond',
        template_name_key: 'drishti.template.portfolio.add_fishery',
        description: 'What if I add a fishery pond to diversify income?',
        default_variables: JSON.stringify({
          proposed_farm_activities: {
            crops: [{ crop_id: null, acreage_hectares: 1.0, season: 'kharif', irrigation: 'rainfed' }],
            fishery: { pond_area_hectares: 0.2, stocking_density: 'standard', cycle_months: 8 },
          },
          time_horizon_months: 12, include_stress_scenarios: true,
        }),
        variable_ranges: JSON.stringify({
          pond_area_hectares: { min: 0.1, max: 2, step: 0.1 },
        }),
        activity_types: JSON.stringify(['crop', 'fishery']),
        display_order: 4,
      }),

      // ═══════════════════════════════════════════════════════════════
      // CLIMATE STRESS TEMPLATES
      // ═══════════════════════════════════════════════════════════════

      t({
        engine_type: 'climate_stress',
        template_name: 'Drought Scenario',
        template_name_key: 'drishti.template.climate.drought',
        description: 'What if rainfall is 25-35% below normal? Models crop yield drop, dairy feed cost spike, and loan stress',
        default_variables: JSON.stringify({
          climate_scenario: { rainfall_deviation_pct: -30, temperature_deviation_celsius: 2, delayed_monsoon_weeks: 0 },
          include_household_impact: true, computation_mode: 'deterministic',
        }),
        variable_ranges: JSON.stringify({
          rainfall_deviation_pct: { min: -50, max: 0, step: 5 },
          temperature_deviation_celsius: { min: 0, max: 5, step: 0.5 },
        }),
        activity_types: JSON.stringify(['crop', 'dairy', 'fishery', 'horticulture']),
        display_order: 1,
      }),

      t({
        engine_type: 'climate_stress',
        template_name: 'Flood Scenario',
        template_name_key: 'drishti.template.climate.flood',
        description: 'What if excess rainfall causes flooding? Models crop waterlogging damage and infrastructure loss',
        default_variables: JSON.stringify({
          climate_scenario: { rainfall_deviation_pct: 45, temperature_deviation_celsius: -1, delayed_monsoon_weeks: 0 },
          include_household_impact: true, computation_mode: 'deterministic',
        }),
        variable_ranges: JSON.stringify({
          rainfall_deviation_pct: { min: 20, max: 80, step: 5 },
        }),
        activity_types: JSON.stringify(['crop', 'fishery']),
        display_order: 2,
      }),

      t({
        engine_type: 'climate_stress',
        template_name: 'Delayed Monsoon',
        template_name_key: 'drishti.template.climate.delayed_monsoon',
        description: 'What if the monsoon is delayed by 3-5 weeks? Models compressed growing season and yield penalty',
        default_variables: JSON.stringify({
          climate_scenario: { rainfall_deviation_pct: -10, temperature_deviation_celsius: 1, delayed_monsoon_weeks: 4 },
          include_household_impact: true, computation_mode: 'deterministic',
        }),
        variable_ranges: JSON.stringify({
          delayed_monsoon_weeks: { min: 1, max: 8, step: 1 },
          rainfall_deviation_pct: { min: -30, max: 0, step: 5 },
        }),
        activity_types: JSON.stringify(['crop']),
        display_order: 3,
      }),

      t({
        engine_type: 'climate_stress',
        template_name: 'Heatwave Scenario',
        template_name_key: 'drishti.template.climate.heatwave',
        description: 'What if temperatures rise 3-5°C above normal during critical crop stages?',
        default_variables: JSON.stringify({
          climate_scenario: { rainfall_deviation_pct: -5, temperature_deviation_celsius: 4, delayed_monsoon_weeks: 0 },
          include_household_impact: true, computation_mode: 'deterministic',
        }),
        variable_ranges: JSON.stringify({
          temperature_deviation_celsius: { min: 2, max: 8, step: 0.5 },
        }),
        activity_types: JSON.stringify(['crop', 'dairy', 'fishery']),
        display_order: 4,
      }),

      // ═══════════════════════════════════════════════════════════════
      // INSURANCE TEMPLATES
      // ═══════════════════════════════════════════════════════════════

      t({
        engine_type: 'insurance',
        template_name: 'PMFBY Crop Insurance Evaluation',
        template_name_key: 'drishti.template.insurance.pmfby',
        description: 'Is Pradhan Mantri Fasal Bima Yojana worth it for my crop? Compares insured vs uninsured outcomes',
        default_variables: JSON.stringify({
          insurance_type: 'pmfby', sum_insured: 100000,
          activity: { type: 'crop', season: 'kharif', acreage_hectares: 1.0 },
          computation_mode: 'monte_carlo', monte_carlo_runs: 500,
        }),
        variable_ranges: JSON.stringify({
          sum_insured: { min: 25000, max: 500000, step: 25000 },
          acreage_hectares: { min: 0.25, max: 10, step: 0.25 },
        }),
        activity_types: JSON.stringify(['crop']),
        display_order: 1,
      }),

      t({
        engine_type: 'insurance',
        template_name: 'Weather Index Insurance (RWBCIS)',
        template_name_key: 'drishti.template.insurance.rwbcis',
        description: 'Evaluate weather-based crop insurance — triggers on rainfall deficit, not yield estimation',
        default_variables: JSON.stringify({
          insurance_type: 'weather_index', sum_insured: 80000,
          activity: { type: 'crop', season: 'kharif', acreage_hectares: 1.0 },
          computation_mode: 'monte_carlo', monte_carlo_runs: 500,
        }),
        variable_ranges: JSON.stringify({
          sum_insured: { min: 25000, max: 500000, step: 25000 },
        }),
        activity_types: JSON.stringify(['crop']),
        display_order: 2,
      }),

      t({
        engine_type: 'insurance',
        template_name: 'Livestock Insurance',
        template_name_key: 'drishti.template.insurance.livestock',
        description: 'Evaluate livestock insurance for dairy animals — covers death, disease, and accidents',
        default_variables: JSON.stringify({
          insurance_type: 'livestock', sum_insured: 150000,
          activity: { type: 'dairy', animal_count: 3 },
          computation_mode: 'deterministic',
        }),
        variable_ranges: JSON.stringify({
          sum_insured: { min: 30000, max: 500000, step: 10000 },
          animal_count: { min: 1, max: 20, step: 1 },
        }),
        activity_types: JSON.stringify(['dairy']),
        display_order: 3,
      }),

      // ═══════════════════════════════════════════════════════════════
      // MARKET TIMING TEMPLATES
      // ═══════════════════════════════════════════════════════════════

      t({
        engine_type: 'market_timing',
        template_name: 'Paddy: Sell Now vs Store',
        template_name_key: 'drishti.template.market.paddy',
        description: 'Should I sell my paddy now or store in warehouse? Accounts for MSP procurement window',
        default_variables: JSON.stringify({
          commodity_id: 'crop_paddy', quantity_quintals: 30,
          storage_options: { warehousing_cost_per_quintal_month: 40, storage_duration_months: [1, 2, 3], quality_degradation_pct_per_month: 0.5 },
          include_topup_loan_simulation: true, computation_mode: 'monte_carlo', monte_carlo_runs: 500,
        }),
        variable_ranges: JSON.stringify({
          quantity_quintals: { min: 5, max: 200, step: 5 },
          storage_months: { min: 1, max: 6, step: 1 },
        }),
        activity_types: JSON.stringify(['crop']),
        display_order: 1,
      }),

      t({
        engine_type: 'market_timing',
        template_name: 'Wheat: Sell Now vs Store',
        template_name_key: 'drishti.template.market.wheat',
        description: 'Wheat post-harvest timing — prices typically rise Apr-Aug after rabi harvest',
        default_variables: JSON.stringify({
          commodity_id: 'crop_wheat', quantity_quintals: 40,
          storage_options: { warehousing_cost_per_quintal_month: 35, storage_duration_months: [1, 2, 3, 4], quality_degradation_pct_per_month: 0.3 },
          include_topup_loan_simulation: true, computation_mode: 'monte_carlo', monte_carlo_runs: 500,
        }),
        variable_ranges: JSON.stringify({
          quantity_quintals: { min: 5, max: 200, step: 5 },
        }),
        activity_types: JSON.stringify(['crop']),
        display_order: 2,
      }),

      t({
        engine_type: 'market_timing',
        template_name: 'Soybean: Sell Now vs Store',
        template_name_key: 'drishti.template.market.soybean',
        description: 'Soybean post-harvest analysis — key Vidarbha/Marathwada crop',
        default_variables: JSON.stringify({
          commodity_id: 'crop_soybean', quantity_quintals: 25,
          storage_options: { warehousing_cost_per_quintal_month: 45, storage_duration_months: [1, 2, 3], quality_degradation_pct_per_month: 1.0 },
          include_topup_loan_simulation: false, computation_mode: 'monte_carlo', monte_carlo_runs: 500,
        }),
        variable_ranges: JSON.stringify({
          quantity_quintals: { min: 5, max: 100, step: 5 },
        }),
        activity_types: JSON.stringify(['crop']),
        display_order: 3,
      }),

      t({
        engine_type: 'market_timing',
        template_name: 'Cotton: Sell Now vs Store',
        template_name_key: 'drishti.template.market.cotton',
        description: 'Cotton post-harvest — prices can vary 20-30% between harvest and lean season',
        default_variables: JSON.stringify({
          commodity_id: 'crop_cotton', quantity_quintals: 20,
          storage_options: { warehousing_cost_per_quintal_month: 55, storage_duration_months: [1, 2, 3], quality_degradation_pct_per_month: 0.5 },
          include_topup_loan_simulation: true, computation_mode: 'monte_carlo', monte_carlo_runs: 500,
        }),
        variable_ranges: JSON.stringify({
          quantity_quintals: { min: 5, max: 100, step: 5 },
        }),
        activity_types: JSON.stringify(['crop']),
        display_order: 4,
      }),

      // ═══════════════════════════════════════════════════════════════
      // BANKER PORTFOLIO TEMPLATES
      // ═══════════════════════════════════════════════════════════════

      t({
        engine_type: 'banker_portfolio',
        template_name: 'Regional Monsoon Failure',
        template_name_key: 'drishti.template.banker.monsoon_failure',
        description: 'What if the monsoon fails in my lending district? Stress-test entire loan portfolio',
        default_variables: JSON.stringify({
          scope: { district_id: null },
          shock_variables: { rainfall_deviation_pct: -30, price_change_pct: -5, temperature_deviation_celsius: 2 },
          computation_mode: 'monte_carlo', monte_carlo_runs: 200,
        }),
        variable_ranges: JSON.stringify({
          rainfall_deviation_pct: { min: -50, max: 0, step: 5 },
          price_change_pct: { min: -20, max: 0, step: 5 },
        }),
        activity_types: JSON.stringify(['crop', 'dairy', 'fishery']),
        display_order: 1,
      }),

      t({
        engine_type: 'banker_portfolio',
        template_name: 'Commodity Price Crash',
        template_name_key: 'drishti.template.banker.price_crash',
        description: 'What if commodity prices crash 15-25%? Assess loan repayment capacity across the portfolio',
        default_variables: JSON.stringify({
          scope: { district_id: null },
          shock_variables: { rainfall_deviation_pct: 0, price_change_pct: -20, temperature_deviation_celsius: 0 },
          computation_mode: 'monte_carlo', monte_carlo_runs: 200,
        }),
        variable_ranges: JSON.stringify({
          price_change_pct: { min: -40, max: 0, step: 5 },
        }),
        activity_types: JSON.stringify(['crop']),
        display_order: 2,
      }),

      t({
        engine_type: 'banker_portfolio',
        template_name: 'Combined Climate + Market Stress',
        template_name_key: 'drishti.template.banker.combined_stress',
        description: 'Worst-case scenario: simultaneous drought + price decline. Full portfolio stress test',
        default_variables: JSON.stringify({
          scope: { district_id: null },
          shock_variables: { rainfall_deviation_pct: -35, price_change_pct: -15, temperature_deviation_celsius: 3 },
          computation_mode: 'monte_carlo', monte_carlo_runs: 200,
        }),
        variable_ranges: JSON.stringify({
          rainfall_deviation_pct: { min: -50, max: 0, step: 5 },
          price_change_pct: { min: -30, max: 0, step: 5 },
          temperature_deviation_celsius: { min: 0, max: 5, step: 0.5 },
        }),
        activity_types: JSON.stringify(['crop', 'dairy', 'fishery']),
        display_order: 3,
      }),
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('drishti_scenario_templates', { is_system: true }, {});
  },
};
