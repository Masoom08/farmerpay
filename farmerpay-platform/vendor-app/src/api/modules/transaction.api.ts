import client from "../client";
import { API } from "../endpoints";

import {
  TransactionResponse,
} from "../../types/transaction.types";

export const getTransactions = async (
  limit: number = 50
): Promise<TransactionResponse> => {

  const response = await client.get(
    `${API.SALES.RECORD}?limit=${limit}`
  );

  return response.data;
};