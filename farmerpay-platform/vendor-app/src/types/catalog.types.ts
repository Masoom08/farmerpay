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
}

export interface AddCatalogPayload {
  itemId: string;
  packId: string;
  mrp: number;
  sellingPrice: number;
  stock: number;
}

export interface UpdateStockPayload {
  stockQuantity: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

export type CatalogResponse =
  ApiResponse<CatalogItem[]>;

export type AddCatalogResponse =
  ApiResponse<{
    catalogId: number;
  }>;