import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";

type Props = {
  label: string;
  children: ReactNode;
};

export function Dropdown({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" size="sm" onClick={() => setOpen((value) => !value)}>
        {label}
      </Button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 min-w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-card)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
