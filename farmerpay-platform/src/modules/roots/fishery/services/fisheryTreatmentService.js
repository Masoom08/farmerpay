/**
 * Fishery Treatment Service
 * Captures pond health/disease treatments with three-way cost split (medicine,
 * vet fee, other) plus formal/informal. Auto-creates a matching
 * HEALTH_TREATMENT cost event on the pond scope.
 */

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../../shared/models');
  return db;
};

const createTreatmentEvent = async (farmerId, data) => {
  const { FisheryTreatmentEventV2, FisheryCostEvent } = getDb();

  const medicine = parseFloat(data.medicineCost || 0);
  const vetFee = parseFloat(data.vetFee || 0);
  const other = parseFloat(data.otherCost || 0);
  const formal = parseFloat(data.costFormal || 0);
  const informal = parseFloat(data.costInformal || 0);
  const total = formal + informal || medicine + vetFee + other;

  const eventUuid = uuidv4();
  const costUuid = uuidv4();

  const event = await FisheryTreatmentEventV2.create({
    event_uuid: eventUuid,
    farmer_id: farmerId,
    pond_id: data.pondId || null,
    treatment_date: data.treatmentDate,
    condition: data.condition || null,
    treatment_type: data.treatmentType || 'OTHER',
    affected_species: data.affectedSpecies || null,
    mortality_before_pct: data.mortalityBeforePct || null,
    mortality_after_pct: data.mortalityAfterPct || null,
    vet_name: data.vetName || null,
    vet_type: data.vetType || null,
    medicine_cost: medicine,
    vet_fee: vetFee,
    other_cost: other,
    cost_formal: formal,
    cost_informal: informal,
    payment_mode: data.paymentMode || null,
    outcome: data.outcome || null,
    notes: data.notes || null,
    cost_event_uuid: total > 0 ? costUuid : null,
  });

  if (total > 0) {
    await FisheryCostEvent.create({
      event_uuid: costUuid,
      farmer_id: farmerId,
      event_date: data.treatmentDate,
      scope: data.pondId ? 'POND' : 'FARM',
      pond_id: data.pondId || null,
      category: 'HEALTH_TREATMENT',
      amount: total,
      amount_formal: formal,
      amount_informal: informal,
      payment_mode: data.paymentMode || null,
      vendor_name: data.vetName || null,
      source_table: 'fishery_treatment_events',
      source_event_uuid: eventUuid,
      notes: data.condition || null,
    });
  }

  logger.info(`Fishery treatment event ${eventUuid} created (${data.treatmentType}, ₹${total})`);
  return event;
};

const listTreatmentEvents = async (farmerId, filters = {}) => {
  const { FisheryTreatmentEventV2 } = getDb();
  const where = { farmer_id: farmerId };
  if (filters.pondId) where.pond_id = filters.pondId;
  if (filters.treatmentType) where.treatment_type = filters.treatmentType;
  if (filters.startDate && filters.endDate) {
    where.treatment_date = { [Op.between]: [filters.startDate, filters.endDate] };
  }
  return FisheryTreatmentEventV2.findAll({
    where,
    order: [['treatment_date', 'DESC']],
    limit: filters.limit || 100,
  });
};

module.exports = { createTreatmentEvent, listTreatmentEvents };
