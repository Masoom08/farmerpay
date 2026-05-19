'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('farmer_addresses', 'house_number', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn('farmer_addresses', 'ward_number', { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn('farmer_addresses', 'landmark', { type: Sequelize.STRING(150), allowNull: true });
    await queryInterface.addColumn('farmer_addresses', 'lgd_panchayat_id', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('farmer_addresses', 'version_number', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 });
    await queryInterface.addColumn('farmer_addresses', 'address_confidence', { type: Sequelize.DECIMAL(5, 2), allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('farmer_addresses', 'house_number');
    await queryInterface.removeColumn('farmer_addresses', 'ward_number');
    await queryInterface.removeColumn('farmer_addresses', 'landmark');
    await queryInterface.removeColumn('farmer_addresses', 'lgd_panchayat_id');
    await queryInterface.removeColumn('farmer_addresses', 'version_number');
    await queryInterface.removeColumn('farmer_addresses', 'address_confidence');
  },
};
