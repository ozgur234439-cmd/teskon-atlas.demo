import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Tone =
  | "cyan" | "success" | "warning" | "orange" | "danger"
  | "muted" | "ai" | "benchmark" | "rakip" | "neutral";

const TONES: Record<Tone, string> = {
  cyan: "bg-[rgba(34,211,238,0.10)] border-[rgba(34,211,238,0.30)] text-[#22D3EE]",
  success: "bg-[rgba(34,197,94,0.10)] border-[rgba(34,197,94,0.30)] text-[#4ADE80]",
  warning: "bg-[rgba(245,158,11,0.10)] border-[rgba(245,158,11,0.30)] text-[#FBBF24]",
  orange: "bg-[rgba(249,115,22,0.10)] border-[rgba(249,115,22,0.30)] text-[#FB923C]",
  danger: "bg-[rgba(239,68,68,0.10)] border-[rgba(239,68,68,0.30)] text-[#F87171]",
  muted: "bg-[rgba(100,116,139,0.10)] border-[rgba(100,116,139,0.30)] text-[#94A3B8]",
  ai: "bg-[rgba(56,189,248,0.10)] border-[rgba(56,189,248,0.30)] text-[#38BDF8]",
  benchmark: "bg-[rgba(139,92,246,0.10)] border-[rgba(139,92,246,0.30)] text-[#A78BFA]",
  rakip: "bg-[rgba(249,115,22,0.10)] border-[rgba(249,115,22,0.30)] text-[#FB923C]",
  neutral: "bg-[var(--color-atlas-surface-2)] border-[var(--color-atlas-border-2)] text-[var(--color-atlas-text-2)]",
};

export function Badge({
  tone = "neutral", children, className, dot = false,
}: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5",
      "rounded-full border text-[11px] font-medium tracking-wide uppercase",
      TONES[tone], className
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}