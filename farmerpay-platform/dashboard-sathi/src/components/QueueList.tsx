"use client";

/**
 * QueueList — Grouped-by-village task list for Sathi queue (G2 — Spec §5.1).
 *
 * Groups tasks by village, sorted by task count descending.
 * Each task shows farmer name, task type, and status.
 *
 * PRIVACY: Never renders score-adjacent strings (§5.5).
 * Success copy is "Thanks, data saved." — NEVER "Farmer score updated by X".
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface SathiTask {
  id: string;
  farmerId: number;
  farmerName: string;
  village: string;
  taskType: string;
  status: "pending" | "completed" | "in_progress";
  description?: string;
  createdAt: string;
}

export interface QueueListProps {
  tasks: SathiTask[];
}

/** Group tasks by village, sorted by count desc. */
function groupByVillage(tasks: SathiTask[]): Map<string, SathiTask[]> {
  const map = new Map<string, SathiTask[]>();
  for (const task of tasks) {
    const village = task.village || "Unknown";
    if (!map.has(village)) map.set(village, []);
    map.get(village)!.push(task);
  }

  // Sort by task count descending
  const sorted = new Map(
    [...map.entries()].sort((a, b) => b[1].length - a[1].length),
  );
  return sorted;
}

function statusLabel(status: SathiTask["status"]): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "completed":
      return "Done";
    case "in_progress":
      return "In Progress";
    default:
      return status;
  }
}

function statusVariant(
  status: SathiTask["status"],
): "default" | "secondary" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "in_progress":
      return "secondary";
    default:
      return "outline";
  }
}

export default function QueueList({ tasks }: QueueListProps) {
  if (tasks.length === 0) {
    return (
      <div
        className="text-center py-8 text-muted-foreground"
        data-testid="queue-list-empty"
      >
        No tasks match the current filters.
      </div>
    );
  }

  const grouped = groupByVillage(tasks);

  return (
    <div className="flex flex-col gap-4" data-testid="queue-list">
      {[...grouped.entries()].map(([village, villageTasks]) => (
        <Card key={village} data-testid="queue-village-group">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span data-testid="village-name">{village}</span>
              <Badge variant="secondary" data-testid="village-task-count">
                {villageTasks.length} task{villageTasks.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border" data-testid="task-list">
              {villageTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                  data-testid="task-item"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium" data-testid="task-farmer">
                      {task.farmerName}
                    </span>
                    <span className="text-xs text-muted-foreground" data-testid="task-type">
                      {task.taskType}
                    </span>
                    {task.description && (
                      <span className="text-xs text-muted-foreground">
                        {task.description}
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={statusVariant(task.status)}
                    data-testid="task-status"
                  >
                    {statusLabel(task.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export { groupByVillage };
