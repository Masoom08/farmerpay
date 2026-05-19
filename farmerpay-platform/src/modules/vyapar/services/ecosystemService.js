/**
 * Ecosystem Service — Phase 3 future/planned features.
 * Input Marketplace, Supply-Chain Finance, Warehouse Receipt Finance,
 * FPO Lending, Livestock Insurance, Weather Insurance, DigiLocker,
 * e-RUPI Vouchers, CRIF HighMark Score, Commodity Hedging Advisory.
 *
 * All data is mock/computed until upstream integrations go live.
 */
const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

// ─── Helpers ───────────────────────────────────────────────────────

const randomBetween = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const futureDate = (daysAhead) => {
  const d = new Date(); d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};
const pastDate = (daysAgo) => {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

// ─── 1. Input Marketplace ──────────────────────────────────────────

const MOCK_INPUTS = [
  { inputName: 'DAP Fertiliser 50kg', brand: 'IFFCO', type: 'dealer', category: 'fertiliser' },
  { inputName: 'Urea 45kg', brand: 'NFL', type: 'cooperative', category: 'fertiliser' },
  { inputName: 'MOP 50kg', brand: 'IPL', type: 'dealer', category: 'fertiliser' },
  { inputName: 'NPK 10-26-26 50kg', brand: 'Coromandel', type: 'fpo', category: 'fertiliser' },
  { inputName: 'SSP Fertiliser 50kg', brand: 'Paradeep', type: 'dealer', category: 'fertiliser' },
  { inputName: 'Zinc Sulphate 25kg', brand: 'Tata Rallis', type: 'cooperative', category: 'micronutrient' },
  { inputName: 'Paddy Seed IR-64 (5kg)', brand: 'NSC', type: 'fpo', category: 'seed' },
  { inputName: 'Wheat Seed HD-2967 (40kg)', brand: 'IARI', type: 'cooperative', category: 'seed' },
  { inputName: 'BT Cotton Seed (450g)', brand: 'Mahyco', type: 'dealer', category: 'seed' },
  { inputName: 'Soybean Seed JS-9560 (30kg)', brand: 'JNKVV', type: 'fpo', category: 'seed' },
  { inputName: 'Hybrid Maize Seed (4kg)', brand: 'Pioneer', type: 'dealer', category: 'seed' },
  { inputName: 'Chlorpyriphos 20% EC (1L)', brand: 'Dhanuka', type: 'dealer', category: 'pesticide' },
  { inputName: 'Imidacloprid 17.8% SL (250ml)', brand: 'Bayer', type: 'dealer', category: 'pesticide' },
  { inputName: 'Mancozeb 75% WP (1kg)', brand: 'UPL', type: 'cooperative', category: 'fungicide' },
  { inputName: 'Glyphosate 41% SL (1L)', brand: 'Excel Crop', type: 'dealer', category: 'herbicide' },
  { inputName: 'Neem Oil 1500ppm (1L)', brand: 'Multiplex', type: 'fpo', category: 'bio-pesticide' },
  { inputName: 'Humic Acid Granules 5kg', brand: 'Aries Agro', type: 'cooperative', category: 'soil-conditioner' },
  { inputName: 'Drip Irrigation Kit (1 acre)', brand: 'Jain Irrigation', type: 'dealer', category: 'equipment' },
  { inputName: 'Knapsack Sprayer 16L', brand: 'Aspee', type: 'fpo', category: 'equipment' },
  { inputName: 'Vermicompost 50kg', brand: 'Local FPO', type: 'fpo', category: 'organic' },
];

const SELLER_NAMES = [
  'Kishan Agri Centre', 'Narmada Fertilizers', 'Sahyadri FPO', 'Dhanraj Seeds & Pesticides',
  'Annapurna Cooperative', 'Greenfield Inputs', 'Bharat Krishi Bhandar', 'Sri Balaji Agro',
  'Vinayak Seed Corporation', 'Maa Laxmi Agri Store', 'Patel Farm Supplies', 'FPO Unnati',
  'Kisan Seva Kendra', 'Gram Vikas Cooperative', 'AgriMart Online',
];

const getInputMarketplace = async ({ cropId, districtId, search, page, limit }) => {
  const { offset: pgOffset, limit: pgLimit } = parsePagination({ page, limit });

  let items = MOCK_INPUTS.map((inp, idx) => ({
    sellerId: generateUUID(),
    sellerName: SELLER_NAMES[idx % SELLER_NAMES.length],
    type: inp.type,
    inputName: inp.inputName,
    brand: inp.brand,
    category: inp.category,
    packSize: inp.inputName.match(/\(([^)]+)\)/)?.[1] || inp.inputName.match(/\d+kg/)?.[0] || '1 unit',
    pricePerUnit: randomBetween(80, 3500),
    discountPercent: randomInt(0, 15),
    rating: randomBetween(3.2, 4.9),
    distanceKm: randomBetween(1, 45),
    deliveryAvailable: Math.random() > 0.3,
  }));

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(i =>
      i.inputName.toLowerCase().includes(q) ||
      i.brand.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  }

  const total = items.length;
  const paginated = items.slice(pgOffset, pgOffset + pgLimit);

  logger.info(`Ecosystem: marketplace query — district=${districtId}, crop=${cropId}, results=${total}`);
  return { inputs: paginated, meta: buildMeta({ page: page || 1, limit: pgLimit, total }) };
};

// ─── 2. Supply-Chain Finance ───────────────────────────────────────

const getSupplyChainFinance = async ({ farmerId }) => {
  const maxFinanceAmount = randomInt(50000, 500000);
  const currentUtilization = randomInt(0, maxFinanceAmount);

  const result = {
    farmerId,
    eligible: true,
    maxFinanceAmount,
    currentUtilization,
    availableCredit: maxFinanceAmount - currentUtilization,
    invoices: [
      { invoiceId: generateUUID(), buyerName: 'ITC Limited', amount: randomInt(15000, 80000), dueDate: futureDate(30), status: 'pending', financeRate: 9.5 },
      { invoiceId: generateUUID(), buyerName: 'Reliance Fresh', amount: randomInt(10000, 60000), dueDate: futureDate(45), status: 'financed', financeRate: 10.0 },
      { invoiceId: generateUUID(), buyerName: 'BigBasket', amount: randomInt(8000, 50000), dueDate: pastDate(5), status: 'settled', financeRate: 9.75 },
      { invoiceId: generateUUID(), buyerName: 'Mother Dairy', amount: randomInt(12000, 40000), dueDate: futureDate(60), status: 'pending', financeRate: 10.25 },
    ],
    aggregatorDetails: {
      name: 'Samunnati Financial',
      type: 'NBFC-MFI',
      location: 'Chennai, Tamil Nadu',
    },
  };

  logger.info(`Ecosystem: supply-chain finance queried for farmer=${farmerId}`);
  return result;
};

// ─── 3. Warehouse Receipt Finance ──────────────────────────────────

const COMMODITIES = ['Wheat', 'Rice', 'Soybean', 'Maize', 'Chana', 'Tur Dal', 'Mustard', 'Cotton'];
const GRADES = ['FAQ', 'A', 'B', 'Premium', 'Standard'];
const WAREHOUSE_NAMES = ['CWC Bhopal', 'WDRA Indore', 'NCML Nagpur', 'Origo Raipur', 'Arya Collateral Jaipur'];

const getWarehouseReceiptFinance = async ({ farmerId }) => {
  const receipts = Array.from({ length: randomInt(2, 5) }, () => {
    const quantity = randomInt(10, 200);
    const currentValue = quantity * randomInt(1800, 6500);
    const ltvCap = 0.7;
    return {
      receiptId: generateUUID(),
      warehouseName: pickRandom(WAREHOUSE_NAMES),
      commodity: pickRandom(COMMODITIES),
      quantity,
      unit: 'quintals',
      grade: pickRandom(GRADES),
      depositDate: pastDate(randomInt(10, 120)),
      currentValue,
      ltvCap,
      maxLoan: Math.round(currentValue * ltvCap),
      status: pickRandom(['stored', 'pledged', 'stored', 'stored', 'released']),
    };
  });

  const totalStoredValue = receipts.reduce((s, r) => s + r.currentValue, 0);
  const totalFinanceAvailable = receipts
    .filter(r => r.status === 'stored')
    .reduce((s, r) => s + r.maxLoan, 0);

  logger.info(`Ecosystem: warehouse receipt finance queried for farmer=${farmerId}`);
  return { farmerId, receipts, totalStoredValue, totalFinanceAvailable };
};

// ─── 4. FPO Lending Status ─────────────────────────────────────────

const FARMER_NAMES = [
  'Ramesh Patel', 'Sunita Devi', 'Mahesh Yadav', 'Kavitha Reddy', 'Ajay Singh',
  'Lakshmi Bai', 'Suresh Kumar', 'Priya Sharma', 'Dinesh Jat', 'Meena Kumari',
  'Rajendra Prasad', 'Anita Verma', 'Brijesh Tiwari', 'Geeta Devi', 'Omprakash Meena',
];

const getFpoLendingStatus = async ({ fpoId }) => {
  const totalMembers = randomInt(80, 500);
  const activeLoans = randomInt(20, totalMembers);
  const portfolioSize = activeLoans * randomInt(25000, 100000);

  const membersList = Array.from({ length: Math.min(activeLoans, 15) }, (_, i) => ({
    farmerId: generateUUID(),
    farmerName: FARMER_NAMES[i % FARMER_NAMES.length],
    loanAmount: randomInt(10000, 200000),
    disbursedDate: pastDate(randomInt(30, 300)),
    status: pickRandom(['active', 'active', 'active', 'overdue', 'closed']),
  }));

  const result = {
    fpoId,
    fpoName: pickRandom(['Sahyadri FPO', 'Narmada Kisan FPO', 'Vindhya Farmers Collective', 'Godavari Agri FPO']),
    totalMembers,
    activeLoans,
    portfolioSize,
    npaRate: randomBetween(1.5, 8.0),
    avgLoanSize: Math.round(portfolioSize / activeLoans),
    repaymentRate: randomBetween(85, 98),
    membersList,
  };

  logger.info(`Ecosystem: FPO lending status queried for fpo=${fpoId}`);
  return result;
};

// ─── 5. Livestock Insurance ────────────────────────────────────────

const ANIMALS = [
  { animalType: 'cow', breedName: 'Gir', sumInsuredRange: [40000, 80000] },
  { animalType: 'buffalo', breedName: 'Murrah', sumInsuredRange: [60000, 120000] },
  { animalType: 'cow', breedName: 'Sahiwal', sumInsuredRange: [35000, 70000] },
  { animalType: 'goat', breedName: 'Jamunapari', sumInsuredRange: [5000, 15000] },
  { animalType: 'poultry', breedName: 'BV-300 Layer', sumInsuredRange: [200, 500] },
  { animalType: 'buffalo', breedName: 'Nili-Ravi', sumInsuredRange: [55000, 100000] },
  { animalType: 'goat', breedName: 'Black Bengal', sumInsuredRange: [3000, 10000] },
];

const getLivestockInsurance = async ({ farmerId }) => {
  const count = randomInt(2, 5);
  const policies = Array.from({ length: count }, () => {
    const animal = pickRandom(ANIMALS);
    const sumInsured = randomInt(animal.sumInsuredRange[0], animal.sumInsuredRange[1]);
    const premiumRate = randomBetween(3.0, 5.0);
    return {
      policyId: generateUUID(),
      animalType: animal.animalType,
      breedName: animal.breedName,
      tagNumber: `TAG-${randomInt(100000, 999999)}`,
      sumInsured,
      premiumPaid: Math.round(sumInsured * premiumRate / 100),
      premiumRate,
      policyStartDate: pastDate(randomInt(30, 300)),
      policyEndDate: futureDate(randomInt(30, 335)),
      policyStatus: pickRandom(['active', 'active', 'active', 'expired', 'claim_pending']),
      claimHistory: [],
    };
  });

  const totalCoverage = policies.reduce((s, p) => s + p.sumInsured, 0);
  const totalPremium = policies.reduce((s, p) => s + p.premiumPaid, 0);

  logger.info(`Ecosystem: livestock insurance queried for farmer=${farmerId}`);
  return { farmerId, policies, totalCoverage, totalPremium };
};

// ─── 6. Weather Insurance Products ─────────────────────────────────

const getWeatherInsuranceProducts = async ({ districtId, season }) => {
  const resolvedSeason = season || 'kharif';

  const products = [
    {
      productId: generateUUID(),
      productName: 'Rainfall Deficit Shield - Kharif',
      provider: 'Agriculture Insurance Company (AIC)',
      triggerType: 'rainfall_deficit',
      triggerThreshold: 'Below 80% of normal rainfall in sowing window',
      sumInsured: 25000,
      premiumRate: 2.0,
      premiumAmount: 500,
      payoutStructure: '25% at <80%, 50% at <60%, 100% at <40% of normal',
    },
    {
      productId: generateUUID(),
      productName: 'Excess Rainfall Protection',
      provider: 'HDFC Ergo',
      triggerType: 'excess_rainfall',
      triggerThreshold: 'Above 150% of normal rainfall in 7 consecutive days',
      sumInsured: 20000,
      premiumRate: 1.5,
      premiumAmount: 300,
      payoutStructure: 'Graded: 30% at >150%, 60% at >200%, 100% at >250%',
    },
    {
      productId: generateUUID(),
      productName: 'Heat Wave Cover',
      provider: 'ICICI Lombard',
      triggerType: 'temperature',
      triggerThreshold: 'Max temperature > 44C for 5+ consecutive days during flowering',
      sumInsured: 15000,
      premiumRate: 2.5,
      premiumAmount: 375,
      payoutStructure: 'Fixed payout 100% if trigger breached',
    },
    {
      productId: generateUUID(),
      productName: 'Frost Protection - Rabi',
      provider: 'Bajaj Allianz',
      triggerType: 'temperature',
      triggerThreshold: 'Min temperature < 2C for 3+ consecutive nights',
      sumInsured: 18000,
      premiumRate: 1.8,
      premiumAmount: 324,
      payoutStructure: 'Graded: 40% at <2C, 70% at <0C, 100% at <-2C',
    },
    {
      productId: generateUUID(),
      productName: 'Dry Spell Index Insurance',
      provider: 'SBI General',
      triggerType: 'rainfall_deficit',
      triggerThreshold: 'No rainfall >2.5mm for 21+ consecutive days in vegetative phase',
      sumInsured: 22000,
      premiumRate: 2.2,
      premiumAmount: 484,
      payoutStructure: 'Incremental: Rs 1000/day after 21st dry day, max 100%',
    },
  ];

  logger.info(`Ecosystem: weather insurance products queried — district=${districtId}, season=${resolvedSeason}`);
  return { districtId, season: resolvedSeason, products };
};

// ─── 7. DigiLocker Documents ───────────────────────────────────────

const getDigiLockerDocuments = async ({ farmerId }) => {
  const documents = [
    { docType: 'aadhaar', docName: 'Aadhaar Card', issuer: 'UIDAI', issuedDate: '2018-03-15', status: 'not_linked', digiLockerUri: null },
    { docType: 'pan', docName: 'PAN Card', issuer: 'Income Tax Department', issuedDate: '2015-07-22', status: 'not_linked', digiLockerUri: null },
    { docType: 'land_record', docName: 'Khasra / Khatauni (RoR)', issuer: 'Revenue Department', issuedDate: '2023-06-01', status: 'not_linked', digiLockerUri: null },
    { docType: 'caste_cert', docName: 'Caste Certificate', issuer: 'District Magistrate Office', issuedDate: '2016-11-10', status: 'not_linked', digiLockerUri: null },
    { docType: 'income_cert', docName: 'Income Certificate', issuer: 'Tehsildar Office', issuedDate: '2024-01-20', status: 'not_linked', digiLockerUri: null },
    { docType: 'kcc', docName: 'Kisan Credit Card', issuer: 'State Cooperative Bank', issuedDate: '2022-04-10', status: 'not_linked', digiLockerUri: null },
  ];

  logger.info(`Ecosystem: DigiLocker documents queried for farmer=${farmerId}`);
  return {
    farmerId,
    connected: false,
    connectionStatus: 'not_connected',
    documents,
    instructions: 'Link your DigiLocker account to auto-fetch government documents.',
  };
};

// ─── 8. e-RUPI Voucher Status ──────────────────────────────────────

const getErupiVoucherStatus = async ({ farmerId }) => {
  const vouchers = [
    {
      voucherId: generateUUID(),
      schemeName: 'PM-KISAN',
      amount: 2000,
      issueDate: pastDate(90),
      expiryDate: futureDate(90),
      status: 'redeemed',
      redeemedAt: pastDate(60),
      redeemedVia: 'Bank Transfer',
    },
    {
      voucherId: generateUUID(),
      schemeName: 'PM-KISAN',
      amount: 2000,
      issueDate: pastDate(30),
      expiryDate: futureDate(150),
      status: 'issued',
      redeemedAt: null,
      redeemedVia: null,
    },
    {
      voucherId: generateUUID(),
      schemeName: 'DBT-Fertiliser',
      amount: 5000,
      issueDate: pastDate(120),
      expiryDate: pastDate(10),
      status: 'expired',
      redeemedAt: null,
      redeemedVia: null,
    },
    {
      voucherId: generateUUID(),
      schemeName: 'PMFBY-Claim',
      amount: 15000,
      issueDate: pastDate(45),
      expiryDate: futureDate(135),
      status: 'issued',
      redeemedAt: null,
      redeemedVia: null,
    },
    {
      voucherId: generateUUID(),
      schemeName: 'DBT-Fertiliser',
      amount: 3500,
      issueDate: pastDate(200),
      expiryDate: pastDate(80),
      status: 'redeemed',
      redeemedAt: pastDate(100),
      redeemedVia: 'Retailer POS',
    },
  ];

  const totalReceived = vouchers.reduce((s, v) => s + v.amount, 0);
  const totalRedeemed = vouchers.filter(v => v.status === 'redeemed').reduce((s, v) => s + v.amount, 0);

  logger.info(`Ecosystem: e-RUPI voucher status queried for farmer=${farmerId}`);
  return { farmerId, vouchers, totalReceived, totalRedeemed, totalPending: totalReceived - totalRedeemed };
};

// ─── 9. CRIF HighMark Score ────────────────────────────────────────

const getCrifHighMarkScore = async ({ farmerId }) => {
  const score = randomInt(550, 850);
  const reportDate = pastDate(randomInt(1, 30));

  const factors = [
    { factor: 'Repayment History', impact: 'positive', description: 'Consistent on-time payments for KCC loan over 24 months' },
    { factor: 'Credit Utilization', impact: score > 700 ? 'positive' : 'negative', description: score > 700 ? 'Low utilization of available credit limit' : 'High utilization approaching credit limit' },
    { factor: 'Credit Age', impact: 'positive', description: 'Active credit history of 5+ years with cooperative bank' },
    { factor: 'Recent Enquiries', impact: 'negative', description: '3 credit enquiries in last 6 months' },
    { factor: 'Account Mix', impact: 'positive', description: 'Healthy mix of KCC, term loan and crop loan' },
  ];

  const loanHistory = [
    { lender: 'State Cooperative Bank', type: 'KCC', amount: randomInt(50000, 300000), status: 'active', dpd: 0, disbursedDate: pastDate(randomInt(100, 700)) },
    { lender: 'NABARD Refinance', type: 'Term Loan', amount: randomInt(100000, 500000), status: 'closed', dpd: 0, disbursedDate: pastDate(randomInt(400, 1000)) },
    { lender: 'SBI', type: 'Crop Loan', amount: randomInt(25000, 150000), status: 'active', dpd: randomInt(0, 15), disbursedDate: pastDate(randomInt(30, 200)) },
  ];

  logger.info(`Ecosystem: CRIF HighMark score queried for farmer=${farmerId}`);
  return {
    farmerId,
    score,
    scoreRange: '300-900',
    reportDate,
    factors,
    loanHistory,
    enquiryCount: 3,
    dataSource: 'CRIF HighMark (mock)',
  };
};

// ─── 10. Commodity Hedging Advisory ────────────────────────────────

const COMMODITY_MAP = {
  wheat: { name: 'Wheat', exchange: 'NCDEX', lotSize: 10, unit: 'MT', spotRange: [2200, 2600], futuresSpread: [50, 200] },
  soybean: { name: 'Soybean', exchange: 'NCDEX', lotSize: 10, unit: 'MT', spotRange: [4000, 5500], futuresSpread: [80, 300] },
  cotton: { name: 'Cotton', exchange: 'MCX', lotSize: 25, unit: 'Bales', spotRange: [55000, 65000], futuresSpread: [500, 2000] },
  mustard: { name: 'Mustard Seed', exchange: 'NCDEX', lotSize: 10, unit: 'MT', spotRange: [5000, 7000], futuresSpread: [100, 400] },
  chana: { name: 'Chana', exchange: 'NCDEX', lotSize: 10, unit: 'MT', spotRange: [4500, 6000], futuresSpread: [60, 250] },
  maize: { name: 'Maize', exchange: 'NCDEX', lotSize: 10, unit: 'MT', spotRange: [1800, 2400], futuresSpread: [40, 150] },
  guarseed: { name: 'Guar Seed', exchange: 'NCDEX', lotSize: 10, unit: 'MT', spotRange: [5500, 7500], futuresSpread: [150, 500] },
};

const getCommodityHedgingAdvisory = async ({ commodityId }) => {
  const key = (commodityId || 'wheat').toLowerCase();
  const config = COMMODITY_MAP[key] || COMMODITY_MAP.wheat;

  const currentSpotPrice = randomInt(config.spotRange[0], config.spotRange[1]);
  const spread = randomInt(config.futuresSpread[0], config.futuresSpread[1]);
  const futuresPrice = currentSpotPrice + spread;
  const basis = futuresPrice - currentSpotPrice;

  const recommendations = ['buy_put', 'sell_future', 'no_action'];
  const hedgeRecommendation = basis > (config.futuresSpread[1] * 0.6) ? 'sell_future'
    : basis < (config.futuresSpread[0] * 0.8) ? 'no_action'
    : 'buy_put';

  const hedgeRatio = hedgeRecommendation === 'no_action' ? 0 : randomBetween(0.3, 0.7);
  const potentialSaving = hedgeRecommendation === 'no_action' ? 0 : Math.round(basis * config.lotSize * hedgeRatio);

  const result = {
    commodityId: key,
    commodity: config.name,
    currentSpotPrice,
    futuresPrice,
    basis,
    hedgeRecommendation,
    hedgeRatio,
    potentialSaving,
    contractDetails: {
      exchange: config.exchange,
      expiry: futureDate(randomInt(30, 90)),
      lotSize: config.lotSize,
      lotUnit: config.unit,
      margin: Math.round(futuresPrice * config.lotSize * 0.05),
    },
    advisory: hedgeRecommendation === 'sell_future'
      ? `Consider selling ${config.exchange} futures to lock in Rs ${futuresPrice}/${config.unit}. Basis is above average.`
      : hedgeRecommendation === 'buy_put'
        ? `Consider buying a put option to protect downside while retaining upside potential.`
        : `Current basis is narrow. Hold and monitor; hedging cost outweighs benefit at this spread.`,
    dataSource: 'Mock Advisory Engine',
  };

  logger.info(`Ecosystem: commodity hedging advisory queried for commodity=${key}`);
  return result;
};

module.exports = {
  getInputMarketplace,
  getSupplyChainFinance,
  getWarehouseReceiptFinance,
  getFpoLendingStatus,
  getLivestockInsurance,
  getWeatherInsuranceProducts,
  getDigiLockerDocuments,
  getErupiVoucherStatus,
  getCrifHighMarkScore,
  getCommodityHedgingAdvisory,
};
