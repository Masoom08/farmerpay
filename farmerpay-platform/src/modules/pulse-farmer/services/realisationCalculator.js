/**
 * Client-side calculation engine for price realisation scenarios.
 * Used for instant UI updates before server-side confirmation.
 */

/**
 * Calculate a single sell/store scenario.
 * @param {Object} params
 * @returns {Object}
 */
export function calculateScenario({
  quantity, currentPrice, predictedPrice, daysStored,
  storageCostPerQtlPerDay, loanOutstanding, interestRateAnnual,
  perishabilityFactor, transportCost, mandiCharges
}) {
  const effectiveQty = quantity * (1 - (perishabilityFactor * daysStored));
  const grossRealisation = predictedPrice * effectiveQty;
  const storageCost = storageCostPerQtlPerDay * quantity * daysStored;
  const interestAccrued = loanOutstanding * (interestRateAnnual / 100) * (daysStored / 365);
  const spoilageLoss = (quantity - effectiveQty) * predictedPrice;
  const netRealisation = grossRealisation - storageCost - interestAccrued - transportCost - mandiCharges;
  const surplusDeficit = netRealisation - loanOutstanding;
  const surplusDeficitPercent = loanOutstanding > 0 ? (surplusDeficit / loanOutstanding) * 100 : 0;

  return {
    effectiveQty: Math.round(effectiveQty * 100) / 100,
    grossRealisation: Math.round(grossRealisation),
    storageCost: Math.round(storageCost),
    interestAccrued: Math.round(interestAccrued),
    spoilageLoss: Math.round(spoilageLoss),
    transportCost: Math.round(transportCost),
    mandiCharges: Math.round(mandiCharges),
    netRealisation: Math.round(netRealisation),
    loanRepayment: Math.round(loanOutstanding),
    surplusDeficit: Math.round(surplusDeficit),
    surplusDeficitPercent: Math.round(surplusDeficitPercent)
  };
}

/**
 * Determine optimal strategy using confidence-weighted net realisation.
 * @param {Object} scenarios - { sellNow, store15, store30 }
 * @param {Object} forecasts - forecast data with confidence
 * @returns {{ key: string, net: number, confidence: number, weighted: number }}
 */
export function determineOptimalStrategy(scenarios, forecasts) {
  const nets = [
    { key: 'sellNow', net: scenarios.sellNow.netRealisation, confidence: 100 },
    { key: 'store15', net: scenarios.store15.netRealisation, confidence: forecasts?.day15?.confidence || 50 },
    { key: 'store30', net: scenarios.store30.netRealisation, confidence: forecasts?.day30?.confidence || 40 }
  ];
  const weighted = nets.map(n => ({ ...n, weighted: n.net * (n.confidence / 100) }));
  weighted.sort((a, b) => b.weighted - a.weighted);
  return weighted[0];
}
