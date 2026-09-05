import type { SelectHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export function Select({ className, label, children, ...props }: Props) {
  return (
    <label className="flex w-full flex-col gap-1.5 text-sm">
      {label ? <span className="font-medium">{label}</span> : null}
      <select
        className={cn(
          "h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-text)] outline-none ring-[var(--color-accent)] focus:ring-2",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
