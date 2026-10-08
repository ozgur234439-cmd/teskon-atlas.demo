import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "success" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[var(--color-atlas-cyan-dark)] text-white hover:bg-[var(--color-atlas-cyan-hover)] border border-transparent",
  secondary: "bg-transparent text-[var(--color-atlas-text-2)] border border-[var(--color-atlas-border-2)] hover:bg-[var(--color-atlas-surface-2)] hover:border-[var(--color-atlas-cyan)] hover:text-[var(--color-atlas-cyan)]",
  success: "bg-[var(--color-atlas-success)] text-white hover:brightness-110 border border-transparent",
  danger: "bg-[var(--color-atlas-danger)] text-white hover:brightness-110 border border-transparent",
  ghost: "bg-transparent text-[var(--color-atlas-text-2)] border border-transparent hover:bg-[var(--color-atlas-surface-2)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-4 text-[13.5px] gap-2",
  lg: "h-11 px-5 text-[14px] gap-2",
};

export function Button({
  variant = "secondary", size = "md", icon, className, children, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <button {...props} className={cn(
      "inline-flex items-center justify-center font-medium",
      "rounded-[var(--radius-atlas-sm)] transition-colors duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-atlas-cyan)]",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      VARIANTS[variant], SIZES[size], className
    )}>
      {icon}{children}
    </button>
  );
}