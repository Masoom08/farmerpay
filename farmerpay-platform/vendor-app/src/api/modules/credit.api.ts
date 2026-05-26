import client from "../client";
import { API } from "../endpoints";

export const getCreditLedger = async () => {
  const response = await client.get(
    API.CREDIT.LIST
  );

  return response.data;
};

export const recordPayment = async (
  farmerId: number | string,
  payload: {
    amount: number;
    paymentDate: string;
  }
) => {
  const response = await client.post(
    API.CREDIT.RECORD_PAYMENT(farmerId),
    payload
  );

  return response.data;
};