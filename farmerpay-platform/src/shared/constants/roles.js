/**
 * User Roles
 * Defines all roles used across the FarmerPay platform.
 */

const ROLES = {
  // Core farmer roles
  FARMER: 'farmer',
  FPO_ADMIN: 'fpo_admin',
  FPO_MEMBER: 'fpo_member',

  // Trust layer
  TRUST_ADMIN: 'trust_admin',
  TRUST_OFFICER: 'trust_officer',

  // DICE (Data, Intelligence, Compliance, Economics)
  DICE_ADMIN: 'dice_admin',
  DICE_ANALYST: 'dice_analyst',

  // Roots (vertical heads)
  CROP_MANAGER: 'crop_manager',
  DAIRY_MANAGER: 'dairy_manager',
  FISHERY_MANAGER: 'fishery_manager',

  // Support modules
  SAGE_ADVISOR: 'sage_advisor',         // AI advisory
  PULSE_OPERATOR: 'pulse_operator',     // Market intelligence
  SENTINEL_OFFICER: 'sentinel_officer', // Risk & compliance
  SATHI_AGENT: 'sathi_agent',           // Field agent
  VYAPAR_MANAGER: 'vyapar_manager',     // Commerce manager

  // System
  SYSTEM_ADMIN: 'system_admin',
  SUPER_ADMIN: 'super_admin',
};

/**
 * Group roles by access level for convenience in authorization checks.
 */
const ROLE_GROUPS = {
  ADMIN_ROLES: [ROLES.SYSTEM_ADMIN, ROLES.SUPER_ADMIN],
  TRUST_ROLES: [ROLES.TRUST_ADMIN, ROLES.TRUST_OFFICER],
  DICE_ROLES: [ROLES.DICE_ADMIN, ROLES.DICE_ANALYST],
  FPO_ROLES: [ROLES.FPO_ADMIN, ROLES.FPO_MEMBER],
  ROOTS_ROLES: [ROLES.CROP_MANAGER, ROLES.DAIRY_MANAGER, ROLES.FISHERY_MANAGER],
};

module.exports = { ROLES, ROLE_GROUPS };
