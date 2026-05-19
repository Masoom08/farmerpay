/**
 * Scale Service
 * Phase 4 — Multi-bank platform, open APIs, account aggregator, OCEN,
 * CBS integration, state customization, regulatory reporting, benchmarks.
 */

const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

// ─── 1. Multi-Bank Config ──────────────────────────────────────

const getMultiBankConfig = async () => {
  return {
    banks: [
      {
        bankId: 'BNK-001',
        bankName: 'State Bank of India',
        bankCode: 'SBIN',
        logo: '/logos/sbi.png',
        primaryColor: '#1A5276',
        isActive: true,
        farmerCount: 184520,
        portfolioSize: 48500000000,
        npaRate: 4.2,
        modules: ['DICE', 'ROOTS', 'PULSE', 'SENTINEL'],
      },
      {
        bankId: 'BNK-002',
        bankName: 'Punjab National Bank',
        bankCode: 'PUNB',
        logo: '/logos/pnb.png',
        primaryColor: '#C0392B',
        isActive: true,
        farmerCount: 97340,
        portfolioSize: 22100000000,
        npaRate: 5.8,
        modules: ['DICE', 'ROOTS', 'PULSE'],
      },
      {
        bankId: 'BNK-003',
        bankName: 'Canara Bank',
        bankCode: 'CNRB',
        logo: '/logos/canara.png',
        primaryColor: '#F39C12',
        isActive: true,
        farmerCount: 62780,
        portfolioSize: 15800000000,
        npaRate: 3.9,
        modules: ['DICE', 'ROOTS', 'SENTINEL'],
      },
      {
        bankId: 'BNK-004',
        bankName: 'Karnataka Gramin Bank',
        bankCode: 'KGRB',
        logo: '/logos/kgb.png',
        primaryColor: '#27AE60',
        isActive: true,
        farmerCount: 41200,
        portfolioSize: 8900000000,
        npaRate: 6.1,
        modules: ['DICE', 'ROOTS'],
      },
      {
        bankId: 'BNK-005',
        bankName: 'Mysuru Cooperative Bank',
        bankCode: 'MYCB',
        logo: '/logos/mycb.png',
        primaryColor: '#8E44AD',
        isActive: false,
        farmerCount: 12450,
        portfolioSize: 3200000000,
        npaRate: 7.4,
        modules: ['DICE'],
      },
    ],
  };
};

// ─── 2. Open API Marketplace ───────────────────────────────────

const getOpenApiMarketplace = async () => {
  return {
    apis: [
      { apiId: 'API-001', apiName: 'Farmer KYC Verification', category: 'identity', version: 'v2.1', endpoint: '/api/v2/kyc/verify', method: 'POST', authType: 'OAuth2', rateLimit: 1000, pricing: 'free', subscribers: 34, status: 'published' },
      { apiId: 'API-002', apiName: 'Credit Score Fetch', category: 'lending', version: 'v1.3', endpoint: '/api/v1/credit/score', method: 'GET', authType: 'API_KEY', rateLimit: 500, pricing: '₹0.50/call', subscribers: 28, status: 'published' },
      { apiId: 'API-003', apiName: 'Crop Health Index', category: 'data', version: 'v1.0', endpoint: '/api/v1/agri/crop-health', method: 'GET', authType: 'OAuth2', rateLimit: 2000, pricing: 'free', subscribers: 56, status: 'published' },
      { apiId: 'API-004', apiName: 'Gold Price Feed', category: 'market', version: 'v2.0', endpoint: '/api/v2/market/gold-price', method: 'GET', authType: 'API_KEY', rateLimit: 5000, pricing: 'free', subscribers: 82, status: 'published' },
      { apiId: 'API-005', apiName: 'Mandi Price Lookup', category: 'market', version: 'v1.2', endpoint: '/api/v1/market/mandi-prices', method: 'GET', authType: 'API_KEY', rateLimit: 3000, pricing: 'free', subscribers: 71, status: 'published' },
      { apiId: 'API-006', apiName: 'PMFBY Enrollment', category: 'insurance', version: 'v1.1', endpoint: '/api/v1/insurance/pmfby', method: 'POST', authType: 'OAuth2', rateLimit: 500, pricing: '₹1.00/call', subscribers: 19, status: 'published' },
      { apiId: 'API-007', apiName: 'Weather Risk Score', category: 'data', version: 'v1.0', endpoint: '/api/v1/risk/weather', method: 'GET', authType: 'API_KEY', rateLimit: 2000, pricing: 'free', subscribers: 43, status: 'published' },
      { apiId: 'API-008', apiName: 'Loan Origination', category: 'lending', version: 'v2.0', endpoint: '/api/v2/lending/originate', method: 'POST', authType: 'OAuth2', rateLimit: 200, pricing: '₹5.00/call', subscribers: 12, status: 'published' },
      { apiId: 'API-009', apiName: 'Livestock Insurance', category: 'insurance', version: 'v0.9', endpoint: '/api/v1/insurance/livestock', method: 'POST', authType: 'OAuth2', rateLimit: 300, pricing: '₹2.00/call', subscribers: 8, status: 'beta' },
      { apiId: 'API-010', apiName: 'Land Record Fetch', category: 'data', version: 'v1.4', endpoint: '/api/v1/agri/land-records', method: 'GET', authType: 'OAuth2', rateLimit: 1000, pricing: '₹0.25/call', subscribers: 47, status: 'published' },
      { apiId: 'API-011', apiName: 'Yield Prediction', category: 'data', version: 'v1.0', endpoint: '/api/v1/ai/yield-predict', method: 'POST', authType: 'OAuth2', rateLimit: 500, pricing: '₹1.50/call', subscribers: 22, status: 'published' },
      { apiId: 'API-012', apiName: 'NPA Early Warning', category: 'lending', version: 'v1.1', endpoint: '/api/v1/risk/npa-warning', method: 'GET', authType: 'API_KEY', rateLimit: 1000, pricing: '₹0.75/call', subscribers: 31, status: 'published' },
      { apiId: 'API-013', apiName: 'eRupi Voucher Issue', category: 'lending', version: 'v0.8', endpoint: '/api/v1/payments/erupi', method: 'POST', authType: 'OAuth2', rateLimit: 200, pricing: '₹2.00/call', subscribers: 5, status: 'beta' },
      { apiId: 'API-014', apiName: 'Commodity Futures', category: 'market', version: 'v1.0', endpoint: '/api/v1/market/futures', method: 'GET', authType: 'API_KEY', rateLimit: 1500, pricing: '₹0.50/call', subscribers: 18, status: 'published' },
      { apiId: 'API-015', apiName: 'FPO Credit Rating', category: 'lending', version: 'v0.5', endpoint: '/api/v1/lending/fpo-rating', method: 'GET', authType: 'OAuth2', rateLimit: 200, pricing: '₹3.00/call', subscribers: 3, status: 'deprecated' },
    ],
  };
};

// ─── 3. Account Aggregator Status ──────────────────────────────

const getAccountAggregatorStatus = async (farmerId) => {
  return {
    connected: false,
    aaId: null,
    consentStatus: 'not_initiated',
    availableProviders: [
      { name: 'Setu AA', type: 'AA' },
      { name: 'Finvu', type: 'AA' },
      { name: 'OneMoney', type: 'AA' },
    ],
    fiTypes: ['DEPOSIT', 'RECURRING_DEPOSIT', 'TERM_DEPOSIT', 'MUTUAL_FUND', 'INSURANCE'],
    lastFetchDate: null,
  };
};

// ─── 4. OCEN Lending Network ───────────────────────────────────

const getOcenLendingNetwork = async () => {
  return {
    networkStatus: 'registered',
    lenderId: null,
    borrowerAgentId: 'FP-BA-001',
    products: [
      { productId: 'OCEN-001', productName: 'KCC Digital Loan', lenderName: 'SBI', minAmount: 25000, maxAmount: 300000, tenure: '12 months', interestRate: 7.0, type: 'KCC' },
      { productId: 'OCEN-002', productName: 'Agri Term Loan', lenderName: 'PNB', minAmount: 50000, maxAmount: 1000000, tenure: '36 months', interestRate: 9.5, type: 'term' },
      { productId: 'OCEN-003', productName: 'Gold Pledge Advance', lenderName: 'Canara Bank', minAmount: 10000, maxAmount: 500000, tenure: '6 months', interestRate: 7.5, type: 'gold' },
      { productId: 'OCEN-004', productName: 'Crop Input Finance', lenderName: 'Karnataka Gramin Bank', minAmount: 15000, maxAmount: 200000, tenure: '9 months', interestRate: 8.0, type: 'KCC' },
      { productId: 'OCEN-005', productName: 'Warehouse Receipt Loan', lenderName: 'SBI', minAmount: 100000, maxAmount: 2500000, tenure: '6 months', interestRate: 8.5, type: 'term' },
    ],
    totalDisbursed: 0,
    activeLoanCount: 0,
  };
};

// ─── 5. CBS Integration Status ─────────────────────────────────

const getCbsIntegrationStatus = async () => {
  return {
    integrations: [
      {
        cbsName: 'Finacle',
        vendor: 'Infosys',
        version: '11.2',
        status: 'active',
        pathways: [
          { name: 'CSV Batch Import', status: 'active', description: 'Nightly CSV extract upload for portfolio sync' },
          { name: 'REST API Gateway', status: 'active', description: 'Real-time account inquiry and transaction posting' },
          { name: 'ISO 20022 Messaging', status: 'active', description: 'Payment initiation and status via ISO 20022 messages' },
        ],
      },
      {
        cbsName: 'BaNCS',
        vendor: 'TCS',
        version: '24.1',
        status: 'planned',
        pathways: [
          { name: 'REST API Gateway', status: 'planned', description: 'Account and transaction API integration' },
          { name: 'File-based Exchange', status: 'planned', description: 'SFTP-based batch file exchange' },
        ],
      },
      {
        cbsName: 'Flexcube',
        vendor: 'Oracle',
        version: '14.7',
        status: 'planned',
        pathways: [
          { name: 'SOAP Web Services', status: 'planned', description: 'Core banking web services integration' },
          { name: 'Database Link', status: 'planned', description: 'Direct DB read replica for reporting' },
        ],
      },
      {
        cbsName: 'Infosys Finacle Cloud',
        vendor: 'Infosys',
        version: 'Cloud v1.0',
        status: 'planned',
        pathways: [
          { name: 'Cloud-native APIs', status: 'planned', description: 'Microservices-based API integration on cloud' },
          { name: 'Event Streaming', status: 'planned', description: 'Kafka-based real-time event streaming' },
        ],
      },
    ],
  };
};

// ─── 6. State Customization ────────────────────────────────────

const getStateCustomization = async () => {
  return {
    states: [
      {
        stateId: 'ST-KA',
        stateName: 'Karnataka',
        cropsFocused: ['Ragi', 'Jowar', 'Sugarcane', 'Arecanut', 'Coffee'],
        mandisConnected: 42,
        languageSupported: ['Kannada', 'English'],
        sofConfigured: true,
        customRules: ['Minimum 2 acres for KCC', 'Arecanut special LTV at 80%'],
        isActive: true,
      },
      {
        stateId: 'ST-MH',
        stateName: 'Maharashtra',
        cropsFocused: ['Cotton', 'Soybean', 'Sugarcane', 'Onion', 'Grapes'],
        mandisConnected: 67,
        languageSupported: ['Marathi', 'English'],
        sofConfigured: true,
        customRules: ['PMFBY mandatory for cotton', 'Onion storage finance enabled'],
        isActive: true,
      },
      {
        stateId: 'ST-MP',
        stateName: 'Madhya Pradesh',
        cropsFocused: ['Wheat', 'Soybean', 'Chickpea', 'Lentil', 'Garlic'],
        mandisConnected: 53,
        languageSupported: ['Hindi', 'English'],
        sofConfigured: true,
        customRules: ['Bhavantar Bhugtan Yojana integration', 'Soybean procurement support'],
        isActive: true,
      },
      {
        stateId: 'ST-UP',
        stateName: 'Uttar Pradesh',
        cropsFocused: ['Wheat', 'Rice', 'Sugarcane', 'Potato', 'Mustard'],
        mandisConnected: 89,
        languageSupported: ['Hindi', 'English'],
        sofConfigured: true,
        customRules: ['Sugarcane SAP integration', 'PM-KISAN verification link'],
        isActive: true,
      },
      {
        stateId: 'ST-RJ',
        stateName: 'Rajasthan',
        cropsFocused: ['Bajra', 'Mustard', 'Guar', 'Cumin', 'Isabgol'],
        mandisConnected: 38,
        languageSupported: ['Hindi', 'Rajasthani', 'English'],
        sofConfigured: false,
        customRules: ['Drought-prone area special coverage', 'Guar gum price linked interest'],
        isActive: false,
      },
    ],
  };
};

// ─── 7. Regulatory Reports ─────────────────────────────────────

const getRegulatoryReports = async () => {
  return {
    reports: [
      { reportId: 'REG-001', reportName: 'NPA Statement (Agri Portfolio)', frequency: 'monthly', regulator: 'RBI', format: 'excel', lastGenerated: '2026-03-31', nextDue: '2026-04-30', status: 'generated', downloadUrl: '/reports/npa-statement-mar2026.xlsx' },
      { reportId: 'REG-002', reportName: 'Priority Sector Lending Return', frequency: 'quarterly', regulator: 'RBI', format: 'xml', lastGenerated: '2026-03-31', nextDue: '2026-06-30', status: 'generated', downloadUrl: '/reports/psl-return-q4fy26.xml' },
      { reportId: 'REG-003', reportName: 'SMA Classification Report', frequency: 'monthly', regulator: 'RBI', format: 'excel', lastGenerated: '2026-03-31', nextDue: '2026-04-30', status: 'generated', downloadUrl: '/reports/sma-report-mar2026.xlsx' },
      { reportId: 'REG-004', reportName: 'Gold Loan Portfolio Summary', frequency: 'quarterly', regulator: 'RBI', format: 'pdf', lastGenerated: '2026-03-31', nextDue: '2026-06-30', status: 'generated', downloadUrl: '/reports/gold-loan-q4fy26.pdf' },
      { reportId: 'REG-005', reportName: 'PMFBY Claims Reconciliation', frequency: 'quarterly', regulator: 'IRDAI', format: 'excel', lastGenerated: '2025-12-31', nextDue: '2026-03-31', status: 'overdue', downloadUrl: null },
      { reportId: 'REG-006', reportName: 'Basel III Capital Adequacy (Agri)', frequency: 'annual', regulator: 'NABARD', format: 'pdf', lastGenerated: '2025-03-31', nextDue: '2026-03-31', status: 'pending', downloadUrl: null },
    ],
  };
};

// ─── 8. Benchmark Analytics ────────────────────────────────────

const getBenchmarkAnalytics = async () => {
  return {
    benchmarks: [
      // NPA Rate
      { metric: 'NPA Rate', bankName: 'SBI', value: 4.2, percentile: 72, industryAvg: 5.1, rank: 2 },
      { metric: 'NPA Rate', bankName: 'PNB', value: 5.8, percentile: 45, industryAvg: 5.1, rank: 4 },
      { metric: 'NPA Rate', bankName: 'Canara Bank', value: 3.9, percentile: 78, industryAvg: 5.1, rank: 1 },
      { metric: 'NPA Rate', bankName: 'Karnataka Gramin Bank', value: 6.1, percentile: 38, industryAvg: 5.1, rank: 5 },
      { metric: 'NPA Rate', bankName: 'Mysuru Cooperative Bank', value: 7.4, percentile: 22, industryAvg: 5.1, rank: 6 },

      // Avg Compliance Score
      { metric: 'Avg Compliance Score', bankName: 'SBI', value: 92, percentile: 88, industryAvg: 84, rank: 1 },
      { metric: 'Avg Compliance Score', bankName: 'PNB', value: 87, percentile: 70, industryAvg: 84, rank: 3 },
      { metric: 'Avg Compliance Score', bankName: 'Canara Bank', value: 89, percentile: 76, industryAvg: 84, rank: 2 },
      { metric: 'Avg Compliance Score', bankName: 'Karnataka Gramin Bank', value: 78, percentile: 42, industryAvg: 84, rank: 4 },
      { metric: 'Avg Compliance Score', bankName: 'Mysuru Cooperative Bank', value: 71, percentile: 28, industryAvg: 84, rank: 5 },

      // Loan Processing Time (days)
      { metric: 'Loan Processing Time', bankName: 'SBI', value: 3.2, percentile: 82, industryAvg: 5.4, rank: 1 },
      { metric: 'Loan Processing Time', bankName: 'PNB', value: 4.8, percentile: 60, industryAvg: 5.4, rank: 3 },
      { metric: 'Loan Processing Time', bankName: 'Canara Bank', value: 4.1, percentile: 71, industryAvg: 5.4, rank: 2 },
      { metric: 'Loan Processing Time', bankName: 'Karnataka Gramin Bank', value: 6.5, percentile: 35, industryAvg: 5.4, rank: 4 },
      { metric: 'Loan Processing Time', bankName: 'Mysuru Cooperative Bank', value: 8.2, percentile: 18, industryAvg: 5.4, rank: 5 },

      // Farmer Satisfaction (out of 5)
      { metric: 'Farmer Satisfaction', bankName: 'SBI', value: 4.1, percentile: 75, industryAvg: 3.8, rank: 2 },
      { metric: 'Farmer Satisfaction', bankName: 'PNB', value: 3.7, percentile: 52, industryAvg: 3.8, rank: 4 },
      { metric: 'Farmer Satisfaction', bankName: 'Canara Bank', value: 4.3, percentile: 85, industryAvg: 3.8, rank: 1 },
      { metric: 'Farmer Satisfaction', bankName: 'Karnataka Gramin Bank', value: 3.9, percentile: 60, industryAvg: 3.8, rank: 3 },
      { metric: 'Farmer Satisfaction', bankName: 'Mysuru Cooperative Bank', value: 3.4, percentile: 32, industryAvg: 3.8, rank: 5 },

      // Digital Adoption (%)
      { metric: 'Digital Adoption', bankName: 'SBI', value: 68, percentile: 80, industryAvg: 52, rank: 1 },
      { metric: 'Digital Adoption', bankName: 'PNB', value: 55, percentile: 58, industryAvg: 52, rank: 3 },
      { metric: 'Digital Adoption', bankName: 'Canara Bank', value: 61, percentile: 72, industryAvg: 52, rank: 2 },
      { metric: 'Digital Adoption', bankName: 'Karnataka Gramin Bank', value: 42, percentile: 35, industryAvg: 52, rank: 4 },
      { metric: 'Digital Adoption', bankName: 'Mysuru Cooperative Bank', value: 28, percentile: 15, industryAvg: 52, rank: 5 },

      // Repayment Rate (%)
      { metric: 'Repayment Rate', bankName: 'SBI', value: 91.3, percentile: 78, industryAvg: 87.5, rank: 2 },
      { metric: 'Repayment Rate', bankName: 'PNB', value: 86.1, percentile: 48, industryAvg: 87.5, rank: 4 },
      { metric: 'Repayment Rate', bankName: 'Canara Bank', value: 93.2, percentile: 85, industryAvg: 87.5, rank: 1 },
      { metric: 'Repayment Rate', bankName: 'Karnataka Gramin Bank', value: 84.7, percentile: 38, industryAvg: 87.5, rank: 5 },
      { metric: 'Repayment Rate', bankName: 'Mysuru Cooperative Bank', value: 88.9, percentile: 55, industryAvg: 87.5, rank: 3 },
    ],
  };
};

module.exports = {
  getMultiBankConfig,
  getOpenApiMarketplace,
  getAccountAggregatorStatus,
  getOcenLendingNetwork,
  getCbsIntegrationStatus,
  getStateCustomization,
  getRegulatoryReports,
  getBenchmarkAnalytics,
};
