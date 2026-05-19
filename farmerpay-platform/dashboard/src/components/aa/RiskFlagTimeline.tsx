"use client";

import { SEVERITY_COLORS, type RiskFlag } from "@/lib/aa";
import { cn } from "@/lib/utils";

interface Props {
  flags: RiskFlag[];
}

export default function RiskFlagTimeline({ flags }: Props) {
  if (!flags || flags.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-slate-400">
        No risk flags detected
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {flags.map((flag, i) => (
        <div key={i} className={cn("flex items-start gap-3 p-3 rounded-lg border", SEVERITY_COLORS[flag.severity] || "bg-slate-50")}>
          <div className={cn(
            "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
            flag.severity === "high" ? "bg-red-500" : flag.severity === "medium" ? "bg-amber-500" : "bg-blue-500"
          )} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {flag.type.replace(/_/g, " ")}
              </span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-medium uppercase",
                flag.severity === "high" ? "bg-red-200 text-red-800" : flag.severity === "medium" ? "bg-amber-200 text-amber-800" : "bg-blue-200 text-blue-800"
              )}>
                {flag.severity}
              </span>
            </div>
            <p className="text-xs mt-1 opacity-80">{flag.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
