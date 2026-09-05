import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
  success: "bg-emerald-500/15 text-[var(--color-success)]",
  warning: "bg-amber-500/15 text-[var(--color-warning)]",
  danger: "bg-red-500/15 text-[var(--color-danger)]",
  accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]",
};

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

export function Badge({ className, tone = "neutral", ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
