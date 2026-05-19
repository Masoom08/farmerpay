'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const cols = await queryInterface.describeTable('farmer_profiles');
    if (!cols.alternate_phone) {
      await queryInterface.addColumn('farmer_profiles', 'alternate_phone', {
        type: Sequelize.STRING(13), allowNull: true, after: 'full_name',
      });
    }
    if (!cols.contact_stale) {
      await queryInterface.addColumn('farmer_profiles', 'contact_stale', {
        type: Sequelize.BOOLEAN, defaultValue: false, after: 'alternate_phone',
      });
    }
    if (!cols.contact_last_verified_at) {
      await queryInterface.addColumn('farmer_profiles', 'contact_last_verified_at', {
        type: Sequelize.DATE, allowNull: true, after: 'contact_stale',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('farmer_profiles', 'contact_last_verified_at');
    await queryInterface.removeColumn('farmer_profiles', 'contact_stale');
    await queryInterface.removeColumn('farmer_profiles', 'alternate_phone');
  },
};
