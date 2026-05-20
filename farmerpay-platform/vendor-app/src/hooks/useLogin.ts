import { useState } from "react";
import { login } from "../api/modules/auth.api";
import { setToken, setUser } from "../lib/storage";

export const useLogin = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (mobile: string, mpin: string) => {
    setLoading(true);

    try {
      const response = await login({ mobile, mpin });

      if (!response.success || !response.data?.accessToken) {
        throw new Error(response.message || "Login failed");
      }

      await setToken(response.data.accessToken);

      await setUser({
        name: `${response.data.user.firstName || ""} ${
          response.data.user.lastName || ""
        }`.trim(),
        mobile: response.data.user.mobile,
        email: response.data.user.email,
        role: response.data.user.role,
      });

      return response;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleLogin,
  };
};