'use strict';

/**
 * Add intermediary profile/availability/reputation columns that the
 * Sequelize model declares but no prior migration created. Without these,
 * every Intermediary.findOne() fails with "Unknown column 'village_id'".
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('intermediaries', 'village_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('intermediaries', 'block_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('intermediaries', 'profile_photo_url', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn('intermediaries', 'bio', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('intermediaries', 'years_of_experience', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('intermediaries', 'languages_spoken', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn('intermediaries', 'service_radius_km', {
      type: Sequelize.INTEGER,
      defaultValue: 10,
    });
    await queryInterface.addColumn('intermediaries', 'is_available', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    });
    await queryInterface.addColumn('intermediaries', 'rating', {
      type: Sequelize.DECIMAL(3, 2),
      defaultValue: 0.00,
    });
    await queryInterface.addColumn('intermediaries', 'total_farmers_served', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });

    await queryInterface.addIndex('intermediaries', ['village_id'], {
      name: 'idx_intermediaries_village_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('intermediaries', 'idx_intermediaries_village_id');
    await queryInterface.removeColumn('intermediaries', 'total_farmers_served');
    await queryInterface.removeColumn('intermediaries', 'rating');
    await queryInterface.removeColumn('intermediaries', 'is_available');
    await queryInterface.removeColumn('intermediaries', 'service_radius_km');
    await queryInterface.removeColumn('intermediaries', 'languages_spoken');
    await queryInterface.removeColumn('intermediaries', 'years_of_experience');
    await queryInterface.removeColumn('intermediaries', 'bio');
    await queryInterface.removeColumn('intermediaries', 'profile_photo_url');
    await queryInterface.removeColumn('intermediaries', 'block_id');
    await queryInterface.removeColumn('intermediaries', 'village_id');
  },
};
