/**
 * CoachingPriority — Badge showing a farmer's coaching priority level.
 *
 * Fed from the readiness API `coachingPriority` field (high / medium / low).
 * Used in Sathi farmer lists and detail views.
 */

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, CheckCircle } from "lucide-react";

export type CoachingPriorityLevel = "high" | "medium" | "low";

interface CoachingPriorityProps {
  priority: CoachingPriorityLevel | null | undefined;
  /** Compact mode for table cells — icon + short label */
  compact?: boolean;
}

const CONFIG: Record<CoachingPriorityLevel, {
  label: string;
  shortLabel: string;
  className: string;
  Icon: typeof AlertTriangle;
}> = {
  high: {
    label: "High Priority",
    shortLabel: "High",
    className: "bg-red-50 text-red-700 border-red-200",
    Icon: AlertTriangle,
  },
  medium: {
    label: "Medium Priority",
    shortLabel: "Medium",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: ArrowRight,
  },
  low: {
    label: "Low Priority",
    shortLabel: "Low",
    className: "bg-green-50 text-green-700 border-green-200",
    Icon: CheckCircle,
  },
};

export default function CoachingPriority({ priority, compact = false }: CoachingPriorityProps) {
  if (!priority || !CONFIG[priority]) {
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200">
        —
      </Badge>
    );
  }

  const { label, shortLabel, className, Icon } = CONFIG[priority];

  return (
    <Badge
      variant="outline"
      className={`${className} flex items-center gap-1 w-fit`}
      data-testid="coaching-priority"
      data-priority={priority}
    >
      <Icon className="h-3 w-3" />
      {compact ? shortLabel : label}
    </Badge>
  );
}
