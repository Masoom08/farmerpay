/**
 * Goat Animal Service — Individual animal lifecycle management.
 */
const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const registerAnimal = async (herdId, data) => {
  const { GoatAnimal, GoatHerd, sequelize } = getDb();
  const t = await sequelize.transaction();
  try {
    const herd = await GoatHerd.findByPk(herdId, { transaction: t });
    if (!herd || !herd.is_active) { const err = new Error('Herd not found'); err.statusCode = 404; throw err; }

    const animal = await GoatAnimal.create({
      uuid: generateUUID(), herd_id: herdId,
      tag_id: data.tagId, name: data.name || null,
      breed: data.breed || herd.primary_breed || null,
      sex: data.sex, dob: data.dob || null,
      approximate_age_months: data.approximateAgeMonths || null,
      weight_kg: data.weightKg || null,
      dam_id: data.damId || null, sire_id: data.sireId || null,
      purchase_date: data.purchaseDate || null,
      purchase_cost: data.purchaseCost || null,
      source: data.source || null,
      photo_url: data.photoUrl || null,
      notes: data.notes || null,
    }, { transaction: t });

    await herd.update({ total_animals: herd.total_animals + 1 }, { transaction: t });
    await t.commit();

    logger.info(`Goat registered: ${animal.uuid} in herd ${herdId}`);
    return mapAnimalDto(animal);
  } catch (err) { await t.rollback(); throw err; }
};

const listHerdAnimals = async (herdId, filters = {}) => {
  const { GoatAnimal } = getDb();
  const where = { herd_id: herdId, is_active: true };
  if (filters.status) where.status = filters.status;
  if (filters.sex) where.sex = filters.sex;

  const animals = await GoatAnimal.findAll({ where, order: [['tag_id', 'ASC']] });
  return animals.map(mapAnimalDto);
};

const updateAnimalWeight = async (animalId, weightKg) => {
  const { GoatAnimal, GoatGrowthLog } = getDb();
  const animal = await GoatAnimal.findByPk(animalId);
  if (!animal || !animal.is_active) { const err = new Error('Animal not found'); err.statusCode = 404; throw err; }

  await animal.update({ weight_kg: weightKg });
  await GoatGrowthLog.create({
    uuid: generateUUID(), animal_id: animalId,
    log_date: new Date().toISOString().slice(0, 10),
    weight_kg: weightKg,
  });
  return mapAnimalDto(animal);
};

const markSold = async (animalId, data) => {
  const { GoatAnimal, GoatHerd, sequelize } = getDb();
  const t = await sequelize.transaction();
  try {
    const animal = await GoatAnimal.findByPk(animalId, { transaction: t });
    if (!animal || !animal.is_active) { const err = new Error('Animal not found'); err.statusCode = 404; throw err; }

    await animal.update({ status: 'SOLD', status_date: data.saleDate || new Date().toISOString().slice(0, 10) }, { transaction: t });
    const herd = await GoatHerd.findByPk(animal.herd_id, { transaction: t });
    if (herd) await herd.update({ total_animals: Math.max(0, herd.total_animals - 1) }, { transaction: t });
    await t.commit();
    return mapAnimalDto(animal);
  } catch (err) { await t.rollback(); throw err; }
};

const markDead = async (animalId, data) => {
  const { GoatAnimal, GoatHerd, sequelize } = getDb();
  const t = await sequelize.transaction();
  try {
    const animal = await GoatAnimal.findByPk(animalId, { transaction: t });
    if (!animal || !animal.is_active) { const err = new Error('Animal not found'); err.statusCode = 404; throw err; }

    await animal.update({ status: 'DEAD', status_date: data.deathDate || new Date().toISOString().slice(0, 10), notes: data.cause || animal.notes }, { transaction: t });
    const herd = await GoatHerd.findByPk(animal.herd_id, { transaction: t });
    if (herd) await herd.update({ total_animals: Math.max(0, herd.total_animals - 1) }, { transaction: t });
    await t.commit();
    return mapAnimalDto(animal);
  } catch (err) { await t.rollback(); throw err; }
};

const mapAnimalDto = (a) => ({
  animalId: a.id, animalUuid: a.uuid, herdId: a.herd_id,
  tagId: a.tag_id, name: a.name, breed: a.breed, sex: a.sex,
  dob: a.dob, approximateAgeMonths: a.approximate_age_months,
  weightKg: a.weight_kg ? parseFloat(a.weight_kg) : null,
  damId: a.dam_id, sireId: a.sire_id,
  purchaseDate: a.purchase_date, purchaseCost: a.purchase_cost ? parseFloat(a.purchase_cost) : null,
  source: a.source, status: a.status, statusDate: a.status_date,
  photoUrl: a.photo_url, notes: a.notes,
});

module.exports = { registerAnimal, listHerdAnimals, updateAnimalWeight, markSold, markDead };
