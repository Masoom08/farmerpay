import client from "../client";
import { API } from "../endpoints";

import {
  VendorOnboardingPayload,
  VendorOnboardingResponse,
  UpdateVendorProfilePayload,
  UpdateVendorProfileResponse,
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

export const getVendorProfile = async () => {
  const response = await client.get(
    "/vyapar/profile"
  );

  console.log("profile", response.data.data )

  return response.data;
};

export const updateVendorProfile = async (
  payload: UpdateVendorProfilePayload
): Promise<UpdateVendorProfileResponse> => {
  try {
    console.log("UPDATE VENDOR REQUEST", payload);

    const response = await client.put(
      API.VENDOR.UPDATE_PROFILE,
      payload
    );

    console.log(
      "UPDATE VENDOR RESPONSE",
      response.data
    );

    return response.data.data;
  } catch (error: any) {
    console.log(
      "UPDATE VENDOR ERROR",
      error?.response || error
    );

    throw error;
  }
};