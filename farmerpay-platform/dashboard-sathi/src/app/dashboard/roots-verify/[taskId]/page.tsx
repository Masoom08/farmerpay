"use client";

/**
 * ROOTS Field Verification — Split-screen compare view.
 * Left: what farmer reported. Right: what Sathi sees in field.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

/* ─── Types ─── */

interface ChecklistItem {
  id: string;
  label: string;
  evidenceType: string;
  required: boolean;
}

interface ChecklistData {
  farmerId: number;
  cycleId: number | null;
  cycleName: string | null;
  concerns: string[];
  checklist: ChecklistItem[];
}

interface Discrepancy {
  description: string;
  detail: string;
  severity: string;
}

/* ─── Component ─── */

export default function RootsVerifyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = params.taskId as string;
  const isDemo = searchParams.get("demo") === "true";

  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [cropStanding, setCropStanding] = useState<boolean | null>(null);
  const [estimatedStage, setEstimatedStage] = useState("");
  const [farmerInterview, setFarmerInterview] = useState("");
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [newDisc, setNewDisc] = useState({ description: "", detail: "", severity: "MEDIUM" });
  const [submitting, setSubmitting] = useState(false);

  // Assisted entries
  const [assistedEntries, setAssistedEntries] = useState<Array<{ workbandName: string; done: boolean; notes: string }>>([]);

  useEffect(() => {
    if (isDemo) {
      setChecklist({
        farmerId: 101, cycleId: 1, cycleName: "Paddy", concerns: ["COST_ANOMALY"],
        checklist: [
          { id: "crop_standing", label: "Verify crop is standing in the field", evidenceType: "photo", required: true },
          { id: "field_area", label: "Verify field area matches records", evidenceType: "gps", required: true },
          { id: "current_stage", label: "Identify current crop growth stage", evidenceType: "photo", required: true },
          { id: "farmer_interview", label: "Interview farmer about farming practices", evidenceType: "text", required: true },
          { id: "input_receipts", label: "Check input purchase receipts", evidenceType: "photo", required: true },
        ],
      });
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("sathi_token");
    if (!token) { router.push("/login"); return; }

    (async () => {
      try {
        const res = await apiGet(`/sathi/roots-verification/${taskId}/checklist`, token);
        if (res?.data) setChecklist(res.data);
      } catch (err) {
        if (err instanceof Error && err.message === "UNAUTHORIZED") router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [taskId, isDemo, router]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("sathi_token") || "";
      await apiPost(`/sathi/roots-verification/${taskId}/complete`, {
        cropStanding,
        estimatedStage,
        farmerInterview,
        discrepancies,
        assistedEntries,
        gps: null, // Would be populated from GPS API in production
      }, token);
      alert("Verification submitted successfully!");
      router.push("/dashboard/queue");
    } catch {
      alert("Error submitting verification. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const addDiscrepancy = () => {
    if (!newDisc.description.trim()) return;
    setDiscrepancies([...discrepancies, { ...newDisc }]);
    setNewDisc({ description: "", detail: "", severity: "MEDIUM" });
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Loading verification checklist...</p>
      </main>
    );
  }

  if (!checklist) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-slate-500">Task not found</p>
        <button className="text-emerald-600 font-semibold" onClick={() => router.back()}>← Go back</button>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">🌾 ROOTS Field Verification</h1>
          <p className="text-sm text-slate-500">
            Farmer #{checklist.farmerId} · {checklist.cycleName || "Unknown Crop"} · Task #{taskId}
          </p>
        </div>
        <button className="text-sm text-slate-500 hover:text-slate-700" onClick={() => router.back()}>← Back to queue</button>
      </div>

      {/* Concerns banner */}
      {checklist.concerns.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs font-bold text-amber-800 mb-1">Verification concerns:</p>
          <div className="flex flex-wrap gap-1">
            {checklist.concerns.map((c) => (
              <span key={c} className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {c.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Split screen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: What farmer reported */}
        <div className="rounded-lg border bg-white p-4 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">📋 Farmer&apos;s ROOTS Data</h2>

          <div className="rounded bg-slate-50 p-3 text-sm">
            <p><span className="font-semibold">Crop:</span> {checklist.cycleName || "—"}</p>
            <p><span className="font-semibold">Cycle ID:</span> {checklist.cycleId || "—"}</p>
            <p className="text-xs text-slate-400 mt-2">Detailed compliance data available on banker dashboard</p>
          </div>

          {/* Assisted Entry Section */}
          <div>
            <h3 className="text-xs font-bold text-slate-600 mb-2">Assisted Data Entry (for missed stages)</h3>
            {assistedEntries.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 rounded bg-green-50 p-2 text-sm">
                <span className="font-medium">{entry.workbandName}</span>
                <span className={entry.done ? "text-green-600" : "text-red-600"}>
                  {entry.done ? "✅ Done" : "❌ Not done"}
                </span>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input
                className="flex-1 rounded border px-2 py-1 text-sm"
                placeholder="Stage name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const target = e.target as HTMLInputElement;
                    if (target.value) {
                      setAssistedEntries([...assistedEntries, { workbandName: target.value, done: true, notes: "" }]);
                      target.value = "";
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: What Sathi sees */}
        <div className="rounded-lg border bg-white p-4 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700">🔍 Field Verification</h2>

          {/* Crop standing check */}
          <div>
            <label className="text-sm font-semibold block mb-1">Is crop standing in the field?</label>
            <div className="flex gap-3">
              <button
                className={`rounded-lg px-4 py-2 text-sm font-bold border ${cropStanding === true ? "bg-green-100 border-green-500 text-green-700" : "bg-white border-slate-200"}`}
                onClick={() => setCropStanding(true)}
              >✅ Yes</button>
              <button
                className={`rounded-lg px-4 py-2 text-sm font-bold border ${cropStanding === false ? "bg-red-100 border-red-500 text-red-700" : "bg-white border-slate-200"}`}
                onClick={() => setCropStanding(false)}
              >❌ No</button>
            </div>
          </div>

          {/* Estimated stage */}
          <div>
            <label className="text-sm font-semibold block mb-1">Estimated Growth Stage</label>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={estimatedStage}
              onChange={(e) => setEstimatedStage(e.target.value)}
            >
              <option value="">Select stage...</option>
              <option value="seedling">Seedling</option>
              <option value="vegetative">Vegetative</option>
              <option value="flowering">Flowering</option>
              <option value="grain_filling">Grain Filling</option>
              <option value="maturity">Maturity</option>
              <option value="harvested">Already Harvested</option>
              <option value="no_crop">No Crop Visible</option>
            </select>
          </div>

          {/* Checklist */}
          <div>
            <h3 className="text-xs font-bold text-slate-600 mb-2">Verification Checklist</h3>
            {checklist.checklist.map((item) => (
              <label key={item.id} className="flex items-start gap-2 py-2 border-b border-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!checked[item.id]}
                  onChange={(e) => setChecked({ ...checked, [item.id]: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <div className="flex-1">
                  <span className="text-sm">{item.label}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs rounded px-1.5 py-0.5 ${
                      item.evidenceType === "photo" ? "bg-blue-50 text-blue-600" :
                      item.evidenceType === "gps" ? "bg-purple-50 text-purple-600" :
                      "bg-slate-50 text-slate-600"
                    }`}>
                      {item.evidenceType === "photo" ? "📷 Photo" : item.evidenceType === "gps" ? "📍 GPS" : "📝 Note"}
                    </span>
                    {item.required && <span className="text-xs text-red-500">Required</span>}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* Farmer interview */}
          <div>
            <label className="text-sm font-semibold block mb-1">Farmer Interview Notes</label>
            <textarea
              className="w-full rounded border px-3 py-2 text-sm min-h-[80px]"
              placeholder="What did the farmer say about their farming practices?"
              value={farmerInterview}
              onChange={(e) => setFarmerInterview(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Discrepancy Report */}
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-red-700">⚠️ Discrepancy Report</h2>

        {discrepancies.map((d, i) => (
          <div key={i} className="flex items-center gap-2 rounded bg-red-50 p-2">
            <span className={`text-xs font-bold rounded px-1.5 py-0.5 ${
              d.severity === "HIGH" ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"
            }`}>{d.severity}</span>
            <span className="text-sm flex-1">{d.description}</span>
            <button className="text-xs text-red-500" onClick={() => setDiscrepancies(discrepancies.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}

        <div className="flex gap-2">
          <input
            className="flex-1 rounded border px-2 py-1.5 text-sm"
            placeholder="What doesn't match?"
            value={newDisc.description}
            onChange={(e) => setNewDisc({ ...newDisc, description: e.target.value })}
          />
          <select
            className="rounded border px-2 py-1.5 text-sm"
            value={newDisc.severity}
            onChange={(e) => setNewDisc({ ...newDisc, severity: e.target.value })}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          <button
            className="rounded bg-red-100 px-3 py-1.5 text-sm font-bold text-red-700 hover:bg-red-200"
            onClick={addDiscrepancy}
          >+ Add</button>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          onClick={() => router.back()}
        >Cancel</button>
        <button
          className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Complete Verification ✅"}
        </button>
      </div>
    </main>
  );
}
