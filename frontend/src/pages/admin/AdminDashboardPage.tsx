import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Loading } from "../../components/ui/Loading";

export function AdminDashboardPage() {
  const dashboard = useQuery({ queryKey: ["admin-dashboard"], queryFn: api.admin.dashboard });

  if (dashboard.isLoading) return <Loading label="Carregando administracao..." />;
  if (dashboard.isError || !dashboard.data) return <ErrorState onRetry={() => dashboard.refetch()} />;

  const data = dashboard.data;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Administracao</p>
        <h2 className="text-2xl font-semibold">Painel</h2>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric title="Usuarios" value={data.users} />
        <Metric title="Usuarios ativos" value={data.activeUsers} />
        <Metric title="Usuarios novos (7d)" value={data.newUsers} />
        <Metric title="Produtos" value={data.products} />
        <Metric title="Campanhas" value={data.campaigns} />
        <Metric title="Links" value={data.links} />
      </section>
      <Card>
        <h3 className="font-semibold">Atividade recente</h3>
        {data.recentLogs.length ? (
          <ul className="mt-4 space-y-3 text-sm">
            {data.recentLogs.map((log) => (
              <li key={log.id} className="flex items-center justify-between">
                <span>
                  {log.action} {log.target?.email ? `· ${log.target.email}` : ""}
                </span>
                <span className="text-[var(--color-text-muted)]">
                  {new Date(log.createdAt).toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">Nenhum log ainda.</p>
        )}
      </Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <p className="text-sm text-[var(--color-text-muted)]">{title}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Card>
  );
}
