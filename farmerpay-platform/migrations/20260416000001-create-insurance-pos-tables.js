'use strict';

/**
 * Insurance Phase 2 — Point-of-Sale tables.
 *
 *   pos_insurance_products   — catalog of offers we display to farmers
 *                              (PMFBY/RWBCIS/NLM/PMMSY + private insurers)
 *   pos_insurance_referrals  — log of farmer activity: viewed → quoted
 *                              → referred. Powers the banker funnel view.
 *
 * Does not touch the legacy insurance_enrollments table.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── pos_insurance_products ────────────────────────────────────
    await queryInterface.createTable('pos_insurance_products', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      product_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      product_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      category: {
        type: Sequelize.ENUM('crop', 'horticulture', 'livestock', 'fisheries', 'multi'),
        allowNull: false,
      },
      subsidy_type: {
        type: Sequelize.ENUM('government', 'non_subsidized'),
        allowNull: false,
      },
      sub_scheme: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'pmfby | rwbcis | nlm | pmmsy | private',
      },
      insurer_name: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      farmer_premium_rate: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        comment: 'percent, e.g. 2.00 for 2% Kharif',
      },
      subsidy_pct: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        comment: 'government share percent; null for non_subsidized',
      },
      coverage_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      eligibility_rules: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '{ minAreaHa, maxAreaHa, crops: [], states: [], bplOnly, ... }',
      },
      deep_link_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      portal_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      contact_phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      branch_hint: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
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
    await queryInterface.addIndex('pos_insurance_products', ['product_code'], {
      name: 'idx_pos_products_code',
      unique: true,
    });
    await queryInterface.addIndex('pos_insurance_products', ['subsidy_type', 'category'], {
      name: 'idx_pos_products_type_category',
    });

    // ─── pos_insurance_referrals ───────────────────────────────────
    await queryInterface.createTable('pos_insurance_referrals', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      referral_uuid: {
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
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'pos_insurance_products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      action: {
        type: Sequelize.ENUM('viewed', 'quoted', 'referred'),
        allowNull: false,
      },
      quoted_sum_insured: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      quoted_premium_farmer: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      quoted_premium_subsidy: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      quoted_area_hectares: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true,
      },
      quoted_crop: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      quoted_season: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      cycle_id: {
        type: Sequelize.STRING(36),
        allowNull: true,
      },
      converted: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        comment: 'set by banker after verifying with insurer',
      },
      conversion_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      referred_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
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
    await queryInterface.addIndex('pos_insurance_referrals', ['referral_uuid'], {
      name: 'idx_pos_referrals_uuid',
      unique: true,
    });
    await queryInterface.addIndex('pos_insurance_referrals', ['farmer_id'], {
      name: 'idx_pos_referrals_farmer',
    });
    await queryInterface.addIndex('pos_insurance_referrals', ['product_id'], {
      name: 'idx_pos_referrals_product',
    });
    await queryInterface.addIndex('pos_insurance_referrals', ['action'], {
      name: 'idx_pos_referrals_action',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pos_insurance_referrals');
    await queryInterface.dropTable('pos_insurance_products');
  },
};
