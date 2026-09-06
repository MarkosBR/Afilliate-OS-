import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardDescription, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { Loading } from "../components/ui/Loading";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { api, fetchHealth } from "../lib/api";
import { useAuth } from "../lib/auth";

function queryString(filters: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function DashboardPage() {
  const { user } = useAuth();
  const [range, setRange] = useState("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [linkId, setLinkId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");

  const links = useQuery({ queryKey: ["links"], queryFn: api.links.list });
  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: api.campaigns.list });
  const health = useQuery({ queryKey: ["health"], queryFn: fetchHealth, retry: false });

  const filters = useMemo(
    () => ({
      range: range === "custom" ? "custom" : range,
      from: range === "custom" ? from : "",
      to: range === "custom" ? to : "",
      linkId,
      campaignId,
      utmSource,
      utmMedium,
      utmCampaign,
    }),
    [range, from, to, linkId, campaignId, utmSource, utmMedium, utmCampaign],
  );

  const report = useQuery({
    queryKey: ["analytics-report", filters],
    queryFn: () => api.analytics.report(queryString(filters)),
    enabled: range !== "custom" || Boolean(from && to),
  });

  const maxPoint = Math.max(1, ...(report.data?.series.map((point) => point.clicks) ?? [0]));
  const hasClicks = (report.data?.summary.clicks ?? 0) > 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Operacao</p>
          <h2 className="text-2xl font-semibold">Ola, {user?.name}</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Metricas reais do tracking. Sem dados inventados.</p>
        </div>
      </section>

      <Card>
        <CardTitle>Filtros</CardTitle>
        <CardDescription>Periodo, link, campanha e UTM alteram os dados do dashboard.</CardDescription>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Select label="Periodo" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">Hoje</option>
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="custom">Personalizado</option>
          </Select>
          {range === "custom" ? (
            <>
              <Input label="De" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input label="Ate" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </>
          ) : null}
          <Select label="Link" value={linkId} onChange={(e) => setLinkId(e.target.value)}>
            <option value="">Todos</option>
            {links.data?.map((link) => (
              <option key={link.id} value={link.id}>
                {link.name}
              </option>
            ))}
          </Select>
          <Select label="Campanha" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">Todas</option>
            {campaigns.data?.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </Select>
          <Input label="UTM source" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} />
          <Input label="UTM medium" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} />
          <Input label="UTM campaign" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} />
        </div>
      </Card>

      {report.isLoading ? <Loading label="Carregando analytics..." /> : null}
      {report.isError ? <ErrorState title="Nao foi possivel carregar o dashboard" onRetry={() => report.refetch()} /> : null}

      {report.data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric title="Cliques" value={String(report.data.summary.clicks)} />
            <Metric title="Cliques unicos" value={String(report.data.summary.uniqueClicks)} />
            <Metric title="Links ativos" value={String(report.data.summary.activeLinks)} />
            <Metric title="Campanhas ativas" value={String(report.data.summary.activeCampaigns)} />
            <Metric title="Principal fonte" value={report.data.summary.topSource || "direct"} />
          </section>

          <Card>
            <CardTitle>Evolucao de cliques</CardTitle>
            <CardDescription>Agregacao diaria no periodo filtrado.</CardDescription>
            {!hasClicks ? (
              <p className="mt-4 text-sm text-[var(--color-text-muted)]">Sem cliques no periodo selecionado.</p>
            ) : (
              <div className="mt-4 flex h-40 items-end gap-1">
                {report.data.series.map((point) => (
                  <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-[var(--color-accent)]/80 transition-all"
                      style={{ height: `${Math.max(4, (point.clicks / maxPoint) * 100)}%` }}
                      title={`${point.date}: ${point.clicks} cliques`}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {!hasClicks && !report.data.topLinks.length ? (
            <EmptyState title="Nenhum clique" description="Crie um link rastreavel e compartilhe /go/slug para ver metricas reais." module="Dashboard" />
          ) : null}

          <section className="grid gap-4 lg:grid-cols-3">
            <RankCard title="Links com mais cliques" empty="0 links" items={report.data.topLinks.map((item) => ({ id: item.id, label: item.name, value: item.clicks }))} />
            <RankCard title="Principais fontes" empty="0 fontes" items={report.data.topSources.map((item) => ({ id: item.label, label: item.label, value: item.count }))} />
            <RankCard title="Campanhas" empty="0 campanhas" items={report.data.topCampaigns.map((item) => ({ id: item.id, label: item.name, value: item.clicks }))} />
          </section>
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
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value || "0"}</p>
    </Card>
  );
}

function RankCard({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; label: string; value: number }>;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {items.length ? (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{item.label}</span>
              <span className="text-[var(--color-text-muted)]">{item.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">{empty}</p>
      )}
    </Card>
  );
}
