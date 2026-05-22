import { useState } from "react";
import { login as loginApi } from "../api/modules/auth.api";
import { setUser } from "../lib/storage";
import {
  setAccessToken,
  setRefreshToken,
} from "../lib/secure-storage";
import { useAuth } from "./useAuth";

export const useLogin = () => {
  const [loading, setLoading] =
    useState(false);

  const { login } = useAuth();

  const handleLogin = async (
    mobile: string,
    mpin: string
  ) => {
    setLoading(true);

    try {
      const response = await loginApi({
        mobile,
        mpin,
      });

      if (
        !response.success ||
        !response.data?.accessToken
      ) {
        throw new Error(
          response.message || "Login failed"
        );
      }

      await setAccessToken(
        response.data.accessToken
      );

      await setRefreshToken(
        response.data.refreshToken
      );

      const user = {
        name: `${response.data.user.firstName || ""} ${
          response.data.user.lastName || ""
        }`.trim(),
        mobile: response.data.user.mobile,
        email: response.data.user.email,
        role: response.data.user.role,
      };

      await setUser(user);

      login(user);

      return response;

    } catch (error) {

      throw error;

    } finally {

      setLoading(false);
    }
  };

  return {
    loading,
    handleLogin,
  };
};