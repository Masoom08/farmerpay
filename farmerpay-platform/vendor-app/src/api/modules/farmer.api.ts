import client from "../client";
import { API } from "../endpoints";

import type { FarmerSearchResponse, } from "../../types/sale.types";
import type { 
  RegisterFarmerPayload,
  RegisterFarmerResponse,
  MyFarmersResponse,
} from "../../types/farmer.types";
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

export const farmerApi = {
  /**
   * Register farmer
   */
  async registerFarmer(
    payload: RegisterFarmerPayload
  ) {
    const response =
      await client.post<RegisterFarmerResponse>(
        API.FARMERS.CREATE,
        payload
      );

    return response.data.data;
  },

  /**
   * Get vendor farmers
   */
  async getMyFarmers() {
    const response =
      await client.get<MyFarmersResponse>(
        API.FARMERS.MY_FARMERS
      );

    return response.data.data;
  },
};