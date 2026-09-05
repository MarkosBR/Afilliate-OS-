import { useQuery } from "@tanstack/react-query";
import { api, formatCurrency } from "../lib/api";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Loading } from "../components/ui/Loading";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/Table";

export function AnalyticsPage() {
  const summary = useQuery({ queryKey: ["analytics-summary"], queryFn: api.analytics.summary });
  const products = useQuery({ queryKey: ["products"], queryFn: api.products.list });
  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: api.campaigns.list });

  if (summary.isLoading) return <Loading label="Carregando analytics..." />;
  if (summary.isError || !summary.data) {
    return <ErrorState onRetry={() => summary.refetch()} />;
  }

  const hasActivity =
    summary.data.products + summary.data.links + summary.data.campaigns + summary.data.clicks > 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">Analytics</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Visualizacao inicial. Cliques, conversoes e receita so aparecem se existirem eventos reais.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Cliques</p>
          <p className="mt-2 text-3xl font-semibold">{summary.data.clicks}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Conversoes</p>
          <p className="mt-2 text-3xl font-semibold">{summary.data.conversions}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Receita</p>
          <p className="mt-2 text-3xl font-semibold">{formatCurrency(summary.data.revenue)}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">CTR</p>
          <p className="mt-2 text-3xl font-semibold">{summary.data.ctr}%</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Produtos</p>
          <p className="mt-2 text-3xl font-semibold">{summary.data.products}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Campanhas</p>
          <p className="mt-2 text-3xl font-semibold">{summary.data.campaigns}</p>
        </Card>
      </section>

      {!hasActivity ? (
        <EmptyState
          title="Sem eventos ainda"
          description="Nao ha cliques, conversoes ou receita registrados. Esta tela nao usa dados ficticios."
          module="Analytics"
        />
      ) : null}

      <Card>
        <h3 className="mb-3 font-semibold">Produtos</h3>
        {products.data?.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Nome</TH>
                <TH>Plataforma</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {products.data.map((product) => (
                <TR key={product.id}>
                  <TD>{product.name}</TD>
                  <TD>{product.platform}</TD>
                  <TD>{product.status}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">0 produtos</p>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Campanhas</h3>
        {campaigns.data?.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Nome</TH>
                <TH>Produto</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {campaigns.data.map((campaign) => (
                <TR key={campaign.id}>
                  <TD>{campaign.name}</TD>
                  <TD>{campaign.product?.name ?? campaign.productId}</TD>
                  <TD>{campaign.status}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">0 campanhas</p>
        )}
      </Card>
    </div>
  );
}
