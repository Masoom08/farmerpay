/**
 * useDiceLoan — Custom hook for fetching DICE loan position.
 */
import { useState, useEffect, useCallback } from 'react';
import * as diceApi from '../services/diceApi';

export default function useDiceLoan(farmerId) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loans, setLoans] = useState([]);
  const [activeLoan, setActiveLoan] = useState(null);

  const fetchLoans = useCallback(async () => {
    if (!farmerId) return;
    try {
      setLoading(true);
      const res = await diceApi.fetchFarmerLoans(farmerId, { status: 'active' });
      const loanList = res.data || [];
      setLoans(loanList);
      setActiveLoan(loanList[0] || null);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load loan data');
    } finally {
      setLoading(false);
    }
  }, [farmerId]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  return { loading, error, loans, activeLoan, refetch: fetchLoans };
}
