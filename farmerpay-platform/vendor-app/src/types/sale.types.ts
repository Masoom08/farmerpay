import type { Farmer } from "./farmer.types";

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
/**
 * Catalog Item
 */
export interface CatalogItem {
  id: number;
  vendor_id: number;

  input_item_id: string;
  input_pack_id: string;

  mrp_rupees: string;
  vendor_selling_price: string;

  stock_quantity: number;

  last_stock_update_date: string;

  availability_status:
    | "in_stock"
    | "low_stock"
    | "out_of_stock";

  is_active: boolean;

  createdAt: string;
  updatedAt: string;

  // Optional frontend-friendly aliases
  item_name?: string;
  pack_name?: string;

  inputItemId?: string;
  inputPackId?: string;

  mrpRupees?: string;
  vendorSellingPrice?: string;

  stockQuantity?: number;
  availabilityStatus?:
    | "in_stock"
    | "low_stock"
    | "out_of_stock";

  catalogId?: number;
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
   category: string;
  unitPrice: number;
}

/**
 * Record Sale Payload
 */
export interface RecordSalePayload {
  farmerId: number;

  transactionType:
    | "cash_sale"
    | "credit_sale"
    | "cash_credit_sale"
    | "return"
    | "exchange";

  loanApplicationId?: number | null;

  items: RecordSaleItemPayload[];
}

/**
 * Transaction
 */
export interface Transaction {
  transactionId: number;
  transactionUuid: string;
  amount: number;
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