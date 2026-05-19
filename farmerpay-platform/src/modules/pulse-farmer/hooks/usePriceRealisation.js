/**
 * usePriceRealisation — Custom hook for the PULSE x DICE price realisation simulator.
 */
import { useState, useMemo } from 'react';
import { calculateScenario, determineOptimalStrategy } from '../services/realisationCalculator';

export default function usePriceRealisation({ loan, commodity, todayPrice, forecasts }) {
  const [quantity, setQuantity] = useState(10);
  const [transportCost, setTransportCost] = useState(500);
  const [storageCost, setStorageCost] = useState(3);

  const loanOutstanding = (loan?.principalOutstanding || 0) + (loan?.interestOutstanding || 0);
  const interestRate = loan?.interestRate || 7;
  const perishFactor = commodity?.storageFactor || 0.001;
  const mandiCharges = todayPrice * quantity * 0.015;

  const scenarios = useMemo(() => {
    const base = {
      quantity, loanOutstanding, interestRateAnnual: interestRate,
      perishabilityFactor: perishFactor, transportCost, mandiCharges,
      storageCostPerQtlPerDay: storageCost
    };

    return {
      sellNow: calculateScenario({ ...base, currentPrice: todayPrice, predictedPrice: todayPrice, daysStored: 0 }),
      store15: calculateScenario({ ...base, currentPrice: todayPrice, predictedPrice: forecasts?.day15?.predictedPrice || todayPrice, daysStored: 15 }),
      store30: calculateScenario({ ...base, currentPrice: todayPrice, predictedPrice: forecasts?.day30?.predictedPrice || todayPrice, daysStored: 30 })
    };
  }, [quantity, todayPrice, loanOutstanding, interestRate, perishFactor, transportCost, storageCost, mandiCharges, forecasts]);

  const optimal = useMemo(() => determineOptimalStrategy(scenarios, forecasts), [scenarios, forecasts]);

  return {
    quantity, setQuantity,
    transportCost, setTransportCost,
    storageCost, setStorageCost,
    loanOutstanding, interestRate, mandiCharges,
    scenarios, optimal
  };
}
