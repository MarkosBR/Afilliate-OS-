import { cn } from "../../lib/cn";

type Tab = { id: string; label: string };

type Props = {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
};

export function Tabs({ tabs, value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm",
            value === tab.id
              ? "bg-[var(--color-surface)] text-[var(--color-text)]"
              : "text-[var(--color-text-muted)]",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
