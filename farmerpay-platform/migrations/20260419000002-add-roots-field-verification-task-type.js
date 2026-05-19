'use strict';
module.exports = {
  async up(queryInterface) {
    // Add 'roots_field_verification' to the sathi_tasks.task_type ENUM
    await queryInterface.sequelize.query(
      "ALTER TABLE sathi_tasks MODIFY COLUMN task_type ENUM('farmer_kyc_verification','field_visit','loan_application_verification','transaction_verification','document_collection','farmer_feedback','soil_sample_collection','roots_field_verification') NOT NULL"
    );
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE sathi_tasks MODIFY COLUMN task_type ENUM('farmer_kyc_verification','field_visit','loan_application_verification','transaction_verification','document_collection','farmer_feedback','soil_sample_collection') NOT NULL"
    );
  },
};
