'use strict';

/**
 * Add 'VEG' to the activity_code ENUM on the four tables that use it.
 *
 * Vegetables is a separate PoP track from HORTI (perennial orchards) —
 * short-cycle annuals (tomato, brinjal, okra, chilli, cucurbits, cole
 * crops) that follow a nursery → transplant → fruit → harvest cycle.
 * The farmer app surfaces VEG as a sub-tab inside the Horticulture
 * section, but the data model treats it as its own activity code so
 * stages / touchpoints / progress rows don't collide with orchard data.
 *
 * MySQL ENUM additions are in-place for enum-value appends (no table
 * rewrite) and safe to re-run: the down migration strips VEG back out.
 * Tables touched:
 *   • activity_pop_stages
 *   • activity_pop_touchpoints
 *   • farmer_activity_subscriptions
 *   • farmer_pop_touchpoint_progress
 */

const ENUM_WITHOUT_VEG =
  "ENUM('CROP','DAIRY','FISHERY','HORTI','POULTRY','GOATERY','LABOUR_WAGE','SHOP_BUSINESS','REMITTANCE','OTHER')";
const ENUM_WITH_VEG =
  "ENUM('CROP','DAIRY','FISHERY','HORTI','VEG','POULTRY','GOATERY','LABOUR_WAGE','SHOP_BUSINESS','REMITTANCE','OTHER')";

const TABLES = [
  'activity_pop_stages',
  'activity_pop_touchpoints',
  'farmer_activity_subscriptions',
  'farmer_pop_touchpoint_progress',
];

module.exports = {
  async up(queryInterface) {
    for (const table of TABLES) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${table}\` MODIFY COLUMN \`activity_code\` ${ENUM_WITH_VEG} NOT NULL`
      );
    }
  },

  async down(queryInterface) {
    // Guard: refuse to shrink the ENUM if any row currently uses VEG,
    // since MySQL would silently truncate those rows to empty string.
    for (const table of TABLES) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS n FROM \`${table}\` WHERE activity_code = 'VEG'`
      );
      if (rows[0].n > 0) {
        throw new Error(
          `Cannot down-migrate: ${table} has ${rows[0].n} row(s) with activity_code='VEG'. Delete or remap them first.`
        );
      }
    }
    for (const table of TABLES) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${table}\` MODIFY COLUMN \`activity_code\` ${ENUM_WITHOUT_VEG} NOT NULL`
      );
    }
  },
};
