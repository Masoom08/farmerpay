import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  "data-testid"?: string;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon,
      title,
      description,
      action,
      className,
      "data-testid": testId,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        data-slot="empty-state"
        data-testid={testId}
        role="status"
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-12 text-center",
          className,
        )}
        {...props}
      >
        {icon && (
          <div className="text-muted-foreground [&_svg]:size-10" aria-hidden="true">
            {icon}
          </div>
        )}
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
        )}
        {action && <div className="pt-2">{action}</div>}
      </div>
    );
  },
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
