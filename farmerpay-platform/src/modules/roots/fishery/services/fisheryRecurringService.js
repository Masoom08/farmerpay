/**
 * Fishery Recurring Template Service
 * Manages per-farmer recurring fishery cost templates (daily feed, weekly
 * aeration electricity, monthly crew retainer). A daily cron converts due
 * templates into pending FisheryCostEvents that the farmer one-tap confirms.
 */

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../../shared/models');
  return db;
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};
const addMonths = (date, n) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
};

const nextDueFromFrequency = (fromDate, frequency) => {
  switch (frequency) {
    case 'DAILY': return addDays(fromDate, 1);
    case 'WEEKLY': return addDays(fromDate, 7);
    case 'MONTHLY': return addMonths(fromDate, 1);
    case 'QUARTERLY': return addMonths(fromDate, 3);
    default: return addDays(fromDate, 1);
  }
};

const createTemplate = async (farmerId, data) => {
  const { FisheryRecurringTemplate } = getDb();
  const template = await FisheryRecurringTemplate.create({
    template_uuid: uuidv4(),
    farmer_id: farmerId,
    template_name: data.templateName,
    scope: data.scope || 'FARM',
    pond_id: data.pondId || null,
    vessel_id: data.vesselId || null,
    category: data.category,
    default_amount: data.defaultAmount,
    default_quantity: data.defaultQuantity || null,
    default_unit: data.defaultUnit || null,
    default_vendor: data.defaultVendor || null,
    default_payment_mode: data.defaultPaymentMode || null,
    frequency: data.frequency,
    day_of_period: data.dayOfPeriod || null,
    next_due_date: data.nextDueDate || new Date(),
  });
  logger.info(`Fishery recurring template ${template.template_uuid} created`);
  return template;
};

const listTemplates = async (farmerId) => {
  const { FisheryRecurringTemplate } = getDb();
  return FisheryRecurringTemplate.findAll({
    where: { farmer_id: farmerId, is_active: true },
    order: [['next_due_date', 'ASC']],
  });
};

const updateTemplate = async (farmerId, templateUuid, data) => {
  const { FisheryRecurringTemplate } = getDb();
  const tpl = await FisheryRecurringTemplate.findOne({
    where: { template_uuid: templateUuid, farmer_id: farmerId },
  });
  if (!tpl) {
    const err = new Error('Template not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }
  await tpl.update(data);
  return tpl;
};

const deleteTemplate = async (farmerId, templateUuid) => {
  const { FisheryRecurringTemplate } = getDb();
  const tpl = await FisheryRecurringTemplate.findOne({
    where: { template_uuid: templateUuid, farmer_id: farmerId },
  });
  if (!tpl) return null;
  await tpl.update({ is_active: false });
  return tpl;
};

const generatePendingEventsForDueTemplates = async () => {
  const { FisheryRecurringTemplate, FisheryCostEvent } = getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = await FisheryRecurringTemplate.findAll({
    where: { is_active: true, next_due_date: { [Op.lte]: today } },
  });

  let created = 0;
  for (const tpl of due) {
    await FisheryCostEvent.create({
      event_uuid: uuidv4(),
      farmer_id: tpl.farmer_id,
      event_date: tpl.next_due_date,
      scope: tpl.scope,
      pond_id: tpl.pond_id,
      vessel_id: tpl.vessel_id,
      category: tpl.category,
      quantity: tpl.default_quantity,
      unit: tpl.default_unit,
      amount: tpl.default_amount,
      amount_formal: 0,
      amount_informal: 0,
      payment_mode: tpl.default_payment_mode,
      vendor_name: tpl.default_vendor,
      source_table: 'fishery_recurring_templates',
      source_event_uuid: tpl.template_uuid,
      is_recurring: true,
      is_pending: true,
      recurring_template_id: tpl.id,
      notes: `Auto-generated from recurring template: ${tpl.template_name}`,
    });
    const nextDue = nextDueFromFrequency(tpl.next_due_date, tpl.frequency);
    await tpl.update({ last_generated_date: tpl.next_due_date, next_due_date: nextDue });
    created += 1;
  }

  logger.info(`Fishery recurring cron: generated ${created} pending cost events`);
  return { created };
};

module.exports = {
  createTemplate, listTemplates, updateTemplate, deleteTemplate,
  generatePendingEventsForDueTemplates,
};
