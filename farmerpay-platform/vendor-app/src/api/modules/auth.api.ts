import client from "../client";
import { API } from "../endpoints";
import {
  RegisterRequest,
  RegisterResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  SetMpinRequest,
  SetMpinResponse,
  LoginRequest,
  LoginResponse,
  ForgotMpinRequest,
  ForgotMpinResponse,
  MeResponse,
  ChangeMpinRequest,
  ChangeMpinResponse,
} from "../../types/auth.types";

export const register = async (
  payload: RegisterRequest
): Promise<RegisterResponse> => {
  const response = await client.post<RegisterResponse>(
    API.AUTH.REGISTER,
    {
      ...payload,
      role: "VENDOR", // Always register users as VENDOR in the vendor app
    }
  );

  return response.data;
};

export const verifyOtp = async (
  payload: VerifyOtpRequest
): Promise<VerifyOtpResponse> => {
  const response = await client.post<VerifyOtpResponse>(
    API.AUTH.VERIFY_OTP,
    payload
  );

  return response.data;
};

export const setMpin = async (
  payload: SetMpinRequest
): Promise<SetMpinResponse> => {
  const response = await client.post<SetMpinResponse>(
    API.AUTH.SET_MPIN,
    payload
  );

  return response.data;
}

export const login = async (
  payload: LoginRequest
): Promise<LoginResponse> => {
  const response = await client.post<LoginResponse>(
    API.AUTH.LOGIN,
    payload
  );

  return response.data;
};

export const forgotMpin = async (
  payload: ForgotMpinRequest
): Promise<ForgotMpinResponse> => {
  // Uses the same register endpoint to send OTP to an existing mobile.
  const response = await client.post<ForgotMpinResponse>(
    API.AUTH.REGISTER,
    payload
  );

  return response.data;
};

export const getMe = async (): Promise<MeResponse> => {
  const response = await client.get<MeResponse>(API.AUTH.ME);
  return response.data;
};

export const changeMpin = async (
  payload: ChangeMpinRequest
): Promise<ChangeMpinResponse> => {
  const response = await client.post<ChangeMpinResponse>(
    API.AUTH.CHANGE_MPIN,
    payload
  );

  return response.data;
};

export const logout = async (): Promise<void> => {
  await client.post(API.AUTH.LOGOUT);
};