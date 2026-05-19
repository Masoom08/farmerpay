'use strict';

/**
 * SENTINEL Module Migration
 * Creates all 19 tables for loan health monitoring, EWS, and recovery management.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. loan_health_snapshots
    await queryInterface.createTable('loan_health_snapshots', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      snapshot_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      snapshot_date: { type: Sequelize.DATEONLY, allowNull: false },
      days_overdue: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      principal_outstanding: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      interest_outstanding: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      total_outstanding: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      next_emi_due_date: { type: Sequelize.DATEONLY, allowNull: true },
      next_emi_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      health_status: {
        type: Sequelize.ENUM('good', 'watch', 'stressed', 'npa'),
        allowNull: false, defaultValue: 'good',
      },
      health_score: { type: Sequelize.INTEGER, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('loan_health_snapshots', ['application_id', 'snapshot_date']);
    await queryInterface.addIndex('loan_health_snapshots', ['health_status']);

    // 2. sma_classification_logs
    await queryInterface.createTable('sma_classification_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      log_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      sma_classification: {
        type: Sequelize.ENUM('standard', 'sma_0_30', 'sma_30_60', 'sma_60_90', 'sma_90_plus'),
        allowNull: false,
      },
      classification_date: { type: Sequelize.DATEONLY, allowNull: false },
      classification_reason: { type: Sequelize.TEXT, allowNull: true },
      previous_classification: { type: Sequelize.STRING(50), allowNull: true },
      classification_trigger: {
        type: Sequelize.ENUM('overdue_payment', 'request_for_restructuring', 'movement_in_funds',
          'covenant_default', 'monitoring_trigger', 'red_flag'),
        allowNull: true,
      },
      classified_by_bank_officer: { type: Sequelize.INTEGER, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('sma_classification_logs', ['application_id']);
    await queryInterface.addIndex('sma_classification_logs', ['sma_classification']);

    // 3. bullet_maturity_trackers
    await queryInterface.createTable('bullet_maturity_trackers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tracker_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      bullet_maturity_date: { type: Sequelize.DATEONLY, allowNull: false },
      bullet_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      days_until_maturity: { type: Sequelize.INTEGER, allowNull: true },
      collection_probability_percent: { type: Sequelize.INTEGER, allowNull: true },
      contingency_plan_in_place: { type: Sequelize.BOOLEAN, defaultValue: false },
      contingency_plan_text: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('bullet_maturity_trackers', ['application_id']);
    await queryInterface.addIndex('bullet_maturity_trackers', ['bullet_maturity_date']);

    // 4. repayment_behavior_indexes
    await queryInterface.createTable('repayment_behavior_indexes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      index_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      on_time_payment_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      early_payment_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      late_payment_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      payment_default_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      average_days_late: { type: Sequelize.INTEGER, allowNull: true },
      payment_consistency_score: { type: Sequelize.INTEGER, allowNull: true },
      index_date: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('repayment_behavior_indexes', ['farmer_id']);

    // 5. vendor_registries
    await queryInterface.createTable('vendor_registries', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      registry_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      vendor_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      vendor_credit_score: { type: Sequelize.INTEGER, allowNull: true },
      vendor_credit_behavior_score: { type: Sequelize.INTEGER, allowNull: true },
      vendor_default_history_count: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      vendor_repayment_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      is_high_risk: { type: Sequelize.BOOLEAN, defaultValue: false },
      registry_date: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('vendor_registries', ['vendor_id']);
    await queryInterface.addIndex('vendor_registries', ['is_high_risk']);

    // 6. expense_classifications
    await queryInterface.createTable('expense_classifications', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      classification_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      expense_category: { type: Sequelize.STRING(100), allowNull: false },
      budgeted_expense: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      actual_expense: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      variance_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      overrun_flag: { type: Sequelize.BOOLEAN, defaultValue: false },
      classification_notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('expense_classifications', ['application_id']);

    // 7. end_use_score_logs
    await queryInterface.createTable('end_use_score_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      log_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      end_use_category: { type: Sequelize.STRING(100), allowNull: true },
      intended_use_description: { type: Sequelize.TEXT, allowNull: true },
      actual_end_use_description: { type: Sequelize.TEXT, allowNull: true },
      use_match_percentage: { type: Sequelize.INTEGER, allowNull: true },
      diversion_detected: { type: Sequelize.BOOLEAN, defaultValue: false },
      diversion_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      diversion_reason: { type: Sequelize.TEXT, allowNull: true },
      scoring_date: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('end_use_score_logs', ['application_id']);

    // 8. diversion_risk_assessments
    await queryInterface.createTable('diversion_risk_assessments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      assessment_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      diversion_risk_level: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'), allowNull: false,
      },
      diversion_indicators: { type: Sequelize.JSON, allowNull: true },
      risk_score: { type: Sequelize.INTEGER, allowNull: true },
      recommended_action: { type: Sequelize.STRING(200), allowNull: true },
      assessment_date: { type: Sequelize.DATEONLY, allowNull: true },
      assessed_by_bank_officer: { type: Sequelize.INTEGER, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('diversion_risk_assessments', ['application_id']);
    await queryInterface.addIndex('diversion_risk_assessments', ['diversion_risk_level']);

    // 9. red_flag_events
    await queryInterface.createTable('red_flag_events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      event_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      flag_type: {
        type: Sequelize.ENUM('unusual_withdrawal', 'vendor_default', 'missed_payment',
          'location_change', 'contact_lost', 'legal_notice', 'insurance_claim'),
        allowNull: false,
      },
      flag_severity: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'), allowNull: false,
      },
      event_description: { type: Sequelize.TEXT, allowNull: true },
      event_date: { type: Sequelize.DATEONLY, allowNull: true },
      event_timestamp: { type: Sequelize.DATE, allowNull: true },
      flagged_by: { type: Sequelize.INTEGER, allowNull: true },
      action_taken: { type: Sequelize.TEXT, allowNull: true },
      action_taken_date: { type: Sequelize.DATEONLY, allowNull: true },
      is_resolved: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('red_flag_events', ['application_id']);
    await queryInterface.addIndex('red_flag_events', ['flag_type']);
    await queryInterface.addIndex('red_flag_events', ['flag_severity']);
    await queryInterface.addIndex('red_flag_events', ['is_resolved']);

    // 10. farmer_income_streams
    await queryInterface.createTable('farmer_income_streams', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      stream_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      stream_type: { type: Sequelize.STRING(50), allowNull: false },
      annual_income: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      income_source_description: { type: Sequelize.TEXT, allowNull: true },
      last_verified_date: { type: Sequelize.DATEONLY, allowNull: true },
      verified_by_agent: { type: Sequelize.INTEGER, allowNull: true },
      income_stability_rating: {
        type: Sequelize.ENUM('very_stable', 'stable', 'moderate', 'unstable'), allowNull: true,
      },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('farmer_income_streams', ['farmer_id']);

    // 11. cash_flow_projections
    await queryInterface.createTable('cash_flow_projections', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      projection_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      projection_month: { type: Sequelize.INTEGER, allowNull: false },
      projection_year: { type: Sequelize.INTEGER, allowNull: false },
      projected_income: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      projected_expenses: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      projected_emi_obligation: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      projected_surplus_deficit: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      cash_flow_health: {
        type: Sequelize.ENUM('strong', 'adequate', 'tight', 'critical'), allowNull: true,
      },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('cash_flow_projections', ['application_id']);
    await queryInterface.addIndex('cash_flow_projections', ['projection_month', 'projection_year']);

    // 12. rss_score_histories
    await queryInterface.createTable('rss_score_histories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      score_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      risk_severity_score: { type: Sequelize.INTEGER, allowNull: false },
      risk_categories: { type: Sequelize.JSON, allowNull: true },
      score_date: { type: Sequelize.DATEONLY, allowNull: false },
      score_trend: { type: Sequelize.STRING(50), allowNull: true },
      is_deteriorating: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('rss_score_histories', ['application_id']);
    await queryInterface.addIndex('rss_score_histories', ['score_date']);

    // 13. ews_signals
    await queryInterface.createTable('ews_signals', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      signal_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      signal_type: {
        type: Sequelize.ENUM('payment_irregularity', 'cash_flow_stress', 'vendor_risk',
          'collateral_depreciation', 'market_risk', 'weather_risk'),
        allowNull: false,
      },
      signal_strength: {
        type: Sequelize.ENUM('weak', 'moderate', 'strong'), allowNull: false,
      },
      signal_timestamp: { type: Sequelize.DATE, allowNull: true },
      signal_data: { type: Sequelize.JSON, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('ews_signals', ['application_id']);
    await queryInterface.addIndex('ews_signals', ['signal_type']);
    await queryInterface.addIndex('ews_signals', ['signal_strength']);

    // 14. ews_alerts
    await queryInterface.createTable('ews_alerts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      alert_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      signal_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'ews_signals', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      alert_priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'), allowNull: false,
      },
      alert_recipient_bank_officer: { type: Sequelize.INTEGER, allowNull: true },
      alert_generated_at: { type: Sequelize.DATE, allowNull: true },
      alert_acknowledged_at: { type: Sequelize.DATE, allowNull: true },
      alert_acknowledged_by: { type: Sequelize.INTEGER, allowNull: true },
      action_recommended: { type: Sequelize.TEXT, allowNull: true },
      action_taken: { type: Sequelize.TEXT, allowNull: true },
      action_status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed'),
        allowNull: false, defaultValue: 'pending',
      },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('ews_alerts', ['signal_id']);
    await queryInterface.addIndex('ews_alerts', ['alert_priority']);
    await queryInterface.addIndex('ews_alerts', ['action_status']);

    // 15. branch_action_queues
    await queryInterface.createTable('branch_action_queues', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      queue_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      action_type: {
        type: Sequelize.ENUM('verification_needed', 'settlement_discussion', 'recovery_initiation',
          'account_restructuring', 'account_closure', 'legal_action'),
        allowNull: false,
      },
      action_priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'), allowNull: false,
      },
      action_assigned_to: { type: Sequelize.INTEGER, allowNull: true },
      action_assigned_date: { type: Sequelize.DATE, allowNull: true },
      action_due_date: { type: Sequelize.DATEONLY, allowNull: true },
      action_completed_date: { type: Sequelize.DATEONLY, allowNull: true },
      action_status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'overdue'),
        allowNull: false, defaultValue: 'pending',
      },
      action_notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('branch_action_queues', ['application_id']);
    await queryInterface.addIndex('branch_action_queues', ['action_status']);
    await queryInterface.addIndex('branch_action_queues', ['action_priority']);

    // 16. action_suggestions
    await queryInterface.createTable('action_suggestions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      suggestion_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      suggestion_category: { type: Sequelize.STRING(100), allowNull: true },
      suggestion_text: { type: Sequelize.TEXT, allowNull: true },
      suggestion_priority: { type: Sequelize.INTEGER, allowNull: true },
      suggestion_generated_by_system: { type: Sequelize.BOOLEAN, defaultValue: true },
      suggestion_generated_date: { type: Sequelize.DATEONLY, allowNull: true },
      action_taken_based_on_suggestion: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('action_suggestions', ['application_id']);

    // 17. portfolio_snapshots
    await queryInterface.createTable('portfolio_snapshots', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      snapshot_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      bank_user_id: { type: Sequelize.INTEGER, allowNull: true },
      snapshot_date: { type: Sequelize.DATEONLY, allowNull: false },
      total_applications: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      total_loan_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      total_outstanding_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      portfolio_npa_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      portfolio_sma_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      portfolio_health_score: { type: Sequelize.INTEGER, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('portfolio_snapshots', ['bank_user_id', 'snapshot_date']);

    // 18. recovery_cases
    await queryInterface.createTable('recovery_cases', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      case_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      recovery_case_stage: {
        type: Sequelize.ENUM('early_recovery', 'intensive_recovery', 'legal_recovery', 'writeoff'),
        allowNull: false,
      },
      recovery_case_opened_date: { type: Sequelize.DATEONLY, allowNull: true },
      recovery_case_opened_by: { type: Sequelize.INTEGER, allowNull: true },
      last_recovery_attempt_date: { type: Sequelize.DATEONLY, allowNull: true },
      total_recovery_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      remaining_recovery_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      recovery_probability_percent: { type: Sequelize.INTEGER, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('recovery_cases', ['application_id']);
    await queryInterface.addIndex('recovery_cases', ['recovery_case_stage']);

    // 19. recovery_action_logs
    await queryInterface.createTable('recovery_action_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      log_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      recovery_case_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'recovery_cases', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      recovery_action_type: {
        type: Sequelize.ENUM('phone_call', 'field_visit', 'settlement_offer',
          'legal_notice', 'auction_notice', 'asset_seizure'),
        allowNull: false,
      },
      recovery_action_date: { type: Sequelize.DATEONLY, allowNull: true },
      recovery_action_by: { type: Sequelize.INTEGER, allowNull: true },
      recovery_action_notes: { type: Sequelize.TEXT, allowNull: true },
      recovery_amount_pursued: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      recovery_amount_received: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('recovery_action_logs', ['recovery_case_id']);
    await queryInterface.addIndex('recovery_action_logs', ['recovery_action_type']);
  },

  async down(queryInterface) {
    const tables = [
      'recovery_action_logs', 'recovery_cases', 'portfolio_snapshots',
      'action_suggestions', 'branch_action_queues', 'ews_alerts', 'ews_signals',
      'rss_score_histories', 'cash_flow_projections', 'farmer_income_streams',
      'red_flag_events', 'diversion_risk_assessments', 'end_use_score_logs',
      'expense_classifications', 'vendor_registries', 'repayment_behavior_indexes',
      'bullet_maturity_trackers', 'sma_classification_logs', 'loan_health_snapshots',
    ];
    for (const table of tables) {
      await queryInterface.dropTable(table);
    }
  },
};
