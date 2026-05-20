import { useState } from "react";
import { register } from "../api/modules/auth.api";
import {
  RegisterRequest,
  RegisterResponse,
} from "../types/auth.types";

export const useRegister = () => {
  const [loading, setLoading] = useState(false);

  const handleRegister = async (
    payload: RegisterRequest
  ): Promise<RegisterResponse> => {
    setLoading(true);

    try {
      const response = await register(payload);

      if (!response.success || !response.data?.otpRequestId) {
        throw new Error(response.message || "Registration failed");
      }

      return response;
    } catch (error) {
      // Re-throw the original Axios error so register.tsx
      // can access error.response.data.errorCode.
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleRegister,
  };
};