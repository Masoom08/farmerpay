/**
 * Input Cost Calculator Service — DICE Module
 *
 * Calculates loan requirement from:
 * 1. PoP-prescribed inputs (dropdown) with current regional prices
 * 2. Scale of Finance (DLTC) district-crop-season norms for labour/machinery/other
 * 3. NABARD standard input cost benchmarks for comparison
 * 4. Extra inputs beyond PoP (farmer can add, flagged for bank review)
 *
 * Flow: Farmer selects crop + field → system shows input dropdown from PoP →
 *       farmer adjusts quantities / adds extras → system calculates total →
 *       recommended loan amount = input costs + SoF non-input norms
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Get the input dropdown for a PoP — all prescribed inputs with current prices.
 * This is what the farmer sees as checkboxes when selecting inputs.
 *
 * @param {Object} params - { cropId, popId, stateId }
 * @returns {Array} - [{ inputItemId, inputName, category, requiredQtyPerHa, unit, pricePerUnit, costPerHa, isMandatory }]
 */
const getInputDropdown = async ({ cropId, popId, stateId }) => {
  const { PackageOfPractice, PopWorkband, PopTask, PopTaskInput, InputItem, InputCategory, InputUnit, InputPack, InputPackPrice } = getDb();

  // Find the PoP
  const pop = await PackageOfPractice.findOne({
    where: { pop_uuid: popId, is_active: true }
  });
  if (!pop) {
    const err = new Error('Package of Practice not found');
    err.statusCode = 404; err.errorCode = 'ROOTS_001'; throw err;
  }

  // Load all PopTaskInputs across all workbands/tasks for this PoP
  const workbands = await PopWorkband.findAll({
    where: { pop_id: pop.id, is_active: true },
    include: [{
      model: PopTask, as: 'popTasks', where: { is_active: true }, required: false,
      include: [{
        model: PopTaskInput, as: 'popTaskInputs', where: { is_active: true }, required: false,
        include: [
          { model: InputItem, as: 'inputItem', include: [
            { model: InputCategory, as: 'inputCategory' },
            { model: InputUnit, as: 'inputUnit' },
            { model: InputPack, as: 'inputPacks', where: { is_active: true }, required: false,
              include: [{ model: InputPackPrice, as: 'inputPackPrices', where: { state_id: stateId, is_active: true }, required: false, order: [['price_recorded_date', 'DESC']], limit: 1 }]
            }
          ]},
          { model: InputUnit, as: 'inputUnit' }
        ]
      }]
    }],
    order: [['workband_order', 'ASC']]
  });

  // Flatten and deduplicate inputs across all workbands
  const inputMap = {};
  for (const wb of workbands) {
    for (const task of (wb.popTasks || [])) {
      for (const pti of (task.popTaskInputs || [])) {
        const item = pti.inputItem;
        if (!item) continue;
        const key = item.item_uuid;

        // Get best price from packs
        let pricePerUnit = 0;
        let packInfo = null;
        if (item.inputPacks && item.inputPacks.length > 0) {
          for (const pack of item.inputPacks) {
            const price = pack.inputPackPrices?.[0];
            if (price) {
              const unitPrice = parseFloat(price.market_price_rupees || price.wholesale_price_rupees || 0) / parseFloat(pack.pack_size_value || 1);
              if (unitPrice > 0) { pricePerUnit = unitPrice; packInfo = pack; break; }
            }
            // Fallback to pack price
            if (pack.pack_price_rupees && parseFloat(pack.pack_price_rupees) > 0) {
              pricePerUnit = parseFloat(pack.pack_price_rupees) / parseFloat(pack.pack_size_value || 1);
              packInfo = pack; break;
            }
          }
        }

        const qty = parseFloat(pti.input_quantity || 0);
        const unitName = pti.inputUnit?.unit_name || item.inputUnit?.unit_name || 'unit';

        if (inputMap[key]) {
          // Same input used in multiple tasks — sum quantities
          inputMap[key].requiredQtyPerHa += qty;
          inputMap[key].costPerHa = inputMap[key].requiredQtyPerHa * inputMap[key].pricePerUnit;
        } else {
          inputMap[key] = {
            inputItemId: key,
            inputName: item.item_name,
            category: item.inputCategory?.category_name || 'Other',
            categoryCode: item.inputCategory?.category_code || 'OTHER',
            requiredQtyPerHa: qty,
            unit: unitName,
            pricePerUnit: Math.round(pricePerUnit * 100) / 100,
            costPerHa: Math.round(qty * pricePerUnit * 100) / 100,
            isMandatory: !pti.is_optional,
            isOrganic: item.is_organic || false,
            manufacturer: item.manufacturer || null,
            workbandName: wb.workband_name,
            timingDays: pti.input_timing_days_from_start
          };
        }
      }
    }
  }

  const dropdown = Object.values(inputMap).sort((a, b) => {
    // Sort: mandatory first, then by category, then by name
    if (a.isMandatory !== b.isMandatory) return b.isMandatory - a.isMandatory;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.inputName.localeCompare(b.inputName);
  });

  logger.info(`[InputCalculator] Dropdown: ${dropdown.length} inputs for PoP ${popId}, state ${stateId}`);
  return dropdown;
};

/**
 * Search for extra inputs not in the PoP that farmer can add.
 * @param {Object} params - { categoryId, stateId, search }
 */
const getExtraInputCatalogue = async ({ categoryId, stateId, search, page, limit }) => {
  const { InputItem, InputCategory, InputUnit, InputPack, InputPackPrice } = getDb();
  const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');

  const { offset, limit: lim } = parsePagination({ page, limit }, 20, 50);
  const where = { is_active: true };
  if (categoryId) where.category_id = categoryId;
  if (search) where.item_name = { [Op.like]: `%${search}%` };

  const { count, rows } = await InputItem.findAndCountAll({
    where,
    include: [
      { model: InputCategory, as: 'inputCategory', attributes: ['category_name', 'category_code'] },
      { model: InputUnit, as: 'inputUnit', attributes: ['unit_name', 'unit_symbol'] },
      { model: InputPack, as: 'inputPacks', where: { is_active: true }, required: false, limit: 1,
        include: [{ model: InputPackPrice, as: 'inputPackPrices', where: stateId ? { state_id: stateId, is_active: true } : { is_active: true }, required: false, order: [['price_recorded_date', 'DESC']], limit: 1 }]
      }
    ],
    offset, limit: lim,
    order: [['item_name', 'ASC']]
  });

  const items = rows.map(item => {
    let pricePerUnit = 0;
    const pack = item.inputPacks?.[0];
    if (pack) {
      const price = pack.inputPackPrices?.[0];
      if (price) pricePerUnit = parseFloat(price.market_price_rupees || 0) / parseFloat(pack.pack_size_value || 1);
      else if (pack.pack_price_rupees) pricePerUnit = parseFloat(pack.pack_price_rupees) / parseFloat(pack.pack_size_value || 1);
    }
    return {
      inputItemId: item.item_uuid,
      inputName: item.item_name,
      category: item.inputCategory?.category_name || 'Other',
      unit: item.inputUnit?.unit_name || 'unit',
      pricePerUnit: Math.round(pricePerUnit * 100) / 100,
      isOrganic: item.is_organic || false,
      manufacturer: item.manufacturer || null,
    };
  });

  return { items, meta: buildMeta(page || 1, lim, count) };
};

/**
 * Calculate loan requirement from selected inputs + SoF norms.
 *
 * @param {Object} params
 * @param {number} params.farmerId
 * @param {number} params.cropId
 * @param {number} params.fieldId
 * @param {string} params.popId
 * @param {Array} params.selectedInputs - [{ inputItemId, quantity }] (farmer-adjusted PoP inputs)
 * @param {Array} params.extraInputs - [{ inputItemId, quantity }] (inputs beyond PoP)
 * @returns {Object} - full cost breakdown + recommended loan amount
 */
const calculateLoanRequirement = async ({ farmerId, cropId, fieldId, popId, selectedInputs, extraInputs }) => {
  const { Field, FarmRegister, ScaleOfFinance, InputItem, InputPack, InputPackPrice, InputUnit, InputCategory } = getDb();

  // 1. Get farmer's field size and district
  const field = await Field.findOne({
    where: { id: fieldId, is_active: true },
    include: [{ model: FarmRegister, as: 'farmRegister', where: { farmer_id: farmerId } }]
  });
  if (!field) {
    const err = new Error('Field not found or not owned by farmer');
    err.statusCode = 404; err.errorCode = 'ROOTS_002'; throw err;
  }

  const hectares = parseFloat(field.field_size_hectares || 0);
  if (hectares <= 0) {
    const err = new Error('Field size must be greater than zero');
    err.statusCode = 400; err.errorCode = 'ROOTS_003'; throw err;
  }

  // Get district from field's farm register or farmer address
  const districtId = field.farmRegister?.district_id || null;
  const stateId = field.farmRegister?.state_id || null;

  // Determine current financial year and season
  const now = new Date();
  const month = now.getMonth() + 1;
  const fy = month >= 4 ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}` : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(2)}`;
  const season = month >= 6 && month <= 10 ? 'kharif' : month >= 10 || month <= 3 ? 'rabi' : 'summer';

  // 2. Load Scale of Finance for this district + crop + season
  let sof = null;
  if (districtId && cropId) {
    sof = await ScaleOfFinance.findOne({
      where: { district_id: districtId, crop_id: cropId, season, financial_year: fy, is_active: true }
    });
    // Fallback: try without financial year (latest available)
    if (!sof) {
      sof = await ScaleOfFinance.findOne({
        where: { district_id: districtId, crop_id: cropId, season, is_active: true },
        order: [['financial_year', 'DESC']]
      });
    }
    // Fallback: state-level
    if (!sof && stateId) {
      sof = await ScaleOfFinance.findOne({
        where: { state_id: stateId, crop_id: cropId, season, is_active: true },
        order: [['financial_year', 'DESC']]
      });
    }
  }

  // 3. Calculate input costs from selected inputs
  const inputCostDetails = [];
  let totalInputCostPerHa = 0;

  const allInputIds = [
    ...(selectedInputs || []).map(s => s.inputItemId),
    ...(extraInputs || []).map(e => e.inputItemId)
  ];

  // Batch-load all input items with prices
  const inputItems = await InputItem.findAll({
    where: { item_uuid: { [Op.in]: allInputIds }, is_active: true },
    include: [
      { model: InputCategory, as: 'inputCategory', attributes: ['category_name', 'category_code'] },
      { model: InputUnit, as: 'inputUnit', attributes: ['unit_name'] },
      { model: InputPack, as: 'inputPacks', where: { is_active: true }, required: false,
        include: [{ model: InputPackPrice, as: 'inputPackPrices', where: stateId ? { state_id: stateId, is_active: true } : { is_active: true }, required: false }]
      }
    ]
  });

  const itemMap = {};
  for (const item of inputItems) itemMap[item.item_uuid] = item;

  // Process PoP inputs (selected by farmer)
  const popInputBreakdown = [];
  for (const sel of (selectedInputs || [])) {
    const item = itemMap[sel.inputItemId];
    if (!item) continue;
    const qty = parseFloat(sel.quantity || 0);
    const pricePerUnit = getItemPrice(item);
    const costPerHa = Math.round(qty * pricePerUnit * 100) / 100;

    popInputBreakdown.push({
      inputItemId: sel.inputItemId,
      inputName: item.item_name,
      category: item.inputCategory?.category_name || 'Other',
      categoryCode: item.inputCategory?.category_code || 'OTHER',
      quantityPerHa: qty,
      unit: item.inputUnit?.unit_name || 'unit',
      pricePerUnit,
      costPerHa,
      source: 'pop'
    });
    totalInputCostPerHa += costPerHa;
  }

  // Process extra inputs (beyond PoP)
  const extraInputBreakdown = [];
  let totalExtraCostPerHa = 0;
  for (const ext of (extraInputs || [])) {
    const item = itemMap[ext.inputItemId];
    if (!item) continue;
    const qty = parseFloat(ext.quantity || 0);
    const pricePerUnit = getItemPrice(item);
    const costPerHa = Math.round(qty * pricePerUnit * 100) / 100;

    extraInputBreakdown.push({
      inputItemId: ext.inputItemId,
      inputName: item.item_name,
      category: item.inputCategory?.category_name || 'Other',
      quantityPerHa: qty,
      unit: item.inputUnit?.unit_name || 'unit',
      pricePerUnit,
      costPerHa,
      source: 'extra'
    });
    totalExtraCostPerHa += costPerHa;
  }

  // 4. Get SoF non-input costs
  const sofLabourPerHa = sof ? parseFloat(sof.cost_per_hectare_labour || 0) : 0;
  const sofMachineryPerHa = sof ? parseFloat(sof.cost_per_hectare_machinery || 0) : 0;
  const sofOtherPerHa = sof ? parseFloat(sof.cost_per_hectare_other || 0) : 0;
  const sofTotalPerHa = sof ? parseFloat(sof.total_cost_per_hectare || 0) : 0;
  const nabardBenchmark = sof ? parseFloat(sof.nabard_benchmark_total || 0) : 0;

  // 5. Calculate recommended loan amount
  const farmerInputCostPerHa = totalInputCostPerHa + totalExtraCostPerHa;
  const totalCostPerHa = farmerInputCostPerHa + sofLabourPerHa + sofMachineryPerHa + sofOtherPerHa;
  const recommendedPerHa = sofTotalPerHa > 0 ? Math.min(totalCostPerHa, sofTotalPerHa) : totalCostPerHa;
  const amountAboveSofPerHa = Math.max(0, totalCostPerHa - sofTotalPerHa);

  const recommendedTotal = Math.round(recommendedPerHa * hectares);
  const totalAboveSof = Math.round(amountAboveSofPerHa * hectares);

  // 6. Build category-wise breakdown for loan application
  const categoryBreakdown = {};
  for (const inp of [...popInputBreakdown, ...extraInputBreakdown]) {
    const cat = inp.categoryCode || 'OTHER';
    if (!categoryBreakdown[cat]) categoryBreakdown[cat] = 0;
    categoryBreakdown[cat] += inp.costPerHa * hectares;
  }
  categoryBreakdown.LABOUR = sofLabourPerHa * hectares;
  categoryBreakdown.MACHINERY = sofMachineryPerHa * hectares;
  categoryBreakdown.OTHER = sofOtherPerHa * hectares;

  // Round all values
  for (const key of Object.keys(categoryBreakdown)) {
    categoryBreakdown[key] = Math.round(categoryBreakdown[key]);
  }

  const result = {
    field: { fieldId, hectares, districtId, stateId },
    scaleOfFinance: sof ? {
      sofId: sof.id,
      sofCode: sof.sof_code,
      financialYear: sof.financial_year || fy,
      season,
      totalCostPerHa: sofTotalPerHa,
      inputCostPerHa: parseFloat(sof.nabard_benchmark_input_cost || 0),
      labourPerHa: sofLabourPerHa,
      machineryPerHa: sofMachineryPerHa,
      otherPerHa: sofOtherPerHa,
      nabardBenchmarkPerHa: nabardBenchmark,
      approvedBy: sof.approved_by,
      source: sof.source,
    } : null,
    popInputs: popInputBreakdown,
    extraInputs: extraInputBreakdown,
    costSummary: {
      popInputCostPerHa: Math.round(totalInputCostPerHa * 100) / 100,
      extraInputCostPerHa: Math.round(totalExtraCostPerHa * 100) / 100,
      totalInputCostPerHa: Math.round(farmerInputCostPerHa * 100) / 100,
      labourPerHa: sofLabourPerHa,
      machineryPerHa: sofMachineryPerHa,
      otherPerHa: sofOtherPerHa,
      totalCostPerHa: Math.round(totalCostPerHa * 100) / 100,
      sofTotalPerHa,
      nabardBenchmarkPerHa: nabardBenchmark,
    },
    loanRecommendation: {
      recommendedPerHa: Math.round(recommendedPerHa),
      recommendedTotal,
      totalArea: hectares,
      amountAboveSof: totalAboveSof,
      requiresBankReview: totalAboveSof > 0,
      categoryBreakdown,
      sizingMethod: 'input_cost_based',
      note: totalAboveSof > 0
        ? `Rs ${totalAboveSof} exceeds DLTC norm — requires bank approval for additional amount`
        : `Within DLTC Scale of Finance norms for this district and crop`
    }
  };

  logger.info(`[InputCalculator] Loan calc: farmer ${farmerId}, field ${fieldId}, ${hectares} ha, recommended ₹${recommendedTotal}`);
  return result;
};

/**
 * Lookup Scale of Finance norms for a district + crop + season.
 */
const getScaleOfFinance = async ({ districtId, cropId, season }) => {
  const { ScaleOfFinance, LgdDistrict, LgdState } = getDb();

  const where = { is_active: true };
  if (districtId) where.district_id = districtId;
  if (cropId) where.crop_id = cropId;
  if (season) where.season = season;

  const norms = await ScaleOfFinance.findAll({
    where,
    include: [
      { model: LgdDistrict, as: 'district', attributes: ['district_name'] },
      { model: LgdState, as: 'state', attributes: ['state_name'] },
    ],
    order: [['financial_year', 'DESC'], ['total_cost_per_hectare', 'DESC']],
    limit: 20
  });

  return norms.map(s => ({
    sofId: s.id,
    sofCode: s.sof_code,
    sofName: s.sof_name,
    district: s.district?.district_name,
    state: s.state?.state_name,
    cropId: s.crop_id,
    season: s.season,
    financialYear: s.financial_year,
    costPerHectar: {
      seed: parseFloat(s.cost_per_hectare_seed || 0),
      fertiliser: parseFloat(s.cost_per_hectare_fertiliser || 0),
      pesticide: parseFloat(s.cost_per_hectare_pesticide || 0),
      labour: parseFloat(s.cost_per_hectare_labour || 0),
      machinery: parseFloat(s.cost_per_hectare_machinery || 0),
      other: parseFloat(s.cost_per_hectare_other || 0),
      total: parseFloat(s.total_cost_per_hectare || 0),
    },
    nabardBenchmark: parseFloat(s.nabard_benchmark_total || 0),
    approvedBy: s.approved_by,
    source: s.source,
  }));
};

// Helper: get best available price for an input item
function getItemPrice(item) {
  if (!item.inputPacks || item.inputPacks.length === 0) return 0;
  for (const pack of item.inputPacks) {
    const price = pack.inputPackPrices?.[0];
    if (price) {
      const mp = parseFloat(price.market_price_rupees || 0);
      const wp = parseFloat(price.wholesale_price_rupees || 0);
      const unitPrice = (mp || wp) / parseFloat(pack.pack_size_value || 1);
      if (unitPrice > 0) return Math.round(unitPrice * 100) / 100;
    }
    if (pack.pack_price_rupees && parseFloat(pack.pack_price_rupees) > 0) {
      return Math.round(parseFloat(pack.pack_price_rupees) / parseFloat(pack.pack_size_value || 1) * 100) / 100;
    }
  }
  return 0;
}

module.exports = {
  getInputDropdown,
  getExtraInputCatalogue,
  calculateLoanRequirement,
  getScaleOfFinance,
};
