import client from "../client";
import { API } from "../endpoints";

import type { FarmerSearchResponse } from "../../types/sale.types";

/**
 * Search vendor's farmers by name or mobile
 * GET /vyapar/farmer/my-farmers?search=...
 */
export const searchFarmers = async (
  search: string
): Promise<FarmerSearchResponse> => {
  const response = await client.get<FarmerSearchResponse>(
    API.FARMERS.MY_FARMERS,
    {
      params: {
        search,
      },
    }
  );

  return response.data;
};