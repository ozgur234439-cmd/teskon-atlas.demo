import type { ReactNode } from "react";
export function EmptyState({ icon, title, description, action }:
  { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && <div className="mb-4 text-[var(--color-atlas-text-muted)] opacity-60">{icon}</div>}
      <h3 className="text-[15px] font-medium text-[var(--color-atlas-text-2)]">{title}</h3>
      {description && <p className="mt-2 text-[13px] text-[var(--color-atlas-text-muted)] max-w-md">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}