import * as SecureStore from "expo-secure-store";

const isWeb =
  typeof window !== "undefined";

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
      ACCESS_TOKEN,
      token
    );
    return;
  }

  await SecureStore.setItemAsync(
    ACCESS_TOKEN,
    token
  );
};

export const getAccessToken = async (): Promise<string | null> => {

  if (isWeb) {
    return localStorage.getItem(
      ACCESS_TOKEN
    );
  }

  return await SecureStore.getItemAsync(
    ACCESS_TOKEN
  );
};

// REFRESH TOKEN

export const setRefreshToken = async (
  token: string
): Promise<void> => {

  if (isWeb) {
    localStorage.setItem(
      REFRESH_TOKEN,
      token
    );
    return;
  }

  await SecureStore.setItemAsync(
    REFRESH_TOKEN,
    token
  );
};

export const getRefreshToken = async (): Promise<string | null> => {

  if (isWeb) {
    return localStorage.getItem(
      REFRESH_TOKEN
    );
  }

  return await SecureStore.getItemAsync(
    REFRESH_TOKEN
  );
};

// CLEAR AUTH

export const clearSecureAuth = async (): Promise<void> => {

  if (isWeb) {

    localStorage.removeItem(
      ACCESS_TOKEN
    );

    localStorage.removeItem(
      REFRESH_TOKEN
    );

    return;
  }

  await SecureStore.deleteItemAsync(
    ACCESS_TOKEN
  );

  await SecureStore.deleteItemAsync(
    REFRESH_TOKEN
  );
};

// MPIN ENABLED

export const setMpinEnabled = async (
  enabled: boolean
): Promise<void> => {

  if (isWeb) {

    localStorage.setItem(
      MPIN_ENABLED,
      JSON.stringify(enabled)
    );

    return;
  }

  await SecureStore.setItemAsync(
    MPIN_ENABLED,
    JSON.stringify(enabled)
  );
};

export const getMpinEnabled = async (): Promise<boolean> => {

  if (isWeb) {
    return (
      localStorage.getItem(
        MPIN_ENABLED
      ) === "true"
    );
  }

  const value =
    await SecureStore.getItemAsync(
      MPIN_ENABLED
    );

  return value === "true";
};