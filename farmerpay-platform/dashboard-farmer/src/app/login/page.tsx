"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, Loader2 } from "lucide-react";
import { apiPost } from "@/lib/api";

export default function FarmerLoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [mpin, setMpin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const normalizedMobile = mobile.replace(/^\+?91/, "").replace(/[\s-]/g, "");
    try {
      const res = await apiPost("/auth/login", { mobile: normalizedMobile, mpin });
      if (res.success && res.data?.accessToken) {
        localStorage.setItem("farmer_token", res.data.accessToken);
        localStorage.setItem("farmer_user", JSON.stringify({
          name: `${res.data.user?.firstName || ""} ${res.data.user?.lastName || ""}`.trim() || normalizedMobile,
          mobile: res.data.user?.mobile || normalizedMobile,
        }));
        router.push("/dashboard");
      } else {
        setError(res.message || "Login failed.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.includes("UNAUTHORIZED") ? "Invalid mobile or MPIN." : "Unable to connect.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-lime-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-lime-600 flex items-center justify-center shadow-lg">
              <Sprout className="w-9 h-9 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">FarmerPay</CardTitle>
          <p className="text-sm text-slate-500 mt-1">Farmer Portal</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="mobile" className="text-sm font-medium text-slate-700">Mobile Number</label>
              <Input id="mobile" type="tel" inputMode="numeric" placeholder="10-digit mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} required className="h-11" />
            </div>
            <div className="space-y-2">
              <label htmlFor="mpin" className="text-sm font-medium text-slate-700">MPIN</label>
              <Input id="mpin" type="password" inputMode="numeric" maxLength={4} placeholder="4-digit MPIN" value={mpin} onChange={(e) => setMpin(e.target.value.replace(/\D/g, ""))} required pattern="\d{4}" className="h-11 tracking-[0.5em] text-center text-lg" />
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
            <Button type="submit" className="w-full h-11 bg-gradient-to-r from-green-600 to-lime-700 hover:from-green-700 hover:to-lime-800 text-white font-medium" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
