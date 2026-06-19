
// ---------- Generic API Response ----------
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ---------- Common User Types ----------
export interface User {
  id?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoredUser {
  name: string;
  mobile?: string;
  email?: string;
  role?: string;
}

// ---------- Register ----------
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  mobile: string;
  email?: string;
}

export interface RegisterResponseData {
  userId: string;
  otpRequestId: string;
  expiresInSeconds: number;
}

export type RegisterResponse = ApiResponse<RegisterResponseData>;

// ---------- Verify OTP ----------
export interface VerifyOtpRequest {
  otpRequestId: string;
  otpCode: string;
}

export interface VerifyOtpResponseData {
  verified: boolean;
}

export type VerifyOtpResponse = ApiResponse<VerifyOtpResponseData>;

// ---------- Set MPIN ----------
export interface SetMpinRequest {
  mobile: string;
  otpRequestId: string;
  mpin: string;
  confirmMpin: string;
}

export interface SetMpinResponseData {
  message?: string;
}

export type SetMpinResponse = ApiResponse<SetMpinResponseData>;

// ---------- Login ----------
export interface LoginRequest {
  mobile: string;
  mpin: string;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user: User;
}

export type LoginResponse = ApiResponse<LoginResponseData>;

// ---------- Auth Me ----------
export interface MeResponseData {
  user: User;
}

export type MeResponse = ApiResponse<MeResponseData>;

// ---------- Forgot MPIN (Request OTP Again) ----------
export interface ForgotMpinRequest {
  mobile: string;
}

export interface ForgotMpinResponseData {
  otpRequestId: string;
  expiresInSeconds: number;
}

export type ForgotMpinResponse = ApiResponse<ForgotMpinResponseData>;

// ---------- Change MPIN ----------
export interface ChangeMpinRequest {
  currentMpin: string;
  newMpin: string;
  confirmMpin: string;
}

export interface ChangeMpinResponseData {
  message?: string;
}

export type ChangeMpinResponse = ApiResponse<ChangeMpinResponseData>;