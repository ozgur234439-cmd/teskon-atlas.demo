"use client";
import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, ReactNode } from "react";

export function Input({ className, leading, trailing, ...props }:
  InputHTMLAttributes<HTMLInputElement> & { leading?: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="relative flex items-center">
      {leading && <span className="absolute left-3 text-[var(--color-atlas-text-muted)] pointer-events-none z-10">{leading}</span>}
      <input {...props} className={cn(
        "h-9 w-full rounded-[var(--radius-atlas-sm)]",
        "bg-[var(--color-atlas-surface)] border border-[var(--color-atlas-border-2)]",
        "px-3 text-[13.5px] text-[var(--color-atlas-text)]",
        "placeholder:text-[var(--color-atlas-text-muted)]",
        "focus:outline-none focus:border-[var(--color-atlas-cyan)] focus:ring-1 focus:ring-[var(--color-atlas-cyan)]",
        "transition-colors duration-150",
        leading && "pl-9", trailing && "pr-12", className
      )} />
      {trailing && <span className="absolute right-3 text-[var(--color-atlas-text-muted)]">{trailing}</span>}
    </div>
  );
}