import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Loading } from "../components/ui/Loading";
import { Select } from "../components/ui/Select";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/Table";

export function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const breakdown = useQuery({
    queryKey: ["analytics-breakdown", days],
    queryFn: () => api.analytics.breakdown(days),
  });

  if (breakdown.isLoading) return <Loading label="Carregando analytics..." />;
  if (breakdown.isError || !breakdown.data) {
    return <ErrorState onRetry={() => breakdown.refetch()} />;
  }

  const { summary } = breakdown.data;
  const hasClicks = summary.clicks > 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Analytics</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Cliques reais de tracking. Sem dados ficticios.</p>
        </div>
        <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-40">
          <option value="7">7 dias</option>
          <option value="14">14 dias</option>
          <option value="30">30 dias</option>
        </Select>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Cliques</p>
          <p className="mt-2 text-3xl font-semibold">{summary.clicks}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Links ativos</p>
          <p className="mt-2 text-3xl font-semibold">{summary.activeLinks}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Produtos</p>
          <p className="mt-2 text-3xl font-semibold">{summary.products}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Campanhas</p>
          <p className="mt-2 text-3xl font-semibold">{summary.campaigns}</p>
        </Card>
      </section>

      {!hasClicks ? (
        <EmptyState
          title="Sem cliques ainda"
          description="Nenhum evento de tracking no periodo. Esta tela nao usa dados ficticios."
          module="Analytics"
        />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Cliques por produto</h3>
          {breakdown.data.clicksByProduct.length ? (
            <Table>
              <THead>
                <TR>
                  <TH>Produto</TH>
                  <TH>Cliques</TH>
                </TR>
              </THead>
              <TBody>
                {breakdown.data.clicksByProduct.map((item) => (
                  <TR key={item.id}>
                    <TD>{item.name}</TD>
                    <TD>{item.clicks}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">0 produtos</p>
          )}
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold">Cliques por link</h3>
          {breakdown.data.clicksByLink.length ? (
            <Table>
              <THead>
                <TR>
                  <TH>Link</TH>
                  <TH>Periodo</TH>
                  <TH>Total</TH>
                </TR>
              </THead>
              <TBody>
                {breakdown.data.clicksByLink.map((item) => (
                  <TR key={item.id}>
                    <TD>{item.name}</TD>
                    <TD>{item.clicks}</TD>
                    <TD>{item.totalClicks}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">0 links</p>
          )}
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Principais origens</h3>
          {breakdown.data.origins.length ? (
            <ul className="space-y-2 text-sm">
              {breakdown.data.origins.map((item) => (
                <li key={item.label} className="flex justify-between">
                  <span className="truncate">{item.label}</span>
                  <span>{item.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">0 origens</p>
          )}
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold">Campanhas UTM</h3>
          {breakdown.data.utmCampaigns.length ? (
            <ul className="space-y-2 text-sm">
              {breakdown.data.utmCampaigns.map((item) => (
                <li key={item.label} className="flex justify-between">
                  <span className="truncate">{item.label}</span>
                  <span>{item.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">0 campanhas UTM</p>
          )}
        </Card>
      </section>
    </div>
  );
}
