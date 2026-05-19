"use client";

/**
 * Task capture page — One-question-at-a-time checklist (G4 — Spec §5.3 + §5.8).
 *
 * Fetches task detail via GET /sathi/tasks/:taskId.
 * Renders ChecklistField one at a time with Previous/Next.
 * Auto-saves to localStorage after each field change.
 * On submit: POST /sathi/tasks/:taskId/complete → toast "Thanks, data saved."
 *
 * PRIVACY (§5.5): NEVER shows score-adjacent copy.
 * Toast copy: "Thanks, data saved." — NEVER "Farmer score updated by X".
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import TaskDetailHeader from "@/components/TaskDetailHeader";
import ChecklistField, {
  type ChecklistFieldDef,
  type FieldValue,
} from "@/components/ChecklistField";
import TaskFooter from "@/components/TaskFooter";

// ─── localStorage key ─────────────────────────────────────

function storageKey(taskId: string): string {
  return "sathi:task:" + taskId;
}

// ─── Demo data ────────────────────────────────────────────

const DEMO_FIELDS: ChecklistFieldDef[] = [
  { id: "f1", label: "Crop grown this season", type: "select", required: true, options: ["Rice", "Wheat", "Cotton", "Soybean", "Other"] },
  { id: "f2", label: "Land area (acres)", type: "number", required: true, placeholder: "e.g. 2.5" },
  { id: "f3", label: "Irrigation source", type: "text", placeholder: "e.g. Borewell, Canal" },
  { id: "f4", label: "Has insurance certificate?", type: "boolean" },
  { id: "f5", label: "Farm photo with geotag", type: "photo", enableGeotag: true },
];

const DEMO_TASK = {
  id: "t1",
  farmerName: "Ramesh Patel",
  village: "Kheda",
  dueDate: new Date().toISOString(),
  reason: "HOUSEHOLD_REFRESH",
  fields: DEMO_FIELDS,
};

// ─── Toast ────────────────────────────────────────────────

export const SUBMIT_TOAST_EN = "Thanks, data saved.";

// ─── Page ─────────────────────────────────────────────────

export default function TaskDetailPage() {
  const params = useParams<{ taskId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDemo = searchParams.get("demo") === "true";
  const taskId = params.taskId;

  const [task, setTask] = useState<typeof DEMO_TASK | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, FieldValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── Load task ───────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function fetchTask() {
      if (isDemo) {
        setTask(DEMO_TASK);
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("sathi_token");
      if (!token) { router.push("/login"); return; }

      try {
        const res = await apiGet("/sathi/tasks/" + taskId, token);
        if (!cancelled) {
          setTask(res.data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof Error && err.message === "UNAUTHORIZED") {
            router.push("/login");
          } else {
            setError("Could not load task.");
            setLoading(false);
          }
        }
      }
    }

    fetchTask();
    return () => { cancelled = true; };
  }, [taskId, isDemo, router]);

  // ── Load saved answers from localStorage ────────────

  useEffect(() => {
    if (!taskId) return;
    try {
      const saved = localStorage.getItem(storageKey(taskId));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
      }
    } catch {
      // corrupt data — start fresh
    }
  }, [taskId]);

  // ── Auto-save to localStorage ───────────────────────

  const saveToLocal = useCallback(
    (updatedAnswers: Record<string, FieldValue>, step: number) => {
      if (!taskId) return;
      try {
        localStorage.setItem(
          storageKey(taskId),
          JSON.stringify({ answers: updatedAnswers, currentStep: step }),
        );
      } catch {
        // storage full — silent
      }
    },
    [taskId],
  );

  // ── Field change handler ────────────────────────────

  const handleFieldChange = useCallback(
    (fieldId: string, fieldValue: FieldValue) => {
      const updated = { ...answers, [fieldId]: fieldValue };
      setAnswers(updated);
      saveToLocal(updated, currentStep);
    },
    [answers, currentStep, saveToLocal],
  );

  // ── Navigation ──────────────────────────────────────

  const totalSteps = task?.fields.length ?? 0;

  const handlePrevious = useCallback(() => {
    const prev = Math.max(1, currentStep - 1);
    setCurrentStep(prev);
    saveToLocal(answers, prev);
  }, [currentStep, answers, saveToLocal]);

  const handleNext = useCallback(() => {
    const next = Math.min(totalSteps, currentStep + 1);
    setCurrentStep(next);
    saveToLocal(answers, next);
  }, [currentStep, totalSteps, answers, saveToLocal]);

  // ── Submit ──────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!taskId) return;
    setSubmitting(true);

    try {
      if (!isDemo) {
        const token = localStorage.getItem("sathi_token");
        if (!token) { router.push("/login"); return; }
        await apiPost("/sathi/tasks/" + taskId + "/complete", { answers }, token);
      }

      // Clear saved progress
      localStorage.removeItem(storageKey(taskId));

      // Show success toast — exact copy per §5.5
      setToast(SUBMIT_TOAST_EN);

      // Navigate back after a brief delay
      setTimeout(() => {
        const backUrl = isDemo ? "/dashboard/queue?demo=true" : "/dashboard/queue";
        router.push(backUrl);
      }, 1500);
    } catch {
      setToast("Could not save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [taskId, answers, isDemo, router]);

  // ── Current field ───────────────────────────────────

  const currentField = useMemo(() => {
    if (!task) return null;
    return task.fields[currentStep - 1] ?? null;
  }, [task, currentStep]);

  const currentValue = useMemo((): FieldValue => {
    if (!currentField) return { value: null };
    return answers[currentField.id] ?? { value: null };
  }, [currentField, answers]);

  // ── Render states ───────────────────────────────────

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-[60vh] p-8" data-testid="task-loading">
        <p className="text-muted-foreground">Loading task...</p>
      </main>
    );
  }

  if (error || !task) {
    return (
      <main className="flex items-center justify-center min-h-[60vh] p-8" data-testid="task-error">
        <p className="text-destructive">{error || "Task not found."}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 max-w-xl mx-auto" data-testid="task-detail-page">
      <TaskDetailHeader
        farmerName={task.farmerName}
        village={task.village}
        dueDate={task.dueDate}
        currentStep={currentStep}
        totalSteps={totalSteps}
      />

      {/* One field at a time */}
      {currentField && (
        <ChecklistField
          key={currentField.id}
          field={currentField}
          value={currentValue}
          onChange={handleFieldChange}
        />
      )}

      <TaskFooter
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg"
          data-testid="task-toast"
        >
          {toast}
        </div>
      )}
    </main>
  );
}
