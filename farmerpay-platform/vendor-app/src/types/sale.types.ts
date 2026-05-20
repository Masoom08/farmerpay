/**
 * Common API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

/**
 * Catalog Item
 */
export interface CatalogItem {
  input_item_id: number;
  input_pack_id: number;
  item_name?: string;
  pack_name?: string;
  vendor_selling_price: number;

  // Optional alternate keys returned by backend
  inputItemId?: number;
  inputPackId?: number;
  vendorSellingPrice?: number;
}

/**
 * Farmer
 */
export interface Farmer {
  id: number;
  name: string;
  mobile: string;
}

/**
 * Cart Item
 */
export interface CartItem {
  item: CatalogItem;
  quantity: number;
  price: number;
}

/**
 * Sale Item Payload
 */
export interface RecordSaleItemPayload {
  inputItemId: number;
  inputPackId: number;
  quantity: number;
}

/**
 * Record Sale Payload
 */
export interface RecordSalePayload {
  farmerId?: number | null;
  farmerMobile: string;
  transactionType: "cash_sale" | "credit_sale";
  transactionDate: string;
  season: "kharif" | "rabi" | "zaid";
  loan_application_id?: number | null;
  items: RecordSaleItemPayload[];
}

/**
 * Transaction
 */
export interface Transaction {
  id: number;
  transaction_number?: string;
  total_amount?: number;
  transactionType?: "cash_sale" | "credit_sale";
  transactionDate?: string;
  season?: "kharif" | "rabi" | "zaid";
  status?: string;
}

/**
 * API Response Types
 */
export type CatalogResponse = ApiResponse<CatalogItem[]>;
export type FarmerSearchResponse = ApiResponse<Farmer[]>;
export type RecordSaleResponse = ApiResponse<Transaction>;
export type TransactionDetailsResponse = ApiResponse<Transaction>;
export type UploadEvidenceResponse = ApiResponse<any>;
export type CancelTransactionResponse = ApiResponse<any>;