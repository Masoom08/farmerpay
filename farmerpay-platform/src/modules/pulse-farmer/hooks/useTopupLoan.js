/**
 * useTopupLoan — Custom hook for post-harvest top-up loan flow.
 */
import { useState, useEffect, useCallback } from 'react';
import * as diceApi from '../services/diceApi';

export default function useTopupLoan({ farmerId, loan, commodity, forecasts, todayPrice }) {
  const [step, setStep] = useState('info'); // info | warehouse | apply | success
  const [eligibility, setEligibility] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [quantity, setQuantity] = useState(10);
  const [grade, setGrade] = useState('B');
  const [loading, setLoading] = useState(false);
  const [topupResult, setTopupResult] = useState(null);

  // Calculate eligibility client-side
  useEffect(() => {
    if (!todayPrice || !commodity) return;
    const produceValue = todayPrice * quantity;
    const maxLTV = 0.70;
    const maxLoan = produceValue * maxLTV;
    const baseRate = loan?.interestRate || 7;
    const subventionRate = 3;
    const effectiveRate = Math.max(baseRate - subventionRate, 4);
    const price30d = forecasts?.day30?.predictedPrice || todayPrice;
    const priceGainPercent = ((price30d - todayPrice) / todayPrice) * 100;
    const eligible = priceGainPercent > 2 && loan && (commodity?.shelfLifeDays || 90) > 30;

    setEligibility({
      eligible,
      produceValue: Math.round(produceValue),
      maxLoanAmount: Math.round(maxLoan),
      ltvRatio: maxLTV,
      interestRate: baseRate,
      subventionApplicable: true,
      effectiveRate,
      priceGainPercent: Math.round(priceGainPercent),
      expectedGain: Math.round((price30d - todayPrice) * quantity),
      shelfLifeDays: commodity?.shelfLifeDays || 90,
      perishabilityIndex: commodity?.perishabilityIndex || 3
    });
  }, [todayPrice, quantity, commodity, forecasts, loan]);

  const handleApply = useCallback(async (applicationData) => {
    try {
      setLoading(true);
      const result = await diceApi.applyPostharvestTopup({
        parentLoanApplicationId: loan.applicationId,
        commodityId: commodity.commodityId,
        produceQuantityQuintals: quantity,
        produceGrade: grade,
        warehouseId: selectedWarehouse.warehouseId,
        warehouseReceiptNumber: applicationData.warehouseReceiptNumber,
        requestedLoanAmount: applicationData.requestedAmount,
        requestedTenureDays: applicationData.tenure
      });
      if (result.success) {
        setTopupResult(result.data);
        setStep('success');
      }
    } catch (err) {
      console.error('Top-up application failed:', err);
    } finally {
      setLoading(false);
    }
  }, [loan, commodity, quantity, grade, selectedWarehouse]);

  return {
    step, setStep,
    eligibility,
    selectedWarehouse, setSelectedWarehouse,
    quantity, setQuantity,
    grade, setGrade,
    loading,
    topupResult,
    handleApply
  };
}
