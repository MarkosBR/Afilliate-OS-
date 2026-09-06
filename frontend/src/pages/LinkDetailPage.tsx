import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Badge } from "../components/ui/Badge";
import { Card, CardDescription, CardTitle } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { Loading } from "../components/ui/Loading";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/Table";

export function LinkDetailPage() {
  const { id = "" } = useParams();
  const stats = useQuery({
    queryKey: ["link-stats", id],
    queryFn: () => api.links.stats(id),
    enabled: Boolean(id),
  });

  if (stats.isLoading) return <Loading label="Carregando link..." />;
  if (stats.isError || !stats.data) return <ErrorState onRetry={() => stats.refetch()} />;

  const { link } = stats.data;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Tracking</p>
        <h2 className="text-xl font-semibold">{link.name}</h2>
        <p className="text-sm text-[var(--color-text-muted)]">{link.product?.name ?? link.productId}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Cliques totais</p>
          <p className="mt-2 text-3xl font-semibold">{stats.data.clicks}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Cliques recentes</p>
          <p className="mt-2 text-3xl font-semibold">{stats.data.periodClicks}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Status</p>
          <div className="mt-3">
            <Badge tone={link.status === "ACTIVE" ? "success" : "neutral"}>{link.status}</Badge>
          </div>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Slug</p>
          <p className="mt-2 font-mono text-sm">{link.slug}</p>
        </Card>
      </section>

      <Card>
        <CardTitle>URLs</CardTitle>
        <CardDescription>Rastreavel e destino. Sem dados internos.</CardDescription>
        <p className="mt-3 text-sm">Rastreavel: <span className="font-mono">{link.trackUrl}</span></p>
        <p className="mt-1 truncate text-sm">Destino: <span className="font-mono">{link.url}</span></p>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Origens</CardTitle>
          {stats.data.origins.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {stats.data.origins.map((item) => (
                <li key={item.label} className="flex justify-between">
                  <span className="truncate">{item.label}</span>
                  <span>{item.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">0 origens</p>
          )}
        </Card>
        <Card>
          <CardTitle>UTM</CardTitle>
          {stats.data.utmCampaigns.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {stats.data.utmCampaigns.map((item) => (
                <li key={item.label} className="flex justify-between">
                  <span className="truncate">{item.label}</span>
                  <span>{item.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">0 campanhas UTM</p>
          )}
        </Card>
      </section>

      <Card>
        <CardTitle>Cliques recentes</CardTitle>
        {stats.data.recentClicks.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Quando</TH>
                <TH>Origem</TH>
                <TH>UTM</TH>
              </TR>
            </THead>
            <TBody>
              {stats.data.recentClicks.map((event) => (
                <TR key={event.id}>
                  <TD>{new Date(event.createdAt).toLocaleString("pt-BR")}</TD>
                  <TD className="max-w-xs truncate">{event.referrer || "direct"}</TD>
                  <TD className="text-xs">
                    {[event.utmSource, event.utmMedium, event.utmCampaign].filter(Boolean).join(" / ") || "-"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">0 cliques</p>
        )}
      </Card>
    </div>
  );
}
