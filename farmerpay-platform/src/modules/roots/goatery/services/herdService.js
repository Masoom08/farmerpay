/**
 * Goat Herd Service — CRUD and composition analytics.
 */
const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const createHerd = async (farmerId, data) => {
  const { GoatHerd } = getDb();
  const herd = await GoatHerd.create({
    uuid: generateUUID(), farmer_id: farmerId,
    herd_name: data.herdName, herd_type: data.herdType,
    primary_breed: data.primaryBreed || null,
    location_village: data.locationVillage || null,
    farm_register_id: data.farmRegisterId || null,
    total_animals: 0,
  });
  logger.info(`Goat herd created: ${herd.uuid}, farmer: ${farmerId}`);
  return mapHerdDto(herd);
};

const getHerdById = async (herdId) => {
  const { GoatHerd, GoatAnimal } = getDb();
  const { Op } = require('sequelize');
  const herd = await GoatHerd.findByPk(herdId);
  if (!herd || !herd.is_active) { const err = new Error('Herd not found'); err.statusCode = 404; throw err; }

  // Composition
  const animals = await GoatAnimal.findAll({ where: { herd_id: herdId, is_active: true, status: 'ACTIVE' } });
  const males = animals.filter((a) => a.sex === 'MALE').length;
  const females = animals.filter((a) => a.sex === 'FEMALE').length;

  return { ...mapHerdDto(herd), composition: { total: animals.length, males, females } };
};

const listFarmerHerds = async (farmerId) => {
  const { GoatHerd } = getDb();
  const herds = await GoatHerd.findAll({
    where: { farmer_id: farmerId, is_active: true },
    order: [['created_at', 'DESC']],
  });
  return herds.map(mapHerdDto);
};

const updateHerd = async (herdId, data) => {
  const { GoatHerd } = getDb();
  const herd = await GoatHerd.findByPk(herdId);
  if (!herd || !herd.is_active) { const err = new Error('Herd not found'); err.statusCode = 404; throw err; }
  const updates = {};
  if (data.herdName !== undefined) updates.herd_name = data.herdName;
  if (data.herdType !== undefined) updates.herd_type = data.herdType;
  if (data.primaryBreed !== undefined) updates.primary_breed = data.primaryBreed;
  if (data.locationVillage !== undefined) updates.location_village = data.locationVillage;
  await herd.update(updates);
  return mapHerdDto(herd);
};

const mapHerdDto = (herd) => ({
  herdId: herd.id, herdUuid: herd.uuid, farmerId: herd.farmer_id,
  herdName: herd.herd_name, herdType: herd.herd_type,
  primaryBreed: herd.primary_breed, locationVillage: herd.location_village,
  totalAnimals: herd.total_animals, status: herd.status,
  createdAt: herd.created_at,
});

module.exports = { createHerd, getHerdById, listFarmerHerds, updateHerd };
