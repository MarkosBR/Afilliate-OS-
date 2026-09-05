import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export function Textarea({ className, label, ...props }: Props) {
  return (
    <label className="flex w-full flex-col gap-1.5 text-sm">
      {label ? <span className="font-medium">{label}</span> : null}
      <textarea
        className={cn(
          "min-h-28 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] outline-none ring-[var(--color-accent)] focus:ring-2",
          className,
        )}
        {...props}
      />
    </label>
  );
}
