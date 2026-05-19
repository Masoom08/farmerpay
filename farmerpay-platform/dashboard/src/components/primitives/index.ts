/**
 * TRUST v2 — Desktop UI Primitives
 *
 * Wraps shadcn/base-ui components with TRUST v2 tokens and a11y defaults.
 * Import all primitives from this barrel:
 *   import { Button, Badge, Card, Dialog, ... } from "@/components/primitives";
 */

// Custom primitives
export { Button } from "./Button";
export type { TrustButtonProps, TrustButtonVariant, TrustButtonSize } from "./Button";

export { Badge } from "./Badge";
export type { TrustBadgeProps, BadgeVariant } from "./Badge";

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./Dialog";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

export { Skeleton } from "./Skeleton";
export type { SkeletonProps } from "./Skeleton";

// Re-exports from shadcn/ui (already TRUST v2 compatible via CSS vars)
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
