'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // --- Indexes ---

    try {
      await queryInterface.addIndex('farm_registers', ['farmer_id'], {
        name: 'idx_farm_registers_farmer_id',
      });
    } catch (err) {
      console.warn('idx_farm_registers_farmer_id may already exist:', err.message);
    }

    try {
      await queryInterface.addIndex('cultivation_cycles', ['field_id'], {
        name: 'idx_cultivation_cycles_field_id',
      });
    } catch (err) {
      console.warn('idx_cultivation_cycles_field_id may already exist:', err.message);
    }

    try {
      await queryInterface.addIndex('cultivation_cycles', ['field_id', 'cycle_status'], {
        name: 'idx_cultivation_cycles_field_id_cycle_status',
      });
    } catch (err) {
      console.warn('idx_cultivation_cycles_field_id_cycle_status may already exist:', err.message);
    }

    try {
      await queryInterface.addIndex('documents_v2', ['owner_id'], {
        name: 'idx_documents_v2_owner_id',
      });
    } catch (err) {
      console.warn('idx_documents_v2_owner_id may already exist:', err.message);
    }

    try {
      await queryInterface.addIndex('documents_v2', ['document_type'], {
        name: 'idx_documents_v2_document_type',
      });
    } catch (err) {
      console.warn('idx_documents_v2_document_type may already exist:', err.message);
    }

    try {
      await queryInterface.addIndex('variety_masters', ['crop_id'], {
        name: 'idx_variety_masters_crop_id',
      });
    } catch (err) {
      console.warn('idx_variety_masters_crop_id may already exist:', err.message);
    }

    try {
      await queryInterface.addIndex('loan_applications', ['application_status'], {
        name: 'idx_loan_applications_application_status',
      });
    } catch (err) {
      console.warn('idx_loan_applications_application_status may already exist:', err.message);
    }

    try {
      await queryInterface.addIndex('loan_applications', ['created_at'], {
        name: 'idx_loan_applications_created_at',
      });
    } catch (err) {
      console.warn('idx_loan_applications_created_at may already exist:', err.message);
    }

    // --- Foreign Keys ---

    try {
      await queryInterface.addConstraint('variety_masters', {
        fields: ['crop_id'],
        type: 'foreign key',
        name: 'fk_variety_masters_crop_id',
        references: { table: 'crop_masters', field: 'crop_id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    } catch (err) {
      console.warn('fk_variety_masters_crop_id may already exist:', err.message);
    }

    try {
      await queryInterface.addConstraint('documents_v2', {
        fields: ['owner_id'],
        type: 'foreign key',
        name: 'fk_documents_v2_owner_id',
        references: { table: 'users', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    } catch (err) {
      console.warn('fk_documents_v2_owner_id may already exist:', err.message);
    }
  },

  async down(queryInterface) {
    // --- Remove Foreign Keys (reverse order) ---

    try {
      await queryInterface.removeConstraint('documents_v2', 'fk_documents_v2_owner_id');
    } catch (err) {
      console.warn('fk_documents_v2_owner_id may not exist:', err.message);
    }

    try {
      await queryInterface.removeConstraint('variety_masters', 'fk_variety_masters_crop_id');
    } catch (err) {
      console.warn('fk_variety_masters_crop_id may not exist:', err.message);
    }

    // --- Remove Indexes (reverse order) ---

    try {
      await queryInterface.removeIndex('loan_applications', 'idx_loan_applications_created_at');
    } catch (err) {
      console.warn('idx_loan_applications_created_at may not exist:', err.message);
    }

    try {
      await queryInterface.removeIndex('loan_applications', 'idx_loan_applications_application_status');
    } catch (err) {
      console.warn('idx_loan_applications_application_status may not exist:', err.message);
    }

    try {
      await queryInterface.removeIndex('variety_masters', 'idx_variety_masters_crop_id');
    } catch (err) {
      console.warn('idx_variety_masters_crop_id may not exist:', err.message);
    }

    try {
      await queryInterface.removeIndex('documents_v2', 'idx_documents_v2_document_type');
    } catch (err) {
      console.warn('idx_documents_v2_document_type may not exist:', err.message);
    }

    try {
      await queryInterface.removeIndex('documents_v2', 'idx_documents_v2_owner_id');
    } catch (err) {
      console.warn('idx_documents_v2_owner_id may not exist:', err.message);
    }

    try {
      await queryInterface.removeIndex('cultivation_cycles', 'idx_cultivation_cycles_field_id_cycle_status');
    } catch (err) {
      console.warn('idx_cultivation_cycles_field_id_cycle_status may not exist:', err.message);
    }

    try {
      await queryInterface.removeIndex('cultivation_cycles', 'idx_cultivation_cycles_field_id');
    } catch (err) {
      console.warn('idx_cultivation_cycles_field_id may not exist:', err.message);
    }

    try {
      await queryInterface.removeIndex('farm_registers', 'idx_farm_registers_farmer_id');
    } catch (err) {
      console.warn('idx_farm_registers_farmer_id may not exist:', err.message);
    }
  },
};
