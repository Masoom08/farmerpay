import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/storageKeys";

export const getToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
};

export const setToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
};

export const clearToken = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
};

export const setUser = async <T>(user: T): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

export const getUser = async <T>(): Promise<T | null> => {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.USER);
  return value ? JSON.parse(value) : null;
};

export const clearAuth = async (): Promise<void> => {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.TOKEN,
    STORAGE_KEYS.USER,
  ]);
};