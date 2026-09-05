import { useQuery } from "@tanstack/react-query";
import { Card, CardDescription, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Loading } from "../components/ui/Loading";
import { ErrorState } from "../components/ui/ErrorState";
import { api, fetchHealth, formatCurrency } from "../lib/api";
import { useAuth } from "../lib/auth";

export function DashboardPage() {
  const { user } = useAuth();
  const health = useQuery({ queryKey: ["health"], queryFn: fetchHealth, retry: false });
  const summary = useQuery({ queryKey: ["analytics-summary"], queryFn: api.analytics.summary });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section>
        <h2 className="text-xl font-semibold">Ola, {user?.name}</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Metricas reais da sua conta. Sem dados inventados.
        </p>
      </section>

      {summary.isLoading ? <Loading label="Carregando metricas..." /> : null}
      {summary.isError ? (
        <ErrorState title="Nao foi possivel carregar o dashboard" onRetry={() => summary.refetch()} />
      ) : null}

      {summary.data ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Metric title="Produtos" value={String(summary.data.products)} />
          <Metric title="Links" value={String(summary.data.links)} />
          <Metric title="Campanhas" value={String(summary.data.campaigns)} />
          <Metric title="Cliques" value={String(summary.data.clicks)} />
          <Metric title="Conversoes" value={String(summary.data.conversions)} />
          <Metric title="Receita" value={formatCurrency(summary.data.revenue)} />
        </section>
      ) : null}

      <Card>
        <CardTitle>Status da plataforma</CardTitle>
        <CardDescription>Health check da API e do PostgreSQL.</CardDescription>
        <div className="mt-4">
          {health.isLoading ? <Loading label="Verificando API..." /> : null}
          {health.data ? (
            <div className="flex items-center gap-3">
              <Badge tone={health.data.status === "ok" ? "success" : "warning"}>{health.data.status}</Badge>
              <span className="text-sm text-[var(--color-text-muted)]">Database: {health.data.database}</span>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-[var(--color-text-muted)]">{title}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Card>
  );
}
