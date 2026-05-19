/**
 * AgriStack Loan & Scheme Service — STUB (P0-P1)
 *
 * #11 Post farmer loan details (i12:o17) → Write API: compliance + multi-bank visibility
 * #14 Farmer scheme eligibility (i18:o24) → PM-KISAN, PMFBY, KCC eligibility
 * #15 MSP/price support scheme (i9:o11) → MSP comparison in PULSE
 * #19 e-Procurement data (i7:o9) → Track govt procurement by farmer
 * #21 eKCC eligibility check (i4:o4v2) → Auto-check eKCC eligibility
 *
 * Target tables: loan_applications, farmer_scheme_enrollments, pulse_msps
 */

const logger = require('../../../shared/utils/logger');
const config = require('../config/agristackConfig');
const client = require('./agristackClient');

const postFarmerLoanDetails = async (loanData) => {
  if (!config.features.loanPostingEnabled) return null;
  return client.callApi('postFarmerLoan', loanData);
};

const getSchemeEligibility = async (farmerId) => {
  if (!config.features.schemeEligibilityEnabled) return null;
  return client.callApi('schemeEligibility', { farmer_id: farmerId });
};

const getMspData = async (commodityCode, stateId) => {
  if (!config.features.mspDataEnabled) return null;
  return client.callApi('mspPriceSupport', { commodity_code: commodityCode, state_id: stateId });
};

const getEProcurementData = async (farmerId) => {
  if (!config.features.mspDataEnabled) return null;
  return client.callApi('eProcurement', { farmer_id: farmerId });
};

const checkEKccEligibility = async (farmerId) => {
  if (!config.features.schemeEligibilityEnabled) return null;
  return client.callApi('eKccEligibility', { farmer_id: farmerId });
};

module.exports = {
  postFarmerLoanDetails, getSchemeEligibility, getMspData,
  getEProcurementData, checkEKccEligibility,
};
