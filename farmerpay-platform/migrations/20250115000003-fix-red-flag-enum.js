'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('red_flag_events', 'flag_type', {
      type: Sequelize.ENUM(
        'unusual_withdrawal', 'vendor_default', 'missed_payment',
        'location_change', 'contact_lost', 'legal_notice', 'insurance_claim',
        'zero_agri_activity'
      ),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('red_flag_events', 'flag_type', {
      type: Sequelize.ENUM(
        'unusual_withdrawal', 'vendor_default', 'missed_payment',
        'location_change', 'contact_lost', 'legal_notice', 'insurance_claim'
      ),
      allowNull: false,
    });
  },
};
