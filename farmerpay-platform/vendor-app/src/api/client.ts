import axios,{ AxiosError, InternalAxiosRequestConfig} from "axios";
import { Platform } from "react-native";
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearSecureAuth,
} from "../lib/secure-storage";

import { clearUser } from "../lib/storage";
import { API } from "./endpoints";

const API_BASE_URL =
  Platform.OS === "web"
    ? "/api/v1"
    : process.env.EXPO_PUBLIC_API_BASE_URL;

  // process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("API base URL is not defined");
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig
  ) => {
    const accessToken =
      await getAccessToken();

    if (accessToken) {
      config.headers.Authorization =
        `Bearer ${accessToken}`;
    }

    return config;
  },

  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest: any = error.config;
    // Token expired
    const isAuthRoute =
  originalRequest?.url?.includes("/auth/login") ||
  originalRequest?.url?.includes("/auth/register") ||
  originalRequest?.url?.includes("/auth/verify-otp") ||
  originalRequest?.url?.includes("/auth/set-mpin");

if (
  error.response?.status === 401 &&
  !originalRequest._retry &&
  !isAuthRoute
) {
      originalRequest._retry = true;

      try {
        const refreshToken = await getRefreshToken();

        if (!refreshToken) {
          throw new Error( "No refresh token found");
        }

        // Call refresh API
        const response = await axios.post(
          `${API_BASE_URL}${API.AUTH.REFRESH_TOKEN}`, { refreshToken,}
        );

        const newAccessToken =response.data.data.accessToken;

        // Save new token
        await setAccessToken( newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return client(originalRequest);

      } catch (refreshError) {
        await clearSecureAuth();
        await clearUser();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
