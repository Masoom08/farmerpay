import { useState } from "react";
import { setMpin } from "../api/modules/auth.api";
import {
  SetMpinRequest,
  SetMpinResponse,
} from "../types/auth.types";

export const useSetMpin = () => {
  const [loading, setLoading] = useState(false);

  const handleSetMpin = async (
    payload: SetMpinRequest
  ): Promise<SetMpinResponse> => {
    setLoading(true);

    try {
      const response = await setMpin(payload);

      if (!response.success) {
        throw new Error(response.message || "Failed to set MPIN");
      }

      return response;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleSetMpin,
  };
};