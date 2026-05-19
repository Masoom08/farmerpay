/**
 * Goat Economics Service — Cost/revenue per animal, herd P&L, NPV estimate.
 */
let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const getHerdEconomics = async (herdId) => {
  const { GoatHerd, GoatAnimal, GoatCostEvent, GoatRevenueEvent } = getDb();

  const herd = await GoatHerd.findByPk(herdId);
  if (!herd) { const err = new Error('Herd not found'); err.statusCode = 404; throw err; }

  const costs = await GoatCostEvent.findAll({ where: { herd_id: herdId, is_active: true } });
  const revenues = await GoatRevenueEvent.findAll({ where: { herd_id: herdId, is_active: true } });
  const animals = await GoatAnimal.findAll({ where: { herd_id: herdId, is_active: true, status: 'ACTIVE' } });

  const totalCost = costs.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
  const totalRevenue = revenues.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0);
  const activeCount = animals.length;
  const netProfit = totalRevenue - totalCost;

  // Cost breakdown by category
  const costByCategory = {};
  costs.forEach((c) => { costByCategory[c.category] = (costByCategory[c.category] || 0) + parseFloat(c.amount || 0); });

  // Revenue breakdown
  const revenueByCategory = {};
  revenues.forEach((r) => { revenueByCategory[r.category] = (revenueByCategory[r.category] || 0) + parseFloat(r.total_amount || 0); });

  return {
    herdId, totalAnimals: activeCount,
    totalCost: Math.round(totalCost * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    costPerAnimal: activeCount > 0 ? Math.round((totalCost / activeCount) * 100) / 100 : 0,
    revenuePerAnimal: activeCount > 0 ? Math.round((totalRevenue / activeCount) * 100) / 100 : 0,
    profitPerAnimal: activeCount > 0 ? Math.round((netProfit / activeCount) * 100) / 100 : 0,
    costByCategory,
    revenueByCategory,
  };
};

module.exports = { getHerdEconomics };
