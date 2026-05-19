'use strict';

/**
 * Insurance Phase 2 — Point-of-Sale product catalog.
 *
 * Seeds 10 insurance products across 2 subsidy buckets:
 *
 *   GOVERNMENT SUBSIDIZED (6):
 *     - PMFBY Kharif, Rabi, Horticulture        (pmfby.gov.in)
 *     - RWBCIS Kharif weather-index              (pmfby.gov.in/pdf/RWBCIS_Revised_Guidelines_1.pdf)
 *     - NLM Livestock                             (nlm.udyamimitra.in)
 *     - PMMSY Fisheries                           (pmmsy.dof.gov.in)
 *
 *   NON-SUBSIDIZED PRIVATE (4):
 *     - HDFC Ergo Yield-Based Crop
 *     - Bajaj Allianz Weather
 *     - ICICI Lombard Livestock
 *     - Tata AIG Comprehensive Agri
 *
 * Idempotent: pre-queries existing product_codes and skips inserts that
 * already exist. Re-runnable at any time.
 */

const now = new Date();

const PRODUCTS = [
  // ─── Government subsidized ────────────────────────────────────────
  {
    product_code: 'PMFBY-KHARIF',
    product_name: 'PMFBY — Kharif Crops (Pradhan Mantri Fasal Bima Yojana)',
    category: 'crop',
    subsidy_type: 'government',
    sub_scheme: 'pmfby',
    insurer_name: 'Agriculture Insurance Company of India (AIC)',
    farmer_premium_rate: 2.00,
    subsidy_pct: 100.00,
    coverage_description:
      '• Notified Kharif crops (rice, maize, pulses, oilseeds, cotton)\n' +
      '• Covers yield loss from drought, flood, pest, disease, fire\n' +
      '• Prevented sowing + localized hail/landslide also covered\n' +
      '• Post-harvest losses for cyclones/unseasonal rain (14-day window)\n' +
      '• 80% of claims settled within 30 days (2026 target)',
    eligibility_rules: JSON.stringify({
      minAreaHa: 0.1,
      seasons: ['kharif'],
      cropCategories: ['cereal', 'oilseed', 'pulse', 'cotton'],
      notifiedCropsOnly: true,
      notifiedAreaOnly: true,
    }),
    deep_link_url: 'https://pmfby.gov.in/',
    portal_url: 'https://pmfby.gov.in/guidelines',
    contact_phone: '14447',
    branch_hint: 'Apply at your bank branch, CSC, or via the PMFBY mobile app before the Kharif cut-off date.',
    display_order: 10,
  },
  {
    product_code: 'PMFBY-RABI',
    product_name: 'PMFBY — Rabi Crops (Pradhan Mantri Fasal Bima Yojana)',
    category: 'crop',
    subsidy_type: 'government',
    sub_scheme: 'pmfby',
    insurer_name: 'Agriculture Insurance Company of India (AIC)',
    farmer_premium_rate: 1.50,
    subsidy_pct: 100.00,
    coverage_description:
      '• Notified Rabi crops (wheat, gram, mustard, barley)\n' +
      '• Same coverage scope as Kharif: yield loss, sowing risk, localized damage\n' +
      '• Lower 1.5% farmer premium for Rabi season\n' +
      '• No upper limit on government subsidy — even 90% is paid by govt.',
    eligibility_rules: JSON.stringify({
      minAreaHa: 0.1,
      seasons: ['rabi'],
      cropCategories: ['cereal', 'oilseed', 'pulse'],
      notifiedCropsOnly: true,
      notifiedAreaOnly: true,
    }),
    deep_link_url: 'https://pmfby.gov.in/',
    portal_url: 'https://pmfby.gov.in/guidelines',
    contact_phone: '14447',
    branch_hint: 'Apply at your bank branch, CSC, or via the PMFBY mobile app before the Rabi cut-off date.',
    display_order: 20,
  },
  {
    product_code: 'PMFBY-HORTI',
    product_name: 'PMFBY — Horticulture & Commercial (Pradhan Mantri Fasal Bima Yojana)',
    category: 'horticulture',
    subsidy_type: 'government',
    sub_scheme: 'pmfby',
    insurer_name: 'Agriculture Insurance Company of India (AIC)',
    farmer_premium_rate: 5.00,
    subsidy_pct: 100.00,
    coverage_description:
      '• Horticultural crops (onion, tomato, potato, mango, banana, apple)\n' +
      '• Commercial crops (sugarcane, jute, spices)\n' +
      '• 5% farmer share; balance up to full actuarial paid by govt.\n' +
      '• Same peril coverage as food crops',
    eligibility_rules: JSON.stringify({
      minAreaHa: 0.1,
      cropCategories: ['horticulture', 'commercial', 'spice'],
      notifiedCropsOnly: true,
      notifiedAreaOnly: true,
    }),
    deep_link_url: 'https://pmfby.gov.in/',
    portal_url: 'https://pmfby.gov.in/guidelines',
    contact_phone: '14447',
    branch_hint: 'Apply at your bank branch or CSC before the horticulture crop cut-off date.',
    display_order: 30,
  },
  {
    product_code: 'RWBCIS-KHARIF',
    product_name: 'RWBCIS — Weather Based Crop Insurance Scheme',
    category: 'crop',
    subsidy_type: 'government',
    sub_scheme: 'rwbcis',
    insurer_name: 'HDFC Ergo General Insurance (empanelled)',
    farmer_premium_rate: 2.00,
    subsidy_pct: 100.00,
    coverage_description:
      '• Weather-index based payout (no claim filing needed)\n' +
      '• Triggers: rainfall deficit/excess, temperature, humidity, wind\n' +
      '• Parametric — payout is automatic when a weather threshold is breached\n' +
      '• Same 2%/1.5%/5% farmer premium as PMFBY\n' +
      '• Best for farmers in weather-volatile regions',
    eligibility_rules: JSON.stringify({
      minAreaHa: 0.1,
      seasons: ['kharif', 'rabi'],
      triggerTypes: ['rainfall', 'temperature', 'humidity', 'wind'],
      notifiedAreaOnly: true,
    }),
    deep_link_url: 'https://pmfby.gov.in/',
    portal_url: 'https://pmfby.gov.in/pdf/RWBCIS_Revised_Guidelines_1.pdf',
    contact_phone: '022-62346234',
    branch_hint: 'Available only in RWBCIS-notified districts. Check your state agriculture department for the list.',
    display_order: 40,
  },
  {
    product_code: 'NLM-LIVESTOCK',
    product_name: 'NLM Livestock Insurance (National Livestock Mission)',
    category: 'livestock',
    subsidy_type: 'government',
    sub_scheme: 'nlm',
    insurer_name: 'United India Insurance / Empanelled insurers',
    farmer_premium_rate: 40.00,
    subsidy_pct: 60.00,
    coverage_description:
      '• Covers cattle, buffalo, sheep, goat, pig, camel, yak, equine\n' +
      '• APL: 35% Centre + 25% State + 40% Farmer share\n' +
      '• BPL/SC/ST: 50% Centre + 30% State + 20% Farmer share\n' +
      '• Maximum 5 animals (or 5 cattle units) per household\n' +
      '• Covers death from disease, accident, natural calamity',
    eligibility_rules: JSON.stringify({
      maxAnimals: 5,
      animalTypes: ['cattle', 'buffalo', 'sheep', 'goat', 'pig', 'camel', 'yak', 'equine'],
      bplBoost: true,
      valuationRequired: true,
    }),
    deep_link_url: 'https://nlm.udyamimitra.in/',
    portal_url: 'https://dahd.gov.in/schemes/programmes/national_livestock_mission',
    contact_phone: '1800-11-0040',
    branch_hint: 'Apply via nlm.udyamimitra.in or your District Animal Husbandry Office. Valuation by a veterinarian is required.',
    display_order: 50,
  },
  {
    product_code: 'PMMSY-FISHERIES',
    product_name: 'PMMSY Fishermen & Vessel Insurance',
    category: 'fisheries',
    subsidy_type: 'government',
    sub_scheme: 'pmmsy',
    insurer_name: 'NFDB empanelled insurers',
    farmer_premium_rate: 0.00,
    subsidy_pct: 100.00,
    coverage_description:
      '• Life + accident cover for active traditional fishers\n' +
      '• Vessel + net insurance for motorized + non-motorized boats\n' +
      '• Subsidy covers premium fully for active traditional fishers\n' +
      '• Part of PMMSY Rs 20,050 Cr fisheries welfare scheme',
    eligibility_rules: JSON.stringify({
      activeFisherOnly: true,
      vesselTypes: ['motorized', 'non_motorized', 'deep_sea'],
      bplPriority: true,
    }),
    deep_link_url: 'https://pmmsy.dof.gov.in/',
    portal_url: 'https://www.myscheme.gov.in/schemes/pmmsy',
    contact_phone: '011-23384896',
    branch_hint: 'Apply through your State Fisheries Department or NFDB regional office.',
    display_order: 60,
  },

  // ─── Non-subsidized private ───────────────────────────────────────
  {
    product_code: 'HDFC-YIELD-PRIVATE',
    product_name: 'HDFC Ergo Yield-Based Crop Insurance',
    category: 'crop',
    subsidy_type: 'non_subsidized',
    sub_scheme: 'private',
    insurer_name: 'HDFC Ergo General Insurance',
    farmer_premium_rate: 10.00,
    subsidy_pct: null,
    coverage_description:
      '• Market-rate yield-based crop cover (no government subsidy)\n' +
      '• Flexible sum insured — choose your own coverage level\n' +
      '• Covers yield shortfall from natural perils, pests, diseases\n' +
      '• Faster claim processing vs PMFBY\n' +
      '• Best for farmers outside notified areas or with higher risk appetite',
    eligibility_rules: JSON.stringify({
      minAreaHa: 0.5,
      noNotifiedAreaRestriction: true,
      kycRequired: true,
    }),
    deep_link_url: 'https://www.hdfcergo.com/commercial-insurance/agriculture-crop-insurance-policy',
    portal_url: 'https://www.hdfcergo.com/rural-insurance',
    contact_phone: '022-62346234',
    branch_hint: 'Call the HDFC Ergo rural insurance desk or visit any HDFC Bank branch.',
    display_order: 110,
  },
  {
    product_code: 'BAJAJ-WEATHER-PRIVATE',
    product_name: 'Bajaj Allianz Weather Insurance',
    category: 'crop',
    subsidy_type: 'non_subsidized',
    sub_scheme: 'private',
    insurer_name: 'Bajaj Allianz General Insurance',
    farmer_premium_rate: 10.00,
    subsidy_pct: null,
    coverage_description:
      '• Parametric weather cover (rainfall, temperature)\n' +
      '• Automatic payout when weather index is breached\n' +
      '• No claim filing, no assessment visits\n' +
      '• Market-rate premium\n' +
      '• Available across India',
    eligibility_rules: JSON.stringify({
      minAreaHa: 0.5,
      triggerTypes: ['rainfall', 'temperature'],
      noNotifiedAreaRestriction: true,
    }),
    deep_link_url: 'https://www.bajajallianz.com/rural-insurance.html',
    portal_url: 'https://www.bajajallianz.com/',
    contact_phone: '1800-209-5858',
    branch_hint: 'Call Bajaj Allianz rural customer care or visit a Bajaj Allianz branch.',
    display_order: 120,
  },
  {
    product_code: 'ICICI-LIVESTOCK-PRIVATE',
    product_name: 'ICICI Lombard Livestock Insurance',
    category: 'livestock',
    subsidy_type: 'non_subsidized',
    sub_scheme: 'private',
    insurer_name: 'ICICI Lombard General Insurance',
    farmer_premium_rate: 4.00,
    subsidy_pct: null,
    coverage_description:
      '• Cattle, buffalo, sheep, goat, pig cover\n' +
      '• No 5-animal cap (unlike NLM)\n' +
      '• Covers death from disease, accident, natural calamity\n' +
      '• Optional: theft and permanent disability add-ons\n' +
      '• 4% market-rate premium',
    eligibility_rules: JSON.stringify({
      animalTypes: ['cattle', 'buffalo', 'sheep', 'goat', 'pig'],
      maxAnimals: null,
      valuationRequired: true,
    }),
    deep_link_url: 'https://www.icicilombard.com/rural-insurance',
    portal_url: 'https://www.icicilombard.com/',
    contact_phone: '1800-2666',
    branch_hint: 'Call ICICI Lombard or visit an ICICI Bank branch. Livestock valuation required.',
    display_order: 130,
  },
  {
    product_code: 'TATA-AGRI-ALLRISK',
    product_name: 'Tata AIG Comprehensive Agri Insurance',
    category: 'multi',
    subsidy_type: 'non_subsidized',
    sub_scheme: 'private',
    insurer_name: 'Tata AIG General Insurance',
    farmer_premium_rate: 7.00,
    subsidy_pct: null,
    coverage_description:
      '• Bundled cover for crop + livestock + farm machinery\n' +
      '• All-risk policy (named perils)\n' +
      '• Single premium, single policy document\n' +
      '• Best for mixed-farm households\n' +
      '• 7% market-rate premium',
    eligibility_rules: JSON.stringify({
      bundled: true,
      coverageTypes: ['crop', 'livestock', 'machinery'],
      minAssetValue: 50000,
    }),
    deep_link_url: 'https://www.tataaig.com/rural-insurance',
    portal_url: 'https://www.tataaig.com/',
    contact_phone: '1800-266-7780',
    branch_hint: 'Call Tata AIG rural customer care. Policy issued via Tata AIG empanelled rural agents.',
    display_order: 140,
  },
];

module.exports = {
  async up(queryInterface) {
    const codes = PRODUCTS.map((p) => p.product_code);
    const [existing] = await queryInterface.sequelize.query(
      `SELECT product_code FROM pos_insurance_products WHERE product_code IN (?)`,
      { replacements: [codes] },
    );
    const existingSet = new Set(existing.map((r) => r.product_code));

    const rowsToInsert = PRODUCTS.filter((p) => !existingSet.has(p.product_code)).map((p) => ({
      product_code: p.product_code,
      product_name: p.product_name,
      category: p.category,
      subsidy_type: p.subsidy_type,
      sub_scheme: p.sub_scheme,
      insurer_name: p.insurer_name,
      farmer_premium_rate: p.farmer_premium_rate,
      subsidy_pct: p.subsidy_pct,
      coverage_description: p.coverage_description,
      eligibility_rules: p.eligibility_rules,
      deep_link_url: p.deep_link_url,
      portal_url: p.portal_url,
      contact_phone: p.contact_phone,
      branch_hint: p.branch_hint,
      display_order: p.display_order,
      is_active: true,
      created_at: now,
      updated_at: now,
    }));

    if (rowsToInsert.length > 0) {
      await queryInterface.bulkInsert('pos_insurance_products', rowsToInsert);
      console.log(`[seed-insurance-products] inserted ${rowsToInsert.length} products`);
    } else {
      console.log('[seed-insurance-products] all products already exist — skipping');
    }
  },

  async down(queryInterface) {
    const codes = PRODUCTS.map((p) => p.product_code);
    await queryInterface.sequelize.query(
      `DELETE FROM pos_insurance_products WHERE product_code IN (?)`,
      { replacements: [codes] },
    );
  },
};
