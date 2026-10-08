import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  hoverable?: boolean;
}

export function Card({ className, padded = true, hoverable = false, children, ...props }: CardProps) {
  return (
    <div {...props} className={cn(
      "bg-[var(--color-atlas-surface)] border border-[var(--color-atlas-border)]",
      "rounded-[var(--radius-atlas-lg)]",
      padded && "p-5",
      hoverable && "hover:bg-[var(--color-atlas-surface-3)] hover:border-[var(--color-atlas-border-2)] transition-colors duration-150 cursor-pointer",
      className
    )}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("text-[15px] font-semibold text-[var(--color-atlas-text)]", className)}>{children}</h3>;
}

export function CardSubtitle({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[12.5px] text-[var(--color-atlas-text-muted)] mt-1", className)}>{children}</p>;
}