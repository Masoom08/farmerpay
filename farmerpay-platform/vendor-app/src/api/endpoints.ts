export const API = {
  AUTH: {
    // Public endpoints
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    VERIFY_OTP: "/auth/verify-otp",
    SET_MPIN: "/auth/set-mpin",
    LOGOUT: "/auth/logout",
    REFRESH_TOKEN: "/auth/refresh-token",

    //Authenticated endpoints
    ME: "/auth/me",
    CHANGE_MPIN: "/auth/change-mpin",
  },

  FARMERS: {
    CREATE:
    "/vyapar/farmer/register-farmer",
    MY_FARMERS:
    "/vyapar/farmer/my-farmers",
    DETAILS: (id: string) => `/farmers/${id}`,
    UPDATE: (id: string) => `/farmers/${id}`,
  },

  CREDIT: {
    LIST: "/vyapar/credit-ledger",

    RECORD_PAYMENT: (
      farmerId: string | number
    ) => `/vyapar/credit-ledger/${farmerId}/payment`,
  },

  SALES: {
    LIST: "/sales",
    CREATE: "/sales",
    CATALOG: "/vyapar/catalog",
    RECORD: "/vyapar/transactions",
    CREATE_TRANSACTION: "/vyapar/transactions",
    UPLOAD_EVIDENCE: (transactionId: string | number) =>
      `/vyapar/transactions/${transactionId}/evidence`,
    CANCEL: (transactionId: string | number) =>
      `/vyapar/transactions/${transactionId}/cancel`,
    DETAILS: (transactionId: string | number) =>
      `/vyapar/transactions/${transactionId}`,
  },

  PROFILE: {
    GET: "/profile",
    UPDATE: "/profile",
  },

  VENDOR: {
    DASHBOARD: "/vendor/dashboard",
  },

  RATINGS: {
  LIST: "/vyapar/ratings",
},
} as const;