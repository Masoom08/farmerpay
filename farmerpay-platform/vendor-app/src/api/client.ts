import axios from "axios";
import { getToken, clearAuth } from "../lib/storage";

const client = axios.create({
  baseURL: "http://10.218.164.140:3000/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearAuth();
    }

    return Promise.reject(error);
  }
);

export default client;