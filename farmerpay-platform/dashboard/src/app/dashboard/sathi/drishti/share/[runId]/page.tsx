"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getShareableSummary, ENGINE_LABELS, type ShareableSummary } from "@/lib/drishti";

export default function SharePage() {
  const { runId } = useParams<{ runId: string }>();
  const [summary, setSummary] = useState<ShareableSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("fp_token") || "";
    getShareableSummary(token, runId).then(setSummary).catch(() => {}).finally(() => setLoading(false));
  }, [runId]);

  const handleCopy = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary.whatsapp_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <p className="text-slate-400 p-6">Loading summary...</p>;
  if (!summary) return <p className="text-red-500 p-6">Failed to load summary for run {runId}</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Share Scenario Result</h1>
        <p className="text-sm text-slate-500">{ENGINE_LABELS[summary.engine_type] || summary.engine_type} — Run {runId.slice(0, 8)}</p>
      </div>

      {/* Key Metrics */}
      {summary.key_metrics && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Key Metrics</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(summary.key_metrics).map(([key, val]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-slate-500">{key.replace(/_/g, " ")}</span>
                  <span className="font-semibold">{String(val)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp Preview */}
      <Card>
        <CardHeader><CardTitle className="text-sm">WhatsApp Message Preview</CardTitle></CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-4 rounded-lg border font-sans leading-relaxed">{summary.whatsapp_text}</pre>
          <Button onClick={handleCopy} className="w-full mt-3" variant={copied ? "secondary" : "default"}>
            {copied ? "✅ Copied!" : "📋 Copy for WhatsApp"}
          </Button>
        </CardContent>
      </Card>

      {/* SMS Preview */}
      <Card>
        <CardHeader><CardTitle className="text-sm">SMS Preview ({summary.sms_text.length} chars)</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm bg-slate-50 p-3 rounded-lg border">{summary.sms_text}</p>
        </CardContent>
      </Card>
    </div>
  );
}
