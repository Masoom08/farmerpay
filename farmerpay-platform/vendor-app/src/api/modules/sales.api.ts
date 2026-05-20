import client from "../client";
import { API } from "../endpoints";

import type {
  CatalogResponse,
  RecordSalePayload,
  RecordSaleResponse,
  FarmerSearchResponse,
  UploadEvidenceResponse,
  CancelTransactionResponse,
  TransactionDetailsResponse,
} from "../../types/sale.types";

/**
 * Fetch vendor catalog items
 */
export const getCatalog = async (): Promise<CatalogResponse> => {
  const response = await client.get<CatalogResponse>(API.SALES.CATALOG);
  return response.data;
};

/**
 * Search farmers by name or mobile
 */
export const searchFarmers = async (
  search: string
): Promise<FarmerSearchResponse> => {
  const response = await client.get<FarmerSearchResponse>(
    API.FARMERS.MY_FARMERS,
    {
      params: { search },
    }
  );

  return response.data;
};

/**
 * Record a sale transaction
 */
export const recordSale = async (
  payload: RecordSalePayload
): Promise<RecordSaleResponse> => {
  const response = await client.post<RecordSaleResponse>(
    API.SALES.RECORD,
    payload
  );

  return response.data;
};

/**
 * Get transaction details
 */
export const getTransactionDetails = async (
  transactionId: string | number
): Promise<TransactionDetailsResponse> => {
  const response = await client.get<TransactionDetailsResponse>(
    API.SALES.DETAILS(transactionId)
  );

  return response.data;
};

/**
 * Upload receipt/evidence
 */
export const uploadTransactionEvidence = async (
  transactionId: string | number,
  formData: FormData
): Promise<UploadEvidenceResponse> => {
  const response = await client.post<UploadEvidenceResponse>(
    API.SALES.UPLOAD_EVIDENCE(transactionId),
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

/**
 * Cancel transaction
 */
export const cancelTransaction = async (
  transactionId: string | number
): Promise<CancelTransactionResponse> => {
  const response = await client.post<CancelTransactionResponse>(
    API.SALES.CANCEL(transactionId)
  );

  return response.data;
};