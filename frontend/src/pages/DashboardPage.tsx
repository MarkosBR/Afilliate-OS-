import { useQuery } from "@tanstack/react-query";
import { Card, CardDescription, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Loading } from "../components/ui/Loading";
import { ErrorState } from "../components/ui/ErrorState";
import { fetchHealth } from "../lib/api";

export function DashboardPage() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    retry: false,
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section>
        <p className="text-sm text-[var(--color-text-muted)]">
          Foundation pronta. Modulos de produto serao implementados nas proximas fases.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardTitle>Status da plataforma</CardTitle>
          <CardDescription>Health check da API e do PostgreSQL.</CardDescription>
          <div className="mt-4">
            {health.isLoading ? <Loading label="Verificando API..." /> : null}
            {health.isError ? (
              <ErrorState
                title="API indisponivel"
                description="O backend ainda nao respondeu em /api/health."
                onRetry={() => health.refetch()}
              />
            ) : null}
            {health.data ? (
              <div className="flex flex-col gap-2">
                <Badge tone={health.data.status === "ok" ? "success" : "warning"}>
                  {health.data.status}
                </Badge>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Database: {health.data.database}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">{health.data.timestamp}</p>
              </div>
            ) : null}
          </div>
        </Card>
        <Card>
          <CardTitle>Fase 00</CardTitle>
          <CardDescription>Arquitetura, layout, Prisma e health check.</CardDescription>
          <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-muted)]">
            <li>Frontend React + Vite + Tailwind</li>
            <li>Backend Express + TypeScript</li>
            <li>PostgreSQL + Prisma (User)</li>
          </ul>
        </Card>
        <Card>
          <CardTitle>Proximos passos</CardTitle>
          <CardDescription>Nao implementado nesta fase.</CardDescription>
          <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-muted)]">
            <li>Auth e Users</li>
            <li>Products e Campaigns</li>
            <li>IA, CRM e Analytics</li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
