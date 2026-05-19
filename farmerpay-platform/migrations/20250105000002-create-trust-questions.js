'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trust_questions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      question_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      section_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'trust_sections',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      question_text: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      question_type: {
        type: Sequelize.ENUM('yes_no', 'numeric_input', 'multiple_choice', 'text_input'),
        allowNull: false,
      },
      required_answer_type: {
        type: Sequelize.ENUM('boolean', 'number', 'choice', 'text'),
        allowNull: false,
      },
      min_value: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      max_value: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      unit_of_measurement: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      conditional_logic: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      depends_on_question_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'trust_questions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    await queryInterface.addIndex('trust_questions', ['section_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('trust_questions');
  },
};
