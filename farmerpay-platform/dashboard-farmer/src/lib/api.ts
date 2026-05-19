const API_BASE = "/api/v1";

export async function apiGet(path: string, token: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost(path: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function formatRupees(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "\u20B90";
  return "\u20B9" + Math.round(n).toLocaleString("en-IN");
}

export function formatRupeesCompact(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "\u20B90";
  const abs = Math.abs(n);
  if (abs >= 1e7) return `\u20B9${(n / 1e7).toFixed(1)} Cr`;
  if (abs >= 1e5) return `\u20B9${(n / 1e5).toFixed(1)} L`;
  return formatRupees(n);
}
