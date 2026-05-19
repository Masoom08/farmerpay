import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "sanction"
  | "reconsider"
  | "reject"
  | "band-excellent"
  | "band-good"
  | "band-building"
  | "band-starting";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border border-border text-foreground bg-transparent",
  sanction: "bg-decision-sanction text-decision-sanction-fg",
  reconsider: "bg-decision-reconsider text-decision-reconsider-fg",
  reject: "bg-decision-reject text-decision-reject-fg",
  "band-excellent": "bg-brand-primary-100 text-brand-primary-700",
  "band-good": "bg-brand-primary-100 text-brand-primary-700",
  "band-building": "bg-brand-accent-amber/20 text-neutral-800",
  "band-starting": "bg-neutral-200 text-neutral-800",
};

export interface TrustBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  "data-testid"?: string;
}

const Badge = React.forwardRef<HTMLSpanElement, TrustBadgeProps>(
  ({ variant = "default", className, "data-testid": testId, ...props }, ref) => {
    return (
      <span
        ref={ref}
        data-slot="badge"
        data-testid={testId}
        className={cn(
          "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
          variantClasses[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
Badge.displayName = "Badge";

export { Badge };
