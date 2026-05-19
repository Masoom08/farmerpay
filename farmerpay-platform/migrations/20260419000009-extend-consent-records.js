'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('consent_records', 'application_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'loan_applications', key: 'id' },
    });
    await queryInterface.addColumn('consent_records', 'consent_text', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('consent_records', 'consent_channel', {
      type: Sequelize.STRING(30),
      allowNull: true,
    });
    await queryInterface.addColumn('consent_records', 'consent_expiry_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addIndex('consent_records', ['application_id'], {
      name: 'idx_consent_records_application_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('consent_records', 'idx_consent_records_application_id');
    await queryInterface.removeColumn('consent_records', 'consent_expiry_at');
    await queryInterface.removeColumn('consent_records', 'consent_channel');
    await queryInterface.removeColumn('consent_records', 'consent_text');
    await queryInterface.removeColumn('consent_records', 'application_id');
  },
};
