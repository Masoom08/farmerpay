'use strict';

/**
 * SATHI Module Migration
 * Creates all 16 tables for the SATHI CRP/intermediary module.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. sathi_tasks
    await queryInterface.createTable('sathi_tasks', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      task_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      assigned_to_agent_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'field_agent_profiles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      assigned_by_admin_id: { type: Sequelize.INTEGER, allowNull: true },
      task_type: {
        type: Sequelize.ENUM(
          'farmer_kyc_verification', 'field_visit', 'loan_application_verification',
          'transaction_verification', 'document_collection', 'farmer_feedback',
          'soil_sample_collection'
        ),
        allowNull: false,
      },
      task_entity_type: { type: Sequelize.STRING(50), allowNull: true },
      task_entity_id: { type: Sequelize.INTEGER, allowNull: true },
      task_title: { type: Sequelize.STRING(200), allowNull: false },
      task_description: { type: Sequelize.TEXT, allowNull: true },
      task_priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium',
      },
      task_status: {
        type: Sequelize.ENUM('assigned', 'in_progress', 'completed', 'rejected', 'on_hold'),
        allowNull: false,
        defaultValue: 'assigned',
      },
      assigned_at: { type: Sequelize.DATE, allowNull: true },
      due_date: { type: Sequelize.DATEONLY, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sathi_tasks', ['assigned_to_agent_id', 'task_status']);
    await queryInterface.addIndex('sathi_tasks', ['task_type']);
    await queryInterface.addIndex('sathi_tasks', ['due_date']);

    // 2. sathi_task_executions
    await queryInterface.createTable('sathi_task_executions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      execution_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      task_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sathi_tasks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      start_timestamp: { type: Sequelize.DATE, allowNull: true },
      end_timestamp: { type: Sequelize.DATE, allowNull: true },
      execution_location_latitude: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      execution_location_longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      execution_location_accuracy_meters: { type: Sequelize.INTEGER, allowNull: true },
      execution_notes: { type: Sequelize.TEXT, allowNull: true },
      execution_status: {
        type: Sequelize.ENUM('in_progress', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'in_progress',
      },
      failure_reason: { type: Sequelize.TEXT, allowNull: true },
      completion_photo_count: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sathi_task_executions', ['task_id']);

    // 3. sathi_evidence_bundles
    await queryInterface.createTable('sathi_evidence_bundles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      bundle_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      task_execution_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sathi_task_executions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      bundle_type: {
        type: Sequelize.ENUM(
          'aadhaar_verification', 'address_verification', 'farm_field_verification',
          'transaction_evidence', 'soil_sample', 'weather_observation'
        ),
        allowNull: false,
      },
      bundle_submission_date: { type: Sequelize.DATEONLY, allowNull: true },
      bundle_verification_status: {
        type: Sequelize.ENUM('submitted', 'under_review', 'approved', 'rejected', 'needs_resubmission'),
        allowNull: false,
        defaultValue: 'submitted',
      },
      verified_by_admin_id: { type: Sequelize.INTEGER, allowNull: true },
      verification_notes: { type: Sequelize.TEXT, allowNull: true },
      verified_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sathi_evidence_bundles', ['task_execution_id']);
    await queryInterface.addIndex('sathi_evidence_bundles', ['bundle_verification_status']);

    // 4. sathi_evidence_items
    await queryInterface.createTable('sathi_evidence_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      bundle_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sathi_evidence_bundles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      evidence_item_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      evidence_type: {
        type: Sequelize.ENUM('document', 'photo', 'video', 'gps_location', 'signature', 'biometric'),
        allowNull: false,
      },
      document_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'documents_v2', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      media_asset_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'media_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      gps_latitude: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      gps_longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      signature_url: { type: Sequelize.STRING(255), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sathi_evidence_items', ['bundle_id']);

    // 5. sathi_farmer_consents
    await queryInterface.createTable('sathi_farmer_consents', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      consent_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      consent_type: {
        type: Sequelize.ENUM('data_sharing', 'location_tracking', 'photo_video', 'biometric_capture'),
        allowNull: false,
      },
      consent_given_at: { type: Sequelize.DATE, allowNull: true },
      consent_given_by_farmer: { type: Sequelize.INTEGER, allowNull: true },
      consent_verified_by_agent: { type: Sequelize.INTEGER, allowNull: true },
      consent_verified_at: { type: Sequelize.DATE, allowNull: true },
      consent_revoked_at: { type: Sequelize.DATE, allowNull: true },
      consent_revoke_reason: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sathi_farmer_consents', ['farmer_id', 'consent_type']);

    // 6. sathi_sync_queues
    await queryInterface.createTable('sathi_sync_queues', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      queue_item_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      sync_entity_type: { type: Sequelize.STRING(100), allowNull: false },
      sync_entity_id: { type: Sequelize.INTEGER, allowNull: true },
      sync_action: {
        type: Sequelize.ENUM('create', 'update', 'delete'),
        allowNull: false,
      },
      sync_data: { type: Sequelize.JSON, allowNull: true },
      sync_status: {
        type: Sequelize.ENUM('pending', 'synced', 'failed', 'retry'),
        allowNull: false,
        defaultValue: 'pending',
      },
      sync_attempted_at: { type: Sequelize.DATE, allowNull: true },
      sync_succeeded_at: { type: Sequelize.DATE, allowNull: true },
      sync_failure_reason: { type: Sequelize.TEXT, allowNull: true },
      retry_count: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sathi_sync_queues', ['sync_status']);
    await queryInterface.addIndex('sathi_sync_queues', ['sync_entity_type', 'sync_entity_id']);

    // 7. sathi_sync_conflicts
    await queryInterface.createTable('sathi_sync_conflicts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      conflict_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      queue_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sathi_sync_queues', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      conflict_type: { type: Sequelize.STRING(100), allowNull: false },
      server_value: { type: Sequelize.JSON, allowNull: true },
      client_value: { type: Sequelize.JSON, allowNull: true },
      resolution: { type: Sequelize.STRING(50), allowNull: true },
      resolved_by: { type: Sequelize.INTEGER, allowNull: true },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sathi_sync_conflicts', ['queue_item_id']);

    // 8. sathi_field_verifications
    await queryInterface.createTable('sathi_field_verifications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      verification_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      agent_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'field_agent_profiles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      verification_type: {
        type: Sequelize.ENUM('address', 'farm_boundary', 'field_size', 'crop_variety', 'ownership_status'),
        allowNull: false,
      },
      verification_date: { type: Sequelize.DATEONLY, allowNull: true },
      verified_latitude: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      verified_longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      verification_status: {
        type: Sequelize.ENUM('verified', 'needs_clarification', 'rejected'),
        allowNull: false,
        defaultValue: 'verified',
      },
      verification_comment: { type: Sequelize.TEXT, allowNull: true },
      photo_count: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sathi_field_verifications', ['farmer_id']);
    await queryInterface.addIndex('sathi_field_verifications', ['agent_id']);

    // 9. sathi_field_visit_checklists
    await queryInterface.createTable('sathi_field_visit_checklists', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      visit_id: { type: Sequelize.INTEGER, allowNull: true },
      verification_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      checklist_item_text: { type: Sequelize.STRING(255), allowNull: false },
      is_checked: { type: Sequelize.BOOLEAN, defaultValue: false },
      checked_at: { type: Sequelize.DATE, allowNull: true },
      is_required: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sathi_field_visit_checklists', ['verification_uuid']);

    // 10. choice_intermediaries
    await queryInterface.createTable('choice_intermediaries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      choice_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      intermediary_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      intermediary_name: { type: Sequelize.STRING(150), allowNull: false },
      intermediary_code: { type: Sequelize.STRING(50), allowNull: true },
      intermediary_phone: { type: Sequelize.STRING(13), allowNull: true },
      intermediary_address: { type: Sequelize.STRING(255), allowNull: true },
      intermediary_type: {
        type: Sequelize.ENUM('crp', 'field_agent', 'village_facilitator', 'cooperative_representative'),
        allowNull: false,
      },
      lgd_state_id: { type: Sequelize.INTEGER, allowNull: true },
      lgd_district_id: { type: Sequelize.INTEGER, allowNull: true },
      lgd_block_id: { type: Sequelize.INTEGER, allowNull: true },
      area_of_operation: { type: Sequelize.STRING(100), allowNull: true },
      farmers_managed: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      performance_rating: { type: Sequelize.DECIMAL(3, 1), allowNull: true },
      total_tasks_completed: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('choice_intermediaries', ['intermediary_user_id']);
    await queryInterface.addIndex('choice_intermediaries', ['intermediary_type']);

    // 11. choice_assignments
    await queryInterface.createTable('choice_assignments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      assignment_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      choice_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      assigned_at: { type: Sequelize.DATE, allowNull: true },
      assigned_by: { type: Sequelize.INTEGER, allowNull: true },
      assignment_status: {
        type: Sequelize.ENUM('active', 'completed', 'transferred', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      assignment_notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('choice_assignments', ['choice_id']);
    await queryInterface.addIndex('choice_assignments', ['farmer_id']);

    // 12. choice_interaction_logs
    await queryInterface.createTable('choice_interaction_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      interaction_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      choice_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      interaction_type: {
        type: Sequelize.ENUM('phone_call', 'sms', 'in_person_visit', 'whatsapp', 'video_call'),
        allowNull: false,
      },
      interaction_date: { type: Sequelize.DATE, allowNull: true },
      interaction_duration_minutes: { type: Sequelize.INTEGER, allowNull: true },
      interaction_purpose: { type: Sequelize.STRING(100), allowNull: true },
      outcome: { type: Sequelize.TEXT, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('choice_interaction_logs', ['choice_id']);
    await queryInterface.addIndex('choice_interaction_logs', ['farmer_id']);

    // 13. choice_ratings
    await queryInterface.createTable('choice_ratings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      rating_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      choice_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      rating_score: { type: Sequelize.INTEGER, allowNull: false },
      rating_feedback: { type: Sequelize.TEXT, allowNull: true },
      rated_on: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('choice_ratings', ['choice_id']);
    await queryInterface.addIndex('choice_ratings', ['farmer_id']);

    // 14. choice_badges
    await queryInterface.createTable('choice_badges', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      badge_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      choice_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      badge_name: { type: Sequelize.STRING(100), allowNull: false },
      badge_description: { type: Sequelize.TEXT, allowNull: true },
      badge_criteria: { type: Sequelize.JSON, allowNull: true },
      badge_awarded_at: { type: Sequelize.DATE, allowNull: true },
      badge_awarded_by: { type: Sequelize.INTEGER, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('choice_badges', ['choice_id']);

    // 15. choice_performance_kpis
    await queryInterface.createTable('choice_performance_kpis', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      kpi_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      choice_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      kpi_month: { type: Sequelize.INTEGER, allowNull: false },
      kpi_year: { type: Sequelize.INTEGER, allowNull: false },
      tasks_assigned: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      tasks_completed: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      tasks_rejected: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      completion_rate_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      average_task_duration_hours: { type: Sequelize.INTEGER, allowNull: true },
      quality_rating: { type: Sequelize.DECIMAL(3, 1), allowNull: true },
      farmers_satisfaction_score: { type: Sequelize.DECIMAL(3, 1), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('choice_performance_kpis', ['choice_id']);
    await queryInterface.addIndex('choice_performance_kpis', ['kpi_month', 'kpi_year']);

    // 16. sathi_audit_logs
    await queryInterface.createTable('sathi_audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      audit_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      task_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'sathi_tasks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      execution_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'sathi_task_executions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action_type: { type: Sequelize.STRING(50), allowNull: false },
      action_by: { type: Sequelize.INTEGER, allowNull: true },
      action_at: { type: Sequelize.DATE, allowNull: true },
      action_details: { type: Sequelize.JSON, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sathi_audit_logs', ['task_id']);
    await queryInterface.addIndex('sathi_audit_logs', ['execution_id']);
    await queryInterface.addIndex('sathi_audit_logs', ['action_type']);
  },

  async down(queryInterface) {
    // Drop in reverse order of creation
    await queryInterface.dropTable('sathi_audit_logs');
    await queryInterface.dropTable('choice_performance_kpis');
    await queryInterface.dropTable('choice_badges');
    await queryInterface.dropTable('choice_ratings');
    await queryInterface.dropTable('choice_interaction_logs');
    await queryInterface.dropTable('choice_assignments');
    await queryInterface.dropTable('choice_intermediaries');
    await queryInterface.dropTable('sathi_field_visit_checklists');
    await queryInterface.dropTable('sathi_field_verifications');
    await queryInterface.dropTable('sathi_sync_conflicts');
    await queryInterface.dropTable('sathi_sync_queues');
    await queryInterface.dropTable('sathi_farmer_consents');
    await queryInterface.dropTable('sathi_evidence_items');
    await queryInterface.dropTable('sathi_evidence_bundles');
    await queryInterface.dropTable('sathi_task_executions');
    await queryInterface.dropTable('sathi_tasks');
  },
};
