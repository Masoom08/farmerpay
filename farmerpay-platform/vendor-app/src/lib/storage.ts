import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/storageKeys";

export const setUser = async <T>(
  user: T
): Promise<void> => {
  await AsyncStorage.setItem(
    STORAGE_KEYS.USER,
    JSON.stringify(user)
  );
};

export const getUser = async <T>(): Promise<T | null> => {
  const value = await AsyncStorage.getItem(
    STORAGE_KEYS.USER
  );

  return value ? JSON.parse(value) : null;
};

export const clearUser = async (): Promise<void> => {
  await AsyncStorage.removeItem(
    STORAGE_KEYS.USER
  );
};