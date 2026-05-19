'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lgd_state_translations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      lgd_state_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lgd_states',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      language_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      state_name_translated: {
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

    await queryInterface.addIndex('lgd_state_translations', ['lgd_state_id', 'language_code'], {
      unique: true,
      name: 'lgd_state_translations_state_id_language_code_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('lgd_state_translations');
  },
};
