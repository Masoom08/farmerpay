/**
 * Goat Breeding Service — Breeding calendar, kidding tracking, reproductive efficiency.
 */
const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const GESTATION_DAYS = 150;

const recordService = async (doeId, data) => {
  const { GoatBreedingEvent, GoatAnimal } = getDb();
  const doe = await GoatAnimal.findByPk(doeId);
  if (!doe || doe.sex !== 'FEMALE') { const err = new Error('Doe not found'); err.statusCode = 404; throw err; }

  const serviceDate = new Date(data.serviceDate);
  const expectedKidding = new Date(serviceDate.getTime() + GESTATION_DAYS * 86400000);

  const event = await GoatBreedingEvent.create({
    uuid: generateUUID(), doe_id: doeId,
    buck_id: data.buckId || null,
    service_date: data.serviceDate,
    service_type: data.serviceType,
    expected_kidding_date: expectedKidding.toISOString().slice(0, 10),
    cost: data.cost || null,
  });

  return {
    eventId: event.id, doeId, serviceDate: data.serviceDate,
    expectedKiddingDate: event.expected_kidding_date, status: 'SERVICED',
  };
};

const recordKidding = async (eventId, data) => {
  const { GoatBreedingEvent, GoatAnimal, GoatHerd, sequelize } = getDb();
  const t = await sequelize.transaction();
  try {
    const event = await GoatBreedingEvent.findByPk(eventId, { transaction: t });
    if (!event) { const err = new Error('Breeding event not found'); err.statusCode = 404; throw err; }

    await event.update({
      actual_kidding_date: data.kiddingDate,
      kid_count: data.kidCount,
      kid_details: data.kidDetails || null,
      complications: data.complications || null,
      status: 'KIDDED',
    }, { transaction: t });

    // Auto-register kids if details provided
    if (data.kidDetails && Array.isArray(data.kidDetails)) {
      const doe = await GoatAnimal.findByPk(event.doe_id, { transaction: t });
      for (const kid of data.kidDetails) {
        await GoatAnimal.create({
          uuid: generateUUID(), herd_id: doe.herd_id,
          tag_id: kid.tagId || `K-${generateUUID().slice(0, 8)}`,
          name: kid.name || null, breed: doe.breed,
          sex: kid.sex || 'FEMALE', dob: data.kiddingDate,
          weight_kg: kid.birthWeightKg || null,
          dam_id: event.doe_id, sire_id: event.buck_id,
        }, { transaction: t });
      }

      const herd = await GoatHerd.findByPk(doe.herd_id, { transaction: t });
      if (herd) {
        await herd.update({ total_animals: herd.total_animals + data.kidDetails.length }, { transaction: t });
      }
    }

    await t.commit();
    return { eventId, status: 'KIDDED', kidCount: data.kidCount };
  } catch (err) { await t.rollback(); throw err; }
};

const getBreedingCalendar = async (herdId) => {
  const { GoatBreedingEvent, GoatAnimal } = getDb();
  const animals = await GoatAnimal.findAll({
    where: { herd_id: herdId, sex: 'FEMALE', status: 'ACTIVE', is_active: true },
    attributes: ['id'],
  });
  const doeIds = animals.map((a) => a.id);
  if (doeIds.length === 0) return [];

  const events = await GoatBreedingEvent.findAll({
    where: { doe_id: { [Op.in]: doeIds }, is_active: true },
    include: [{ model: GoatAnimal, as: 'doe', attributes: ['tag_id', 'name', 'breed'] }],
    order: [['expected_kidding_date', 'ASC']],
  });

  return events.map((e) => ({
    eventId: e.id, doeTagId: e.doe?.tag_id, doeName: e.doe?.name,
    serviceDate: e.service_date, serviceType: e.service_type,
    expectedKiddingDate: e.expected_kidding_date,
    actualKiddingDate: e.actual_kidding_date,
    kidCount: e.kid_count, status: e.status,
  }));
};

const getReproductiveEfficiency = async (herdId) => {
  const { GoatBreedingEvent, GoatAnimal } = getDb();
  const does = await GoatAnimal.findAll({
    where: { herd_id: herdId, sex: 'FEMALE', status: 'ACTIVE', is_active: true },
  });
  const doeIds = does.map((a) => a.id);
  if (doeIds.length === 0) return { totalDoes: 0, kiddingRate: 0, avgKidsPerKidding: 0 };

  const events = await GoatBreedingEvent.findAll({
    where: { doe_id: { [Op.in]: doeIds }, is_active: true },
  });

  const kidded = events.filter((e) => e.status === 'KIDDED');
  const totalKids = kidded.reduce((s, e) => s + (e.kid_count || 0), 0);
  const kiddingRate = events.length > 0 ? Math.round((kidded.length / events.length) * 100) : 0;
  const avgKids = kidded.length > 0 ? Math.round((totalKids / kidded.length) * 100) / 100 : 0;

  return { totalDoes: does.length, totalServices: events.length, successfulKiddings: kidded.length, kiddingRate, avgKidsPerKidding: avgKids, totalKidsBorn: totalKids };
};

module.exports = { recordService, recordKidding, getBreedingCalendar, getReproductiveEfficiency };
