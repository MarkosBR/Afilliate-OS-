import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Loading } from "../components/ui/Loading";
import { Select } from "../components/ui/Select";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/Table";

export function AnalyticsPage() {
  const [range, setRange] = useState("7d");
  const [linkId, setLinkId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const links = useQuery({ queryKey: ["links"], queryFn: api.links.list });
  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: api.campaigns.list });

  const params = useMemo(() => {
    const search = new URLSearchParams({ range });
    if (linkId) search.set("linkId", linkId);
    if (campaignId) search.set("campaignId", campaignId);
    return `?${search.toString()}`;
  }, [range, linkId, campaignId]);

  const report = useQuery({
    queryKey: ["analytics-report-page", params],
    queryFn: () => api.analytics.report(params),
  });

  if (report.isLoading) return <Loading label="Carregando analytics..." />;
  if (report.isError || !report.data) return <ErrorState onRetry={() => report.refetch()} />;

  const hasClicks = report.data.summary.clicks > 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Analytics</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Cliques reais de tracking. Sem dados ficticios.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={range} onChange={(e) => setRange(e.target.value)} className="w-40">
            <option value="today">Hoje</option>
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
          </Select>
          <Select value={linkId} onChange={(e) => setLinkId(e.target.value)} className="w-48">
            <option value="">Todos os links</option>
            {links.data?.map((link) => (
              <option key={link.id} value={link.id}>
                {link.name}
              </option>
            ))}
          </Select>
          <Select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="w-48">
            <option value="">Todas as campanhas</option>
            {campaigns.data?.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Cliques</p>
          <p className="mt-2 text-3xl font-semibold">{report.data.summary.clicks}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Cliques unicos</p>
          <p className="mt-2 text-3xl font-semibold">{report.data.summary.uniqueClicks}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Links ativos</p>
          <p className="mt-2 text-3xl font-semibold">{report.data.summary.activeLinks}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Fonte principal</p>
          <p className="mt-2 text-xl font-semibold">{report.data.summary.topSource}</p>
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
          <h3 className="mb-3 font-semibold">Cliques por link</h3>
          {report.data.clicksByLink?.length ? (
            <Table>
              <THead>
                <TR>
                  <TH>Link</TH>
                  <TH>Cliques</TH>
                </TR>
              </THead>
              <TBody>
                {report.data.clicksByLink.map((item) => (
                  <TR key={item.id}>
                    <TD>{item.name}</TD>
                    <TD>{item.clicks}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">0 links</p>
          )}
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold">Campanhas</h3>
          {report.data.topCampaigns.length ? (
            <Table>
              <THead>
                <TR>
                  <TH>Campanha</TH>
                  <TH>Cliques</TH>
                </TR>
              </THead>
              <TBody>
                {report.data.topCampaigns.map((item) => (
                  <TR key={item.id}>
                    <TD>{item.name}</TD>
                    <TD>{item.clicks}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">0 campanhas</p>
          )}
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Origens</h3>
          {report.data.topSources.length ? (
            <ul className="space-y-2 text-sm">
              {report.data.topSources.map((item) => (
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
          <h3 className="mb-3 font-semibold">UTM</h3>
          {report.data.utmCampaigns.length ? (
            <ul className="space-y-2 text-sm">
              {report.data.utmCampaigns.map((item) => (
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
