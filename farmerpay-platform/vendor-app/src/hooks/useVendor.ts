import { useState } from "react";

import { registerVendor } from "../api/modules/vendor.api";

import {
  VendorOnboardingPayload,
  VendorOnboardingResponse,
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