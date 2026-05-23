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
    LIST: "/farmers",
    CREATE: "/farmers",
    DETAILS: (id: string) => `/farmers/${id}`,
    UPDATE: (id: string) => `/farmers/${id}`,
    MY_FARMERS: "/vyapar/farmer/my-farmers",
  },

  CREDIT: {
    LIST: "/credit",
    GIVE: "/credit",
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