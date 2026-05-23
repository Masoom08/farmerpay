import client from "../client";
import { API } from "../endpoints";

import {
  TransactionResponse,
} from "../../types/transaction.types";
import {
  CreateTransactionRequest,
  CreateTransactionResponse,
} from "../../types/transaction.types";

export const getTransactions = async (
  limit: number = 50
): Promise<TransactionResponse> => {

  const response = await client.get(
    `${API.SALES.RECORD}?limit=${limit}`
  );

  return response.data;
};

export const createTransaction =
  async (
    payload: CreateTransactionRequest
  ): Promise<CreateTransactionResponse> => {

    const response = await client.post(
      API.SALES.CREATE_TRANSACTION,
      payload
    );

    return response.data;
  };