import client from "../client";

import { API } from "../endpoints";

import {
  RatingsResponse,
} from "../../types/rating.types";

export const getRatings =
  async (): Promise<RatingsResponse> => {

    const response =
      await client.get(
        API.RATINGS.LIST
      );

    return response.data;
};