/**
 * Account Aggregator Configuration
 * Supports Setu (OneMoney), Finvu, CAMS, NSDL AA providers.
 * FarmerPay acts as FIU (Financial Information User).
 */

const config = require('../../../config');

const aaConfig = {
  // Active AA provider — switch between providers without code changes
  activeProvider: process.env.AA_ACTIVE_PROVIDER || 'setu',

  // Feature flags
  enabled: process.env.AA_ENABLED === 'true',
  recurringConsentEnabled: process.env.AA_RECURRING_CONSENT === 'true',
  autoRefreshEnabled: process.env.AA_AUTO_REFRESH === 'true',
  refreshIntervalDays: parseInt(process.env.AA_REFRESH_INTERVAL_DAYS, 10) || 30,

  // FIU identity (FarmerPay as Financial Information User)
  fiu: {
    id: process.env.AA_FIU_ID || 'farmerpay-fiu',
    name: process.env.AA_FIU_NAME || 'FarmerPay Platform',
    entityHandle: process.env.AA_FIU_ENTITY_HANDLE || 'farmerpay@fiu',
  },

  // Setu AA (powers OneMoney) — recommended primary provider
  setu: {
    baseUrl: process.env.AA_SETU_BASE_URL || 'https://fiu-uat.setu.co',
    clientId: process.env.AA_SETU_CLIENT_ID || null,
    clientSecret: process.env.AA_SETU_CLIENT_SECRET || null,
    productInstanceId: process.env.AA_SETU_PRODUCT_INSTANCE_ID || null,
    redirectUrl: process.env.AA_SETU_REDIRECT_URL || `${config.appUrl}/api/v1/aa/callback/setu`,
    webhookUrl: process.env.AA_SETU_WEBHOOK_URL || `${config.appUrl}/api/v1/aa/webhook/setu`,
    // Setu-specific: consent template for farmer bank statement fetch
    consentTemplate: {
      purpose: {
        code: '101',  // Wealth management / Financial reporting
        refUri: 'https://api.rebit.org.in/aa/purpose/101.xml',
        text: 'Agricultural credit assessment and loan servicing',
        category: { type: 'string' },
      },
      fiTypes: ['DEPOSIT', 'RECURRING_DEPOSIT', 'TERM_DEPOSIT'],
      consentTypes: ['PROFILE', 'SUMMARY', 'TRANSACTIONS'],
      fetchType: 'PERIODIC',
      frequency: { unit: 'MONTH', value: 1 },
      dataLife: { unit: 'MONTH', value: 12 },
      consentExpiry: { unit: 'MONTH', value: 24 },
    },
  },

  // Finvu AA — backup provider
  finvu: {
    baseUrl: process.env.AA_FINVU_BASE_URL || 'https://fiu.finvu.in/ConnectHub/FIU',
    apiKey: process.env.AA_FINVU_API_KEY || null,
    apiSecret: process.env.AA_FINVU_API_SECRET || null,
    redirectUrl: process.env.AA_FINVU_REDIRECT_URL || `${config.appUrl}/api/v1/aa/callback/finvu`,
    webhookUrl: process.env.AA_FINVU_WEBHOOK_URL || `${config.appUrl}/api/v1/aa/webhook/finvu`,
  },

  // Financial Information types to request
  fiTypes: {
    deposit: 'DEPOSIT',
    recurringDeposit: 'RECURRING_DEPOSIT',
    termDeposit: 'TERM_DEPOSIT',
    mutualFund: 'MUTUAL_FUNDS',
    insurance: 'INSURANCE_POLICIES',
  },

  // Data fetch window (how far back to pull bank statements)
  dataWindow: {
    defaultMonths: parseInt(process.env.AA_DATA_WINDOW_MONTHS, 10) || 12,
    maxMonths: 24,
    minMonths: 6,
  },

  // Cache settings
  cache: {
    consentTTL: 86400,       // 24h — consent status
    summaryTTL: 43200,       // 12h — bank statement summary
    transactionTTL: 3600,    // 1h  — raw transaction data
  },

  // Retry settings
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    timeoutMs: 30000,
  },
};

module.exports = aaConfig;
