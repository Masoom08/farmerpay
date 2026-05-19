'use strict';

/**
 * Migration: Create dairy_breeding_events.
 * Captures both AI (artificial insemination) and natural service (bull mating)
 * attempts per animal, with cost split into formal/informal and a chained
 * pregnancy outcome workflow.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dairy_breeding_events', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      event_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      animal_id: { type: Sequelize.STRING(36), allowNull: false },

      service_type: { type: Sequelize.ENUM('AI', 'NATURAL_SERVICE'), allowNull: false },
      ai_attempt_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      ai_date: { type: Sequelize.DATEONLY, allowNull: false },

      // AI-specific
      bull_code: { type: Sequelize.STRING(50), allowNull: true },
      breed_used: { type: Sequelize.STRING(50), allowNull: true },
      service_provider: { type: Sequelize.STRING(120), allowNull: true },
      service_provider_type: {
        type: Sequelize.ENUM('GOVT_VET', 'PRIVATE_VET', 'COOP_INSEMINATOR', 'SELF'),
        allowNull: true,
      },

      // Natural-service-specific
      bull_owner_name: { type: Sequelize.STRING(120), allowNull: true },
      bull_owner_type: {
        type: Sequelize.ENUM('OWN', 'PEER', 'VILLAGE_BULL', 'BULL_STATION'),
        allowNull: true,
      },
      service_charge: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      transport_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      gratuity_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

      // Aggregated cost split (mirrors cost_events)
      cost_formal: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      cost_informal: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      cost_total: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

      // Pregnancy / calving outcome
      pregnancy_check_date: { type: Sequelize.DATEONLY, allowNull: true },
      pregnancy_confirmed: {
        type: Sequelize.ENUM('YES', 'NO', 'PENDING'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      expected_calving_date: { type: Sequelize.DATEONLY, allowNull: true },
      actual_calving_date: { type: Sequelize.DATEONLY, allowNull: true },
      calving_outcome: {
        type: Sequelize.ENUM('LIVE', 'STILLBORN', 'ABORTION', 'NA'),
        allowNull: true,
      },
      calf_animal_id: { type: Sequelize.STRING(36), allowNull: true },

      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('dairy_breeding_events', ['farmer_id'], { name: 'idx_dbe_farmer' });
    await queryInterface.addIndex('dairy_breeding_events', ['animal_id', 'ai_date'], { name: 'idx_dbe_animal_date' });
    await queryInterface.addIndex('dairy_breeding_events', ['pregnancy_confirmed'], { name: 'idx_dbe_preg' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('dairy_breeding_events');
  },
};
