import client from "../client";
import { API } from "../endpoints";

import {
  VendorOnboardingPayload,
  VendorOnboardingResponse,
} from "../../types/vendor.types";

export const registerVendor = async (
  payload: VendorOnboardingPayload
): Promise<VendorOnboardingResponse> => {
  try {
    console.log("REGISTER VENDOR REQUEST");

    const response = await client.post(
      API.VENDOR.REGISTER,
      payload
    );

    console.log("REGISTER VENDOR RESPONSE", response.data);

    return response.data.data;
  } catch (error: any) {
    console.log("REGISTER VENDOR FULL ERROR", error);
    console.log("REGISTER VENDOR MESSAGE", error?.message);
    console.log("REGISTER VENDOR CODE", error?.code);
    console.log("REGISTER VENDOR RESPONSE", error?.response);

    throw error;
  }
};

// src/api/modules/vendor.api.ts

export const getVendorProfile = async () => {
  const response = await client.get(
    "/vyapar/profile"
  );

  return response.data.data;
};