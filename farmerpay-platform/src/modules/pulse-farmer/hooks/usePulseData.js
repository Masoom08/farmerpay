/**
 * usePulseData — Custom hook for fetching PULSE market data.
 */
import { useState, useEffect, useCallback } from 'react';
import * as pulseApi from '../services/pulseApi';

export default function usePulseData({ farmerId, activeCycleId, commodity, mandi, language = 'en' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [mandis, setMandis] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const fetchData = useCallback(async () => {
    if (!commodity || !mandi) return;
    try {
      setLoading(true);
      const [priceRes, f7Res, f15Res, f30Res, recRes] = await Promise.all([
        pulseApi.fetchLatestPrices({ commodityId: commodity.commodityId, mandiId: mandi.mandiId, days: 30 }, language),
        pulseApi.fetchPriceForecast(commodity.commodityId, { mandiId: mandi.mandiId, horizonDays: 7 }, language),
        pulseApi.fetchPriceForecast(commodity.commodityId, { mandiId: mandi.mandiId, horizonDays: 15 }, language),
        pulseApi.fetchPriceForecast(commodity.commodityId, { mandiId: mandi.mandiId, horizonDays: 30 }, language),
        pulseApi.fetchSellRecommendations(farmerId, { cycleId: activeCycleId }, language)
      ]);

      setPriceData(priceRes.data);
      setForecastData({ day7: f7Res.data, day15: f15Res.data, day30: f30Res.data });
      setRecommendations(recRes.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  }, [farmerId, activeCycleId, commodity, mandi, language]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { loading, error, priceData, forecastData, mandis, recommendations, refetch: fetchData };
}
