/**
 * Goat Health Service — Vaccination schedule, disease tracking, deworming calendar.
 */
const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const createHealthEvent = async (herdId, data) => {
  const { GoatHealthEvent } = getDb();
  const event = await GoatHealthEvent.create({
    uuid: generateUUID(), herd_id: herdId,
    animal_id: data.animalId || null,
    event_date: data.eventDate, event_type: data.eventType,
    vaccine_name: data.vaccineName || null, disease_name: data.diseaseName || null,
    medicine_name: data.medicineName || null, vet_name: data.vetName || null,
    cost: data.cost || null, animals_affected: data.animalsAffected || null,
    notes: data.notes || null,
  });
  return { eventId: event.id, eventUuid: event.uuid };
};

const getHealthEvents = async (herdId, filters = {}) => {
  const { GoatHealthEvent } = getDb();
  const where = { herd_id: herdId, is_active: true };
  if (filters.eventType) where.event_type = filters.eventType;
  if (filters.animalId) where.animal_id = filters.animalId;

  return GoatHealthEvent.findAll({ where, order: [['event_date', 'DESC']] });
};

const getVaccinationSchedule = async (herdId) => {
  const { GoatHealthEvent, GoatPopTemplate, GoatAnimal } = getDb();

  // Get last vaccination per animal
  const lastVaccinations = await GoatHealthEvent.findAll({
    where: { herd_id: herdId, event_type: 'VACCINATION', is_active: true },
    order: [['event_date', 'DESC']],
  });

  // Get last deworming
  const lastDewormings = await GoatHealthEvent.findAll({
    where: { herd_id: herdId, event_type: 'DEWORMING', is_active: true },
    order: [['event_date', 'DESC']],
  });

  // Get PoP templates for deworming interval
  const templates = await GoatPopTemplate.findAll({ where: { is_active: true }, limit: 1 });
  const dewormingInterval = templates[0]?.deworming_interval_days || 90;

  const today = new Date();
  const overdue = [];

  // Check deworming
  if (lastDewormings.length > 0) {
    const lastDate = new Date(lastDewormings[0].event_date);
    const daysSince = Math.round((today - lastDate) / 86400000);
    if (daysSince > dewormingInterval) {
      overdue.push({ type: 'DEWORMING', daysSinceLast: daysSince, intervalDays: dewormingInterval });
    }
  } else {
    overdue.push({ type: 'DEWORMING', daysSinceLast: null, intervalDays: dewormingInterval, message: 'No deworming recorded' });
  }

  return { overdue, lastVaccinationDate: lastVaccinations[0]?.event_date || null, lastDewormingDate: lastDewormings[0]?.event_date || null, dewormingInterval };
};

module.exports = { createHealthEvent, getHealthEvents, getVaccinationSchedule };
