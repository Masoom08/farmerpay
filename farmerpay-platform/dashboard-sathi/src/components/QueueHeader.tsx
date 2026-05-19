"use client";

/**
 * QueueHeader — Header stats for the Sathi task queue (G2 — Spec §5.1).
 *
 * Shows: "Today · {n} tasks · {m} villages"
 * Empty state: "No tasks for today. Great job!"
 */

import { Card, CardContent } from "@/components/ui/card";

export interface QueueHeaderProps {
  taskCount: number;
  villageCount: number;
}

export default function QueueHeader({ taskCount, villageCount }: QueueHeaderProps) {
  if (taskCount === 0) {
    return (
      <Card data-testid="queue-header">
        <CardContent>
          <p
            className="text-center text-lg font-medium text-muted-foreground py-2"
            data-testid="queue-empty-header"
          >
            No tasks for today. Great job!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="queue-header">
      <CardContent>
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span data-testid="queue-header-summary">
            Today &middot; {taskCount} task{taskCount !== 1 ? "s" : ""} &middot;{" "}
            {villageCount} village{villageCount !== 1 ? "s" : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
