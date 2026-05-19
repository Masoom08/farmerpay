'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('soil_type_translations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      soil_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'soil_types',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      language_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      soil_type_name_translated: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
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

    await queryInterface.addConstraint('soil_type_translations', {
      fields: ['soil_type_id', 'language_code'],
      type: 'unique',
      name: 'uq_soil_type_translations_soil_type_id_language_code',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('soil_type_translations');
  },
};
