/**
 * PULSE API Client — Handles all PULSE-related API calls.
 */

const API_BASE = '/api/v1';

function getHeaders(language = 'en') {
  const token = localStorage.getItem('auth_token');
  return {
    'Authorization': `Bearer ${token}`,
    'X-Language': language,
    'Content-Type': 'application/json'
  };
}

export async function fetchCommodities(language) {
  const res = await fetch(`${API_BASE}/pulse/commodities`, { headers: getHeaders(language) });
  return res.json();
}

export async function fetchMandis({ farmerId, stateId, districtId, lat, lng, radiusKm }, language) {
  const params = new URLSearchParams();
  if (farmerId) params.append('farmerId', farmerId);
  if (stateId) params.append('stateId', stateId);
  if (districtId) params.append('districtId', districtId);
  if (lat) params.append('lat', lat);
  if (lng) params.append('lng', lng);
  if (radiusKm) params.append('radiusKm', radiusKm);
  const res = await fetch(`${API_BASE}/pulse/mandis?${params}`, { headers: getHeaders(language) });
  return res.json();
}

export async function fetchLatestPrices({ commodityId, mandiId, days = 7 }, language) {
  const params = new URLSearchParams({ commodityId, mandiId, days });
  const res = await fetch(`${API_BASE}/pulse/prices/latest?${params}`, { headers: getHeaders(language) });
  return res.json();
}

export async function fetchPriceChart({ commodityId, mandiId, startDate, endDate }, language) {
  const params = new URLSearchParams({ commodityId, mandiId, startDate, endDate });
  const res = await fetch(`${API_BASE}/pulse/prices/chart?${params}`, { headers: getHeaders(language) });
  return res.json();
}

export async function fetchPriceForecast(commodityId, { mandiId, horizonDays = 7 }, language) {
  const params = new URLSearchParams({ mandiId, horizonDays });
  const res = await fetch(`${API_BASE}/pulse/price-forecast/${commodityId}?${params}`, { headers: getHeaders(language) });
  return res.json();
}

export async function fetchMsp(commodityId, { season, year }, language) {
  const params = new URLSearchParams();
  if (season) params.append('season', season);
  if (year) params.append('year', year);
  const res = await fetch(`${API_BASE}/pulse/msp/${commodityId}?${params}`, { headers: getHeaders(language) });
  return res.json();
}

export async function createFarmerPriceAlert({ commodityId, targetPrice, alertType }) {
  const res = await fetch(`${API_BASE}/pulse/farmer-price-alert`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ commodityId, targetPrice, alertType })
  });
  return res.json();
}

export async function fetchSellRecommendations(farmerId, { cycleId }, language) {
  const params = new URLSearchParams();
  if (cycleId) params.append('cycleId', cycleId);
  const res = await fetch(`${API_BASE}/pulse/sell-recommendations/${farmerId}?${params}`, { headers: getHeaders(language) });
  return res.json();
}

export async function fetchPriceRealisation(farmerId, { loanApplicationId, commodityId, quantityQuintals, mandiId }) {
  const params = new URLSearchParams({ loanApplicationId, commodityId, quantityQuintals, mandiId });
  const res = await fetch(`${API_BASE}/pulse/price-realisation/${farmerId}?${params}`, { headers: getHeaders() });
  return res.json();
}

export async function fetchCyclePulseRealisation(cycleId, language) {
  const res = await fetch(`${API_BASE}/roots/cycles/${cycleId}/pulse-realisation`, { headers: getHeaders(language) });
  return res.json();
}
