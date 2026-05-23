import { useCallback, useState } from "react";

import {
  getTransactions,
} from "../api/modules/transaction.api";

import { Transaction } from "../types/transaction.types";

export const useTransactions = () => {

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [loading, setLoading] =
    useState<boolean>(false);

  const [refreshing, setRefreshing] =
    useState<boolean>(false);

  const loadTransactions =
    useCallback(async () => {

      try {
        setLoading(true);

        const response =
          await getTransactions(50);

        if (
          response.success &&
          Array.isArray(response.data)
        ) {
          setTransactions(response.data);
        }

      } catch (error) {
        console.log(
          "Transactions Error",
          error
        );

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  return {
    transactions,
    loading,
    refreshing,
    setRefreshing,
    loadTransactions,
  };
};