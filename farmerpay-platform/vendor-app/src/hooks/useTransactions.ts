import { useCallback, useState } from "react";
import {getTransactions,createTransaction} from "../api/modules/transaction.api";
import { Transaction,CreateTransactionRequest } from "../types/transaction.types";

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [transactionCount, setTransactionCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);

      const response = await getTransactions(50);

      if (response.success && Array.isArray(response.data)) {
        setTransactions(response.data);
        setTransactionCount(response.meta?.total || 0);

        const revenue = response.data.reduce(
          (sum, tx) => sum + Number(tx.amount || 0),
          0
        );

        setTotalRevenue(revenue);
      }

    } catch (error) {
      console.log("Transactions Error", error);

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  return {
    transactions,
    transactionCount,
    totalRevenue,
    loading,
    refreshing,
    setRefreshing,
    loadTransactions,
  };
};

export const useCreateTransaction = () => {
  const [loading, setLoading] = useState(false);

  const handleCreateTransaction = async (
    payload: CreateTransactionRequest
  ) => {
    try {
      setLoading(true);

      const response = await createTransaction(payload);

      return response;

    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleCreateTransaction,
  };
};