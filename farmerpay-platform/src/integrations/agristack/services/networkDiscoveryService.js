/**
 * AgriStack Network Discovery Service — STUB (P0)
 *
 * #25 Service discovery → Discover available AgriStack services and entities
 *     POST /nm/serviceInfo → Get info about a specific AgriStack service
 *     POST /nm/getEntities → Get list of entities (states, registries)
 *
 * Used at startup to detect which AgriStack services are live in which states.
 */

const logger = require('../../../shared/utils/logger');
const config = require('../config/agristackConfig');
const client = require('./agristackClient');

const getServiceInfo = async (serviceId) => {
  return client.callApi('serviceDiscovery', { service_id: serviceId });
};

const getEntities = async (entityType) => {
  return client.callApi('getEntities', { entity_type: entityType });
};

const discoverAvailableServices = async () => {
  // Call NM to discover which services are available
  // Update feature flags based on response
  const services = await getEntities('services');
  if (!services) {
    logger.info('AgriStack: service discovery unavailable — all features remain disabled');
    return [];
  }
  return services;
};

module.exports = { getServiceInfo, getEntities, discoverAvailableServices };
