import { useState } from "react";
import { verifyOtp } from "../api/modules/auth.api";
import {
  VerifyOtpRequest,
  VerifyOtpResponse,
} from "../types/auth.types";

export const useVerifyOtp = () => {
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async (
    payload: VerifyOtpRequest
  ): Promise<VerifyOtpResponse> => {
    setLoading(true);

    try {
      const response = await verifyOtp(payload);

      if (!response.success) {
        throw new Error(response.message || "OTP verification failed");
      }

      return response;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleVerifyOtp,
  };
};