import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardDescription, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Loading } from "../components/ui/Loading";
import { ErrorState } from "../components/ui/ErrorState";
import { Select } from "../components/ui/Select";
import { api, fetchHealth } from "../lib/api";
import { useAuth } from "../lib/auth";

export function DashboardPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(7);
  const health = useQuery({ queryKey: ["health"], queryFn: fetchHealth, retry: false });
  const overview = useQuery({
    queryKey: ["analytics-overview", days],
    queryFn: () => api.analytics.overview(days),
  });

  const maxPoint = Math.max(
    1,
    ...(overview.data?.series.map((point) => point.clicks + point.conversions) ?? [0]),
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Operacao</p>
          <h2 className="text-2xl font-semibold">Ola, {user?.name}</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Metricas reais da conta. Sem dados inventados.</p>
        </div>
        <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-40">
          <option value="7">7 dias</option>
          <option value="14">14 dias</option>
          <option value="30">30 dias</option>
        </Select>
      </section>

      {overview.isLoading ? <Loading label="Carregando operacao..." /> : null}
      {overview.isError ? (
        <ErrorState title="Nao foi possivel carregar o dashboard" onRetry={() => overview.refetch()} />
      ) : null}

      {overview.data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Metric title="Cliques" value={String(overview.data.summary.clicks)} />
            <Metric title="Produtos ativos" value={String(overview.data.summary.activeProducts)} />
            <Metric title="Links ativos" value={String(overview.data.summary.activeLinks)} />
            <Metric title="Campanhas ativas" value={String(overview.data.summary.activeCampaigns)} />
          </section>

          <Card>
            <CardTitle>Desempenho</CardTitle>
            <CardDescription>Cliques e conversoes no periodo selecionado.</CardDescription>
            {overview.data.series.every((point) => point.clicks === 0 && point.conversions === 0) ? (
              <p className="mt-4 text-sm text-[var(--color-text-muted)]">Sem eventos no periodo.</p>
            ) : (
              <div className="mt-4 flex h-40 items-end gap-1">
                {overview.data.series.map((point) => (
                  <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-[var(--color-accent)]/80"
                      style={{ height: `${Math.max(4, ((point.clicks + point.conversions) / maxPoint) * 100)}%` }}
                      title={`${point.date}: ${point.clicks} cliques, ${point.conversions} conversoes`}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle>Links com melhor desempenho</CardTitle>
              {overview.data.topLinks.length ? (
                <ul className="mt-4 space-y-3">
                  {overview.data.topLinks.map((link) => (
                    <li key={link.id} className="flex items-center justify-between text-sm">
                      <span>{link.name}</span>
                      <span className="text-[var(--color-text-muted)]">{link.clicks} cliques</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-[var(--color-text-muted)]">0 links</p>
              )}
            </Card>
            <Card>
              <CardTitle>Campanhas recentes</CardTitle>
              {overview.data.recentCampaigns.length ? (
                <ul className="mt-4 space-y-3">
                  {overview.data.recentCampaigns.map((campaign) => (
                    <li key={campaign.id} className="flex items-center justify-between text-sm">
                      <span>{campaign.name}</span>
                      <Badge tone={campaign.status === "ACTIVE" ? "success" : "neutral"}>{campaign.status}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-[var(--color-text-muted)]">0 campanhas</p>
              )}
            </Card>
          </section>

          <Card>
            <CardTitle>Atividades recentes</CardTitle>
            {overview.data.recentActivity.length ? (
              <ul className="mt-4 space-y-3">
                {overview.data.recentActivity.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span>
                      <Badge tone="accent">{item.type}</Badge> <span className="ml-2">{item.label}</span>
                    </span>
                    <span className="text-[var(--color-text-muted)]">
                      {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--color-text-muted)]">Nenhuma atividade ainda.</p>
            )}
          </Card>
        </>
      ) : null}

      <Card>
        <CardTitle>Status da plataforma</CardTitle>
        <div className="mt-4">
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
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </Card>
  );
}
