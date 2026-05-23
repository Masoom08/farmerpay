import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SECURE_STORAGE_KEYS } from "../constants/storageKeys";

const isWeb = Platform.OS === "web";

const ACCESS_TOKEN =
  "access_token";

const REFRESH_TOKEN =
  "refresh_token";

const MPIN_ENABLED =
  "mpin_enabled";

// ACCESS TOKEN

export const setAccessToken = async (
  token: string
): Promise<void> => {

  if (isWeb) {
    localStorage.setItem(
      SECURE_STORAGE_KEYS.ACCESS_TOKEN,
      token
    );
    return;
  }

  await SecureStore.setItemAsync(
    SECURE_STORAGE_KEYS.ACCESS_TOKEN,
    token
  );
};

export const getAccessToken = async (): Promise<string | null> => {

  if (isWeb) {
    return localStorage.getItem(
      SECURE_STORAGE_KEYS.ACCESS_TOKEN
    );
  }

  return await SecureStore.getItemAsync(
    SECURE_STORAGE_KEYS.ACCESS_TOKEN
  );
};

// REFRESH TOKEN

export const setRefreshToken = async (
  token: string
): Promise<void> => {

  if (isWeb) {
    localStorage.setItem(
      SECURE_STORAGE_KEYS.REFRESH_TOKEN,
      token
    );
    return;
  }

  await SecureStore.setItemAsync(
    SECURE_STORAGE_KEYS.REFRESH_TOKEN,
    token
  );
};

export const getRefreshToken = async (): Promise<string | null> => {

  if (isWeb) {
    return localStorage.getItem(
      SECURE_STORAGE_KEYS.REFRESH_TOKEN
    );
  }

  return await SecureStore.getItemAsync(
    SECURE_STORAGE_KEYS.REFRESH_TOKEN
  );
};

// CLEAR AUTH

export const clearSecureAuth = async (): Promise<void> => {

  if (isWeb) {
    localStorage.removeItem(
      SECURE_STORAGE_KEYS.ACCESS_TOKEN
    );

    localStorage.removeItem(
      SECURE_STORAGE_KEYS.REFRESH_TOKEN
    );

    localStorage.removeItem(
      SECURE_STORAGE_KEYS.MPIN_ENABLED
    );

    return;
  }

  await SecureStore.deleteItemAsync(
    SECURE_STORAGE_KEYS.ACCESS_TOKEN
  );

  await SecureStore.deleteItemAsync(
    SECURE_STORAGE_KEYS.REFRESH_TOKEN
  );

  await SecureStore.deleteItemAsync(
    SECURE_STORAGE_KEYS.MPIN_ENABLED
  );
};

// MPIN ENABLED

export const setMpinEnabled = async (
  enabled: boolean
): Promise<void> => {
  const value = JSON.stringify(enabled);

  if (isWeb) {
    
    localStorage.setItem(
      SECURE_STORAGE_KEYS.MPIN_ENABLED,
      value
    );

    return;
  }

  await SecureStore.setItemAsync(
    SECURE_STORAGE_KEYS.MPIN_ENABLED,
    value
  );
};

export const getMpinEnabled = async (): Promise<boolean> => {
  const value = isWeb
    ? localStorage.getItem(
        SECURE_STORAGE_KEYS.MPIN_ENABLED
      )
    : await SecureStore.getItemAsync(
        SECURE_STORAGE_KEYS.MPIN_ENABLED
      );

  return value === "true";
};