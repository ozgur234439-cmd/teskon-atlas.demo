import { cn } from "@/lib/cn";
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("atlas-shimmer rounded-[var(--radius-atlas-sm)] h-4 w-full", className)} />;
}