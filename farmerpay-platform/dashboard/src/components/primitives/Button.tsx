"use client";

import * as React from "react";
import { Button as ShadcnButton, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import type { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@/lib/utils";

const Spinner = () => (
  <svg
    className="size-4 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

export type TrustButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type TrustButtonSize = "sm" | "md" | "lg";

/** Maps TRUST v2 variant names to shadcn variant names */
const variantMap: Record<TrustButtonVariant, VariantProps<typeof buttonVariants>["variant"]> = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
  destructive: "destructive",
};

const sizeMap: Record<TrustButtonSize, VariantProps<typeof buttonVariants>["size"]> = {
  sm: "sm",
  md: "default",
  lg: "lg",
};

export interface TrustButtonProps
  extends Omit<ButtonPrimitive.Props, "size"> {
  variant?: TrustButtonVariant;
  size?: TrustButtonSize;
  loading?: boolean;
  "data-testid"?: string;
}

const Button = React.forwardRef<HTMLButtonElement, TrustButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      className,
      "data-testid": testId,
      ...props
    },
    ref,
  ) => {
    return (
      <ShadcnButton
        ref={ref}
        variant={variantMap[variant]}
        size={sizeMap[size]}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        data-testid={testId}
        className={cn(loading && "cursor-wait", className)}
        {...props}
      >
        {loading && <Spinner />}
        {children}
      </ShadcnButton>
    );
  },
);
Button.displayName = "Button";

export { Button };
