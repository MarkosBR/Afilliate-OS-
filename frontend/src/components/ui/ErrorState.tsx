import { Card } from "./Card";
import { Button } from "./Button";

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Algo deu errado",
  description = "Nao foi possivel carregar esta informacao.",
  onRetry,
}: Props) {
  return (
    <Card className="flex flex-col items-start gap-3">
      <h2 className="text-lg font-semibold text-[var(--color-danger)]">{title}</h2>
      <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </Card>
  );
}
