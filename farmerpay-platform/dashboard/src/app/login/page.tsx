"use client";

/**
 * Banker login — FarmerPay uses mobile + 4-digit MPIN (UPI pattern).
 * No passwords. See memory/auth_mpin_pattern.md.
 *
 * Backend contract: POST /auth/login { mobile, mpin }
 *   - mobile: exactly 10 digits starting with 6-9 (no +91 country code)
 *   - mpin  : exactly 4 digits, not a trivial pattern like 1234
 *
 * Demo creds (see seeders/20260409000001-seed-banker-users.js):
 *   Mobile: 9999900001
 *   MPIN  : 9001
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, Loader2 } from "lucide-react";
import { apiPost } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [mpin, setMpin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Normalize: strip +91 country code, spaces, dashes so the backend
    // validator (/^[6-9]\d{9}$/) always sees the 10-digit form.
    const normalizedMobile = mobile
      .replace(/^\+?91/, "")
      .replace(/[\s-]/g, "");

    try {
      const res = await apiPost("/auth/login", {
        mobile: normalizedMobile,
        mpin,
      });
      if (res.success && res.data && res.data.accessToken) {
        localStorage.setItem("fp_token", res.data.accessToken);
        localStorage.setItem(
          "fp_user",
          JSON.stringify({
            name:
              `${res.data.user?.firstName || ""} ${res.data.user?.lastName || ""}`.trim() ||
              normalizedMobile,
            role: res.data.user?.role || "",
            mobile: res.data.user?.mobile || normalizedMobile,
          }),
        );
        router.push("/dashboard");
      } else {
        setError(res.message || "Login failed. Please check your credentials.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("UNAUTHORIZED") || msg.includes("401")) {
        setError("Invalid mobile or MPIN. Please try again.");
      } else {
        setError("Unable to connect to server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <Sprout className="w-9 h-9 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            FarmerPay
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Banker Dashboard Portal
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="mobile"
                className="text-sm font-medium text-slate-700"
              >
                Mobile Number
              </label>
              <Input
                id="mobile"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile (no +91)"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                className="h-11"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="mpin"
                className="text-sm font-medium text-slate-700"
              >
                MPIN
              </label>
              <Input
                id="mpin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="4-digit MPIN"
                value={mpin}
                onChange={(e) => setMpin(e.target.value.replace(/\D/g, ""))}
                required
                pattern="\d{4}"
                className="h-11 tracking-[0.5em] text-center text-lg"
                autoComplete="current-password"
              />
              <p className="text-xs text-slate-400">
                4-digit UPI-style PIN. No passwords on FarmerPay.
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Secured by FarmerPay Platform v1.0
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
