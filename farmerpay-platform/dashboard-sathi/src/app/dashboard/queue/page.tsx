"use client";

/**
 * Queue page — Sathi task queue grouped by village (G2 — Spec §5.1 + §5.5).
 *
 * Fetches GET /sathi/tasks, groups client-side by village,
 * sorts villages by task count desc.
 *
 * PRIVACY (§5.5): No score-adjacent strings rendered.
 * Success toast copy: "Thanks, data saved." — never score references.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import QueueHeader from "@/components/QueueHeader";
import QueueFilters, { type StatusFilter } from "@/components/QueueFilters";
import QueueList, { type SathiTask } from "@/components/QueueList";

// ─── Route planner strip ───────────────────────────────────

function RoutePlannerStrip({ villages }: { villages: string[] }) {
  if (villages.length === 0) return null;

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
      data-testid="route-planner"
    >
      <span className="shrink-0 font-medium text-muted-foreground">
        Route:
      </span>
      {villages.map((v, i) => (
        <span key={v} className="flex items-center gap-2">
          <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            {v}
          </span>
          {i < villages.length - 1 && (
            <span className="text-muted-foreground">&rarr;</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── Demo data ─────────────────────────────────────────────

const DEMO_TASKS: SathiTask[] = [
  { id: "t1", farmerId: 101, farmerName: "Ramesh Patel", village: "Kheda", taskType: "AA Consent", status: "pending", createdAt: new Date().toISOString() },
  { id: "t2", farmerId: 102, farmerName: "Anita Devi", village: "Kheda", taskType: "PMFBY Upload", status: "pending", createdAt: new Date().toISOString() },
  { id: "t3", farmerId: 103, farmerName: "Suresh Kumar", village: "Kheda", taskType: "Document Collect", status: "completed", createdAt: new Date().toISOString() },
  { id: "t4", farmerId: 104, farmerName: "Lakshmi Bai", village: "Mandvi", taskType: "AA Consent", status: "pending", createdAt: new Date().toISOString() },
  { id: "t5", farmerId: 105, farmerName: "Bharat Singh", village: "Mandvi", taskType: "Loan Follow-up", status: "in_progress", createdAt: new Date().toISOString() },
  { id: "t6", farmerId: 106, farmerName: "Gita Sharma", village: "Dahod", taskType: "PMFBY Upload", status: "pending", createdAt: new Date().toISOString() },
];

// ─── Page ──────────────────────────────────────────────────

export default function QueuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

  const [tasks, setTasks] = useState<SathiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [villageFilter, setVillageFilter] = useState<string>("all");

  // Fetch tasks
  useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      if (isDemo) {
        setTasks(DEMO_TASKS);
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("sathi_token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await apiGet("/sathi/tasks", token);
        if (!cancelled) {
          setTasks(res.data?.tasks ?? res.data ?? []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof Error && err.message === "UNAUTHORIZED") {
            router.push("/login");
          } else {
            setError("Could not load tasks. Please try again.");
            setLoading(false);
          }
        }
      }
    }

    fetchTasks();
    return () => { cancelled = true; };
  }, [isDemo, router]);

  // Derive unique villages from all tasks (unfiltered)
  const allVillages = useMemo(() => {
    const set = new Set(tasks.map((t) => t.village).filter(Boolean));
    return [...set].sort();
  }, [tasks]);

  // Village order by task count desc (for route planner)
  const villagesByCount = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const t of tasks) {
      if (t.status !== "completed") {
        countMap.set(t.village, (countMap.get(t.village) ?? 0) + 1);
      }
    }
    return [...countMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([v]) => v);
  }, [tasks]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (villageFilter !== "all") {
      result = result.filter((t) => t.village === villageFilter);
    }

    return result;
  }, [tasks, statusFilter, villageFilter]);

  const handleStatusChange = useCallback((s: StatusFilter) => setStatusFilter(s), []);
  const handleVillageChange = useCallback((v: string) => setVillageFilter(v), []);

  // ROOTS verification alerts — MUST be declared before any early returns
  // or the hook count flips across renders (loading/error → success),
  // triggering React's "Rendered more hooks than during the previous
  // render" error. All hooks belong above the conditional-render gate.
  const rootsAlerts = useMemo(() => {
    return tasks.filter((t) =>
      (t.taskType === "roots_field_verification" || t.taskType === "ROOTS Verification") &&
      t.status !== "completed"
    );
  }, [tasks]);

  // Loading state
  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[60vh] p-8" data-testid="queue-loading">
        <p className="text-muted-foreground">Loading tasks...</p>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[60vh] p-8" data-testid="queue-error">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4 p-4 md:p-6" data-testid="queue-page">
      <QueueHeader
        taskCount={tasks.length}
        villageCount={allVillages.length}
      />

      {/* ROOTS Alerts Section */}
      {rootsAlerts.length > 0 && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4" data-testid="roots-alerts">
          <h3 className="text-sm font-bold text-amber-800 mb-3">🌾 ROOTS Field Verification ({rootsAlerts.length})</h3>
          <div className="space-y-2">
            {rootsAlerts.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 border border-amber-200">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{task.farmerName}</p>
                  <p className="text-xs text-slate-500">{task.village}</p>
                </div>
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${
                  task.status === "pending" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {task.status === "pending" ? "Urgent" : "In Progress"}
                </span>
                <button
                  className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                  onClick={() => router.push(`/dashboard/roots-verify/${task.id}${isDemo ? "?demo=true" : ""}`)}
                >
                  Start Task ▶
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <QueueFilters
        statusFilter={statusFilter}
        villageFilter={villageFilter}
        villages={allVillages}
        onStatusChange={handleStatusChange}
        onVillageChange={handleVillageChange}
      />

      <RoutePlannerStrip villages={villagesByCount} />

      <QueueList tasks={filteredTasks} />
    </main>
  );
}
