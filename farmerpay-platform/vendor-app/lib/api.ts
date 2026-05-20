import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const API_BASE = "http://10.218.164.140:3000/api/v1";

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("vendor_token");
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem("vendor_token", token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.multiRemove(["vendor_token", "vendor_user"]);
}

export async function setUser(user: any): Promise<void> {
  await AsyncStorage.setItem("vendor_user", JSON.stringify(user));
}

export async function getUser(): Promise<any | null> {
  const u = await AsyncStorage.getItem("vendor_user");
  return u ? JSON.parse(u) : null;
}

export async function apiGet(path: string): Promise<any> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost(path: string, body?: any): Promise<any> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPut(path: string, body?: any): Promise<any> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function formatRupees(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "\u20B90";
  return "\u20B9" + Math.round(n).toLocaleString("en-IN");
}
