"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Smartphone, Link2, CheckCircle, ChevronRight, ChevronLeft, QrCode } from "lucide-react";
import { apiPost, apiGet } from "@/lib/api";

const STEPS = [
  { title: "What is Account Aggregator?", icon: ShieldCheck },
  { title: "Choose Bank & Provider", icon: Smartphone },
  { title: "Open the Consent Link", icon: Link2 },
];

export default function AAOnboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.has("demo");
  const farmerId = searchParams.get("farmerId");

  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState("setu");
  const [loading, setLoading] = useState(false);
  const [consentUrl, setConsentUrl] = useState<string | null>(null);
  const [consentUuid, setConsentUuid] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleInitiate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("sathi_token") || "";
      const res = await apiPost("/aa/consent", { provider, monthsBack: 12 }, token);
      const data = res.data;
      if (data.status === "already_active") {
        setStatus("approved");
        setStep(2);
      } else {
        setConsentUrl(data.redirectUrl);
        setConsentUuid(data.consentUuid);
        setStep(2);
      }
    } catch (err: any) {
      alert(err.message || "Failed to create consent");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!consentUuid) return;
    try {
      const token = localStorage.getItem("sathi_token") || "";
      const res = await apiGet(`/aa/consent/${consentUuid}`, token);
      setStatus(res.data?.status || "requested");
      if (res.data?.status === "approved") {
        setTimeout(() => router.push(`/dashboard/aa-share?farmerId=${farmerId || ""}`), 1500);
      }
    } catch { /* ignore */ }
  };

  const whatsAppShareLink = consentUrl
    ? `https://wa.me/?text=${encodeURIComponent(`FarmerPay: Please approve your bank consent to complete your loan readiness assessment.\n\nOpen this link: ${consentUrl}`)}`
    : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900">AA Onboarding — Guide Farmer</h1>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              i < step ? "bg-green-100 text-green-700" :
              i === step ? "bg-blue-600 text-white" :
              "bg-slate-100 text-slate-400"
            }`}>
              {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:inline ${i === step ? "font-semibold text-slate-900" : "text-slate-400"}`}>
              {s.title}
            </span>
            {i < STEPS.length - 1 ? <ChevronRight className="w-4 h-4 text-slate-300" /> : null}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              What is Account Aggregator?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Account Aggregator (AA) is an RBI-regulated system that lets farmers securely share their bank statement data with FarmerPay. It helps us:
            </p>
            <ul className="space-y-3">
              {[
                { text: "Assess loan readiness using verified bank data", emoji: "📊" },
                { text: "Verify income from farming, dairy, govt schemes", emoji: "✅" },
                { text: "Recommend the best EMI schedule based on cash flow", emoji: "📅" },
                { text: "Speed up loan approvals with verified data", emoji: "⚡" },
              ].map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="text-lg">{b.emoji}</span>
                  <span className="text-slate-700">{b.text}</span>
                </li>
              ))}
            </ul>
            <div className="bg-green-50 rounded-lg p-3 text-xs text-green-700 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>The farmer&apos;s bank login credentials are never shared. They control what data is shared and can revoke anytime.</span>
            </div>
            <Button className="w-full" onClick={() => setStep(1)}>
              Next: Choose Bank <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      ) : step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              Choose AA Provider
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">Select the Account Aggregator provider:</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "setu", name: "Setu (OneMoney)", desc: "Most banks supported" },
                { id: "finvu", name: "Finvu", desc: "Alternative provider" },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    provider === p.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button className="flex-1" onClick={handleInitiate} disabled={loading}>
                {loading ? "Creating consent..." : "Generate Consent Link"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="w-5 h-5 text-indigo-600" />
              Share Consent Link with Farmer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "approved" ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <p className="text-lg font-bold text-green-700 mt-3">Consent Approved!</p>
                <p className="text-sm text-slate-500 mt-1">Redirecting to health score...</p>
              </div>
            ) : (
              <>
                {consentUrl ? (
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-lg p-3 break-all text-xs text-slate-600 font-mono">
                      {consentUrl}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => { navigator.clipboard.writeText(consentUrl); alert("Link copied!"); }}
                      >
                        Copy Link
                      </Button>
                      {whatsAppShareLink ? (
                        <Button
                          className="flex-1 bg-[#25D366] hover:bg-[#1da851] text-white"
                          onClick={() => window.open(whatsAppShareLink, "_blank")}
                        >
                          Share via WhatsApp
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-400 text-center">
                      Ask the farmer to open this link and approve in their bank app.
                    </p>
                    <Button variant="outline" className="w-full" onClick={handleCheckStatus}>
                      Check Approval Status
                    </Button>
                    {status === "requested" ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-600">Waiting for farmer approval...</Badge>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No consent link generated yet.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
