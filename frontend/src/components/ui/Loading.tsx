import { cn } from "../../lib/cn";

export function Loading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
      <span
        className={cn(
          "h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]",
        )}
      />
      {label}
    </div>
  );
}
