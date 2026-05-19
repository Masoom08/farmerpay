'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // Input units
    await queryInterface.bulkInsert('input_units', [
      { unit_code: 'kg', unit_name: 'Kilogram', unit_symbol: 'kg', is_weight: true, is_volume: false, is_count: false, is_area: false, is_active: true, created_at: now, updated_at: now },
      { unit_code: 'g', unit_name: 'Gram', unit_symbol: 'g', is_weight: true, is_volume: false, is_count: false, is_area: false, is_active: true, created_at: now, updated_at: now },
      { unit_code: 'l', unit_name: 'Liter', unit_symbol: 'L', is_weight: false, is_volume: true, is_count: false, is_area: false, is_active: true, created_at: now, updated_at: now },
      { unit_code: 'ml', unit_name: 'Milliliter', unit_symbol: 'mL', is_weight: false, is_volume: true, is_count: false, is_area: false, is_active: true, created_at: now, updated_at: now },
      { unit_code: 'bags', unit_name: 'Bags', unit_symbol: 'bags', is_weight: false, is_volume: false, is_count: true, is_area: false, is_active: true, created_at: now, updated_at: now },
      { unit_code: 'pieces', unit_name: 'Pieces', unit_symbol: 'pcs', is_weight: false, is_volume: false, is_count: true, is_area: false, is_active: true, created_at: now, updated_at: now },
      { unit_code: 'hectares', unit_name: 'Hectares', unit_symbol: 'ha', is_weight: false, is_volume: false, is_count: false, is_area: true, is_active: true, created_at: now, updated_at: now },
      { unit_code: 'tonnes', unit_name: 'Tonnes', unit_symbol: 't', is_weight: true, is_volume: false, is_count: false, is_area: false, is_active: true, created_at: now, updated_at: now },
      { unit_code: 'quintal', unit_name: 'Quintal', unit_symbol: 'q', is_weight: true, is_volume: false, is_count: false, is_area: false, is_active: true, created_at: now, updated_at: now },
    ]);

    // Input categories
    await queryInterface.bulkInsert('input_categories', [
      { category_code: 'seeds', category_name: 'Seeds', category_order: 1, is_active: true, created_at: now, updated_at: now },
      { category_code: 'fertilizers', category_name: 'Fertilizers', category_order: 2, is_active: true, created_at: now, updated_at: now },
      { category_code: 'pesticides', category_name: 'Pesticides', category_order: 3, is_active: true, created_at: now, updated_at: now },
      { category_code: 'herbicides', category_name: 'Herbicides', category_order: 4, is_active: true, created_at: now, updated_at: now },
      { category_code: 'fungicides', category_name: 'Fungicides', category_order: 5, is_active: true, created_at: now, updated_at: now },
      { category_code: 'machinery', category_name: 'Machinery', category_order: 6, is_active: true, created_at: now, updated_at: now },
      { category_code: 'labor', category_name: 'Labor', category_order: 7, is_active: true, created_at: now, updated_at: now },
    ]);

    // Climate zones
    await queryInterface.bulkInsert('climate_zones', [
      { zone_code: 'tropical_wet', zone_name: 'Tropical Wet', temperature_range_min: 22, temperature_range_max: 35, avg_rainfall_mm: 2000, monsoon_season: 'Jun-Sep', frost_risk: false, is_active: true, created_at: now, updated_at: now },
      { zone_code: 'tropical_dry', zone_name: 'Tropical Dry', temperature_range_min: 20, temperature_range_max: 40, avg_rainfall_mm: 800, monsoon_season: 'Jul-Sep', frost_risk: false, is_active: true, created_at: now, updated_at: now },
      { zone_code: 'subtropical', zone_name: 'Subtropical', temperature_range_min: 10, temperature_range_max: 38, avg_rainfall_mm: 1200, monsoon_season: 'Jul-Sep', frost_risk: false, is_active: true, created_at: now, updated_at: now },
      { zone_code: 'semi_arid', zone_name: 'Semi-Arid', temperature_range_min: 15, temperature_range_max: 45, avg_rainfall_mm: 500, monsoon_season: 'Jul-Aug', frost_risk: false, is_active: true, created_at: now, updated_at: now },
      { zone_code: 'arid', zone_name: 'Arid', temperature_range_min: 10, temperature_range_max: 48, avg_rainfall_mm: 250, monsoon_season: 'Jul-Aug', frost_risk: false, is_active: true, created_at: now, updated_at: now },
      { zone_code: 'temperate', zone_name: 'Temperate', temperature_range_min: 0, temperature_range_max: 30, avg_rainfall_mm: 1500, monsoon_season: 'Jun-Sep', frost_risk: true, is_active: true, created_at: now, updated_at: now },
    ]);

    // Soil types
    await queryInterface.bulkInsert('soil_types', [
      { soil_type_code: 'alluvial', soil_type_name: 'Alluvial Soil', texture_class: 'Loam', ph_range_min: 6.50, ph_range_max: 8.00, permeability_class: 'Moderate', is_active: true, created_at: now, updated_at: now },
      { soil_type_code: 'black_cotton', soil_type_name: 'Black Cotton Soil (Regur)', texture_class: 'Clay', ph_range_min: 7.50, ph_range_max: 8.50, permeability_class: 'Low', is_active: true, created_at: now, updated_at: now },
      { soil_type_code: 'red_soil', soil_type_name: 'Red Soil', texture_class: 'Sandy Loam', ph_range_min: 5.50, ph_range_max: 7.00, permeability_class: 'High', is_active: true, created_at: now, updated_at: now },
      { soil_type_code: 'laterite', soil_type_name: 'Laterite Soil', texture_class: 'Sandy Clay', ph_range_min: 5.00, ph_range_max: 6.50, permeability_class: 'High', is_active: true, created_at: now, updated_at: now },
      { soil_type_code: 'desert', soil_type_name: 'Desert Soil', texture_class: 'Sandy', ph_range_min: 8.00, ph_range_max: 9.50, permeability_class: 'Very High', is_active: true, created_at: now, updated_at: now },
      { soil_type_code: 'mountain', soil_type_name: 'Mountain Soil', texture_class: 'Loam', ph_range_min: 5.00, ph_range_max: 6.50, permeability_class: 'Moderate', is_active: true, created_at: now, updated_at: now },
    ]);

    // Major Indian crops
    const crops = [
      { crop_code: 'RICE', crop_name: 'Rice (Paddy)', crop_group: 'Cereals', botanical_name: 'Oryza sativa', crop_duration_days_min: 100, crop_duration_days_max: 150, is_annual: true, ideal_season: 'kharif', water_requirement_mm: 1200 },
      { crop_code: 'WHEAT', crop_name: 'Wheat', crop_group: 'Cereals', botanical_name: 'Triticum aestivum', crop_duration_days_min: 110, crop_duration_days_max: 140, is_annual: true, ideal_season: 'rabi', water_requirement_mm: 450 },
      { crop_code: 'MAIZE', crop_name: 'Maize (Corn)', crop_group: 'Cereals', botanical_name: 'Zea mays', crop_duration_days_min: 80, crop_duration_days_max: 120, is_annual: true, ideal_season: 'kharif', water_requirement_mm: 600 },
      { crop_code: 'SOYBEAN', crop_name: 'Soybean', crop_group: 'Oilseeds', botanical_name: 'Glycine max', crop_duration_days_min: 85, crop_duration_days_max: 120, is_annual: true, ideal_season: 'kharif', water_requirement_mm: 500 },
      { crop_code: 'COTTON', crop_name: 'Cotton', crop_group: 'Cash Crops', botanical_name: 'Gossypium spp.', crop_duration_days_min: 150, crop_duration_days_max: 200, is_annual: true, ideal_season: 'kharif', water_requirement_mm: 700 },
      { crop_code: 'SUGARCANE', crop_name: 'Sugarcane', crop_group: 'Cash Crops', botanical_name: 'Saccharum officinarum', crop_duration_days_min: 300, crop_duration_days_max: 365, is_perennial: true, ideal_season: 'year_round', water_requirement_mm: 2000 },
      { crop_code: 'CHICKPEA', crop_name: 'Chickpea (Chana)', crop_group: 'Pulses', botanical_name: 'Cicer arietinum', crop_duration_days_min: 90, crop_duration_days_max: 120, is_annual: true, ideal_season: 'rabi', water_requirement_mm: 350 },
      { crop_code: 'GROUNDNUT', crop_name: 'Groundnut (Peanut)', crop_group: 'Oilseeds', botanical_name: 'Arachis hypogaea', crop_duration_days_min: 100, crop_duration_days_max: 130, is_annual: true, ideal_season: 'kharif', water_requirement_mm: 500 },
      { crop_code: 'MUSTARD', crop_name: 'Mustard', crop_group: 'Oilseeds', botanical_name: 'Brassica juncea', crop_duration_days_min: 100, crop_duration_days_max: 140, is_annual: true, ideal_season: 'rabi', water_requirement_mm: 300 },
      { crop_code: 'ONION', crop_name: 'Onion', crop_group: 'Vegetables', botanical_name: 'Allium cepa', crop_duration_days_min: 120, crop_duration_days_max: 150, is_annual: true, ideal_season: 'rabi', water_requirement_mm: 400 },
      { crop_code: 'TOMATO', crop_name: 'Tomato', crop_group: 'Vegetables', botanical_name: 'Solanum lycopersicum', crop_duration_days_min: 70, crop_duration_days_max: 120, is_annual: true, ideal_season: 'multiple', water_requirement_mm: 500 },
      { crop_code: 'POTATO', crop_name: 'Potato', crop_group: 'Vegetables', botanical_name: 'Solanum tuberosum', crop_duration_days_min: 80, crop_duration_days_max: 120, is_annual: true, ideal_season: 'rabi', water_requirement_mm: 450 },
    ];

    await queryInterface.bulkInsert('crop_masters',
      crops.map((c) => ({ ...c, crop_id: uuidv4(), is_annual: c.is_annual || false, is_perennial: c.is_perennial || false, is_active: true, created_at: now, updated_at: now }))
    );

    // Traits
    await queryInterface.bulkInsert('traits', [
      { trait_code: 'DROUGHT_TOL', trait_name: 'Drought Tolerance', trait_category: 'Stress Tolerance', measurement_unit: 'Rating', is_quantifiable: false, is_active: true, created_at: now, updated_at: now },
      { trait_code: 'PEST_RESIST', trait_name: 'Pest Resistance', trait_category: 'Stress Tolerance', measurement_unit: 'Rating', is_quantifiable: false, is_active: true, created_at: now, updated_at: now },
      { trait_code: 'YIELD_POT', trait_name: 'Yield Potential', trait_category: 'Productivity', measurement_unit: 'kg/ha', is_quantifiable: true, is_active: true, created_at: now, updated_at: now },
      { trait_code: 'MATURITY', trait_name: 'Maturity Duration', trait_category: 'Growth', measurement_unit: 'days', is_quantifiable: true, is_active: true, created_at: now, updated_at: now },
      { trait_code: 'GRAIN_QUAL', trait_name: 'Grain Quality', trait_category: 'Quality', measurement_unit: 'Rating', is_quantifiable: false, is_active: true, created_at: now, updated_at: now },
      { trait_code: 'WATERLOG_TOL', trait_name: 'Waterlogging Tolerance', trait_category: 'Stress Tolerance', measurement_unit: 'Rating', is_quantifiable: false, is_active: true, created_at: now, updated_at: now },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('traits', null, {});
    await queryInterface.bulkDelete('crop_masters', null, {});
    await queryInterface.bulkDelete('soil_types', null, {});
    await queryInterface.bulkDelete('climate_zones', null, {});
    await queryInterface.bulkDelete('input_categories', null, {});
    await queryInterface.bulkDelete('input_units', null, {});
  },
};
