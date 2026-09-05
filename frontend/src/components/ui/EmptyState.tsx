import { Card } from "./Card";
import { Badge } from "./Badge";

type Props = {
  title: string;
  description: string;
  module?: string;
};

export function EmptyState({ title, description, module }: Props) {
  return (
    <Card className="flex min-h-[320px] flex-col items-start justify-center gap-3">
      <Badge tone="warning">Empty State</Badge>
      {module ? (
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {module} · Fase 00
        </p>
      ) : null}
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
    </Card>
  );
}
