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
  try {
    const response = await client.get(
      `${API.SALES.RECORD}?limit=${limit}`
    );

    console.log("TRANSACTIONS API RESPONSE");
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (err: any) {
    console.log("====== TRANSACTION API ERROR ======");
    console.log("STATUS:", err.response?.status);
    console.log("DATA:", err.response?.data);
    console.log("URL:", err.config?.url);
    console.log("BASE URL:", err.config?.baseURL);
    console.log("FULL ERROR:", err);
    console.log("==================================");

    throw err;
  }
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