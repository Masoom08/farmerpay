/**
 * DICE API Client — Handles loan-related and post-harvest top-up API calls.
 */

const API_BASE = '/api/v1';

function getHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export async function fetchFarmerLoans(farmerId, { status } = {}) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const res = await fetch(`${API_BASE}/dice/applications?${params}`, { headers: getHeaders() });
  return res.json();
}

export async function applyPostharvestTopup(data) {
  const res = await fetch(`${API_BASE}/dice/postharvest-topup/apply`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchTopupDetails(topupId) {
  const res = await fetch(`${API_BASE}/dice/postharvest-topup/${topupId}`, { headers: getHeaders() });
  return res.json();
}

export async function fetchFarmerTopups(farmerId) {
  const res = await fetch(`${API_BASE}/dice/postharvest-topup/farmer/${farmerId}`, { headers: getHeaders() });
  return res.json();
}

export async function releaseTopupProduce(topupId, data) {
  const res = await fetch(`${API_BASE}/dice/postharvest-topup/${topupId}/release`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchWarehouses({ districtId, stateId, enwr, coldStorage }) {
  const params = new URLSearchParams();
  if (districtId) params.append('districtId', districtId);
  if (stateId) params.append('stateId', stateId);
  if (enwr) params.append('enwr', 'true');
  if (coldStorage) params.append('coldStorage', 'true');
  const res = await fetch(`${API_BASE}/dice/warehouses?${params}`, { headers: getHeaders() });
  return res.json();
}
