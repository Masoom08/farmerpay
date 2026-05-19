'use strict';

/**
 * TRUST v2 — Add pillar_code to trust_sections and seed P1..P6 mapping.
 *
 * NOTE: Actual section_code is PERSONAL_PROFILE (not PERSONAL as in spec).
 * The mapping is:
 *   PERSONAL_PROFILE   → P1 (Identity & Household)
 *   FARM_DETAILS       → P2 (Farm Operations)
 *   FINANCIAL_LITERACY → P3 (Income)
 *   REPAYMENT_CAPACITY → P4 (Leverage)
 *   COLLATERAL         → P5 (Repayment)
 *   NETWORK_REFERENCES → P6 (Field Reality)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trust_sections', 'pillar_code', {
      type: Sequelize.ENUM('P1', 'P2', 'P3', 'P4', 'P5', 'P6'),
      allowNull: true,
      unique: true,
      comment: 'TRUST v2 pillar code (P1..P6)',
    });

    // Idempotent seed: UPDATE only rows where pillar_code IS NULL and section_code matches
    const mapping = [
      ['PERSONAL_PROFILE', 'P1'],
      ['FARM_DETAILS', 'P2'],
      ['FINANCIAL_LITERACY', 'P3'],
      ['REPAYMENT_CAPACITY', 'P4'],
      ['COLLATERAL', 'P5'],
      ['NETWORK_REFERENCES', 'P6'],
    ];

    for (const [sectionCode, pillarCode] of mapping) {
      const [results] = await queryInterface.sequelize.query(
        `SELECT id FROM trust_sections WHERE section_code = ? AND pillar_code IS NULL`,
        { replacements: [sectionCode] },
      );
      if (results.length > 0) {
        await queryInterface.sequelize.query(
          `UPDATE trust_sections SET pillar_code = ? WHERE section_code = ? AND pillar_code IS NULL`,
          { replacements: [pillarCode, sectionCode] },
        );
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('trust_sections', 'pillar_code');
  },
};
