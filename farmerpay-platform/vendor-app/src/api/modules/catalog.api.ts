import client from "../client";
import { API } from "../endpoints";

import type {
  CatalogResponse,
  AddCatalogPayload,
  AddCatalogResponse,
  UpdateStockPayload,
} from "../../types/catalog.types";

/**
 * Get catalog
 */
export const getCatalog =
  async (): Promise<CatalogResponse> => {
    const response = await client.get(
      API.SALES.CATALOG
    );

    return response.data;
  };

/**
 * Add catalog item
 */
export const addCatalogItem =
  async (
    payload: AddCatalogPayload
  ): Promise<AddCatalogResponse> => {
    const response = await client.post(
      API.SALES.CATALOG,
      payload
    );

    return response.data;
  };

/**
 * Update stock
 */
export const updateCatalogStock =
  async (
    catalogId: number,
    payload: UpdateStockPayload
  ) => {
    const response = await client.put(
      `${API.SALES.CATALOG}/${catalogId}`,
      payload
    );

    return response.data;
  };