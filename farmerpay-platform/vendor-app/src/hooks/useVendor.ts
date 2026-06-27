import { useState } from "react";
import { registerVendor, updateVendorProfile  } from "../api/modules/vendor.api";
import {
  VendorOnboardingPayload,
  VendorOnboardingResponse,
  UpdateVendorProfilePayload 
} from "../types/vendor.types";

export const useVendor = () => {
  const [loading, setLoading] = useState(false);

  const handleVendorOnboarding = async (
    payload: VendorOnboardingPayload
  ): Promise<VendorOnboardingResponse> => {
    try {
      setLoading(true);

      const response =
        await registerVendor(payload);

      return response;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleVendorOnboarding,
  };
};

export const useUpdateVendorProfile = () => {
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (
    payload: UpdateVendorProfilePayload
  ) => {
    try {
      setLoading(true);
      return await updateVendorProfile(payload);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleUpdateProfile,
  };
};