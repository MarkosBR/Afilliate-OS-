import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ className, label, error, id, ...props }: Props) {
  return (
    <label className="flex w-full flex-col gap-1.5 text-sm">
      {label ? <span className="font-medium text-[var(--color-text)]">{label}</span> : null}
      <input
        id={id}
        className={cn(
          "h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-text)] outline-none ring-[var(--color-accent)] focus:ring-2",
          error && "border-[var(--color-danger)]",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-[var(--color-danger)]">{error}</span> : null}
    </label>
  );
}
