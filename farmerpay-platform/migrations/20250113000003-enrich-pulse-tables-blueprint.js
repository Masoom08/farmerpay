/**
 * Migration: Enrich PULSE tables with Blueprint fields.
 * Adds mandi enrichment, commodity volatility/perishability, price quality flags,
 * forecast horizons, market alert types, and DICE integration fields.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const DT = Sequelize.DataTypes;

    // ─── pulse_mandis: Blueprint enrichment ───────────────────────
    await queryInterface.addColumn('pulse_mandis', 'mandi_type',
      { type: DT.ENUM('apmc', 'enam', 'private', 'fpo_direct'), defaultValue: 'apmc' });
    await queryInterface.addColumn('pulse_mandis', 'density_score',
      { type: DT.DECIMAL(5, 2), allowNull: true });
    await queryInterface.addColumn('pulse_mandis', 'transport_cost_index',
      { type: DT.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('pulse_mandis', 'cold_storage_proximity_km',
      { type: DT.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('pulse_mandis', 'fpo_aggregation_flag',
      { type: DT.BOOLEAN, defaultValue: false });
    await queryInterface.addColumn('pulse_mandis', 'price_discovery_rank',
      { type: DT.INTEGER, allowNull: true });

    // ─── pulse_commodities: volatility + perishability ────────────
    await queryInterface.changeColumn('pulse_commodities', 'commodity_type', {
      type: DT.ENUM('food_grain', 'cash_crop', 'vegetable', 'fruit', 'spice', 'pulse', 'oilseed', 'cereal'),
      allowNull: true,
    });
    await queryInterface.addColumn('pulse_commodities', 'perishability_index',
      { type: DT.INTEGER, allowNull: true });
    await queryInterface.addColumn('pulse_commodities', 'storage_factor',
      { type: DT.DECIMAL(5, 4), allowNull: true });
    await queryInterface.addColumn('pulse_commodities', 'msp_applicable',
      { type: DT.BOOLEAN, defaultValue: false });
    await queryInterface.addColumn('pulse_commodities', 'volatility_class',
      { type: DT.ENUM('ultra_high', 'high', 'moderate', 'low'), allowNull: true });
    await queryInterface.addColumn('pulse_commodities', 'shelf_life_days',
      { type: DT.INTEGER, allowNull: true });
    await queryInterface.addColumn('pulse_commodities', 'cold_chain_dependency',
      { type: DT.ENUM('none', 'recommended', 'mandatory'), allowNull: true });

    // ─── pulse_price_records: quality + futures + policy ──────────
    await queryInterface.addColumn('pulse_price_records', 'modal_price',
      { type: DT.DECIMAL(10, 2), allowNull: true, after: 'lowest_price' });
    await queryInterface.addColumn('pulse_price_records', 'quality_flag',
      { type: DT.ENUM('clean', 'imputed', 'outlier', 'missing'), defaultValue: 'clean' });
    await queryInterface.addColumn('pulse_price_records', 'arrivals_tonnes',
      { type: DT.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('pulse_price_records', 'futures_basis',
      { type: DT.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('pulse_price_records', 'policy_regime',
      { type: DT.ENUM('open_market', 'export_ban', 'msp_procurement', 'buffer_release'), defaultValue: 'open_market' });

    // ─── pulse_price_forecasts: horizon + model + risk ────────────
    await queryInterface.addColumn('pulse_price_forecasts', 'mandi_id',
      { type: DT.INTEGER, allowNull: true, after: 'forecast_uuid' });
    await queryInterface.addColumn('pulse_price_forecasts', 'horizon_days',
      { type: DT.INTEGER, allowNull: true, after: 'forecast_date' });
    await queryInterface.addColumn('pulse_price_forecasts', 'predicted_price',
      { type: DT.DECIMAL(10, 2), allowNull: true, after: 'forecast_price_max' });
    await queryInterface.addColumn('pulse_price_forecasts', 'model_version',
      { type: DT.STRING(50), allowNull: true });
    await queryInterface.addColumn('pulse_price_forecasts', 'risk_score',
      { type: DT.INTEGER, allowNull: true });
    await queryInterface.addColumn('pulse_price_forecasts', 'directional_confidence',
      { type: DT.DECIMAL(5, 2), allowNull: true });
    // Add composite index for forecast lookup
    await queryInterface.addIndex('pulse_price_forecasts',
      ['commodity_id', 'mandi_id', 'forecast_date', 'horizon_days'],
      { name: 'idx_forecast_lookup' }).catch(() => {});

    // ─── pulse_market_alerts: mandi_id + new types ────────────────
    await queryInterface.addColumn('pulse_market_alerts', 'mandi_id',
      { type: DT.INTEGER, allowNull: true, after: 'commodity_id' });
    await queryInterface.changeColumn('pulse_market_alerts', 'alert_type', {
      type: DT.ENUM('price_spike', 'price_crash', 'supply_shortage', 'demand_surge', 'distress_warning', 'best_mandi_opportunity'),
      allowNull: false,
    });

    // ─── pulse_sell_recommendations: DICE integration fields ──────
    await queryInterface.addColumn('pulse_sell_recommendations', 'linked_loan_application_id',
      { type: DT.INTEGER, allowNull: true });
    await queryInterface.addColumn('pulse_sell_recommendations', 'loan_outstanding_at_recommendation',
      { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn('pulse_sell_recommendations', 'sell_now_realisation',
      { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn('pulse_sell_recommendations', 'store_15d_realisation',
      { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn('pulse_sell_recommendations', 'store_30d_realisation',
      { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn('pulse_sell_recommendations', 'optimal_strategy',
      { type: DT.ENUM('sell_now', 'store_15d', 'store_30d'), allowNull: true });
    await queryInterface.addColumn('pulse_sell_recommendations', 'topup_loan_eligible',
      { type: DT.BOOLEAN, defaultValue: false });
    await queryInterface.addColumn('pulse_sell_recommendations', 'topup_loan_max_amount',
      { type: DT.DECIMAL(15, 2), allowNull: true });
  },

  async down(queryInterface) {
    // pulse_sell_recommendations
    const srCols = ['linked_loan_application_id', 'loan_outstanding_at_recommendation',
      'sell_now_realisation', 'store_15d_realisation', 'store_30d_realisation',
      'optimal_strategy', 'topup_loan_eligible', 'topup_loan_max_amount'];
    for (const col of srCols) await queryInterface.removeColumn('pulse_sell_recommendations', col);

    // pulse_market_alerts
    await queryInterface.removeColumn('pulse_market_alerts', 'mandi_id');

    // pulse_price_forecasts
    const pfCols = ['mandi_id', 'horizon_days', 'predicted_price', 'model_version', 'risk_score', 'directional_confidence'];
    for (const col of pfCols) await queryInterface.removeColumn('pulse_price_forecasts', col);
    await queryInterface.removeIndex('pulse_price_forecasts', 'idx_forecast_lookup').catch(() => {});

    // pulse_price_records
    const prCols = ['modal_price', 'quality_flag', 'arrivals_tonnes', 'futures_basis', 'policy_regime'];
    for (const col of prCols) await queryInterface.removeColumn('pulse_price_records', col);

    // pulse_commodities
    const pcCols = ['perishability_index', 'storage_factor', 'msp_applicable', 'volatility_class', 'shelf_life_days', 'cold_chain_dependency'];
    for (const col of pcCols) await queryInterface.removeColumn('pulse_commodities', col);

    // pulse_mandis
    const pmCols = ['mandi_type', 'density_score', 'transport_cost_index', 'cold_storage_proximity_km', 'fpo_aggregation_flag', 'price_discovery_rank'];
    for (const col of pmCols) await queryInterface.removeColumn('pulse_mandis', col);
  },
};
