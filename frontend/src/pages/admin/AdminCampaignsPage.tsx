import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, formatCurrency } from "../../lib/api";
import { Badge } from "../../components/ui/Badge";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { Loading } from "../../components/ui/Loading";
import { Select } from "../../components/ui/Select";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";

export function AdminCampaignsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const params = `?q=${encodeURIComponent(q)}${status ? `&status=${status}` : ""}`;
  const campaigns = useQuery({
    queryKey: ["admin-campaigns", params],
    queryFn: () => api.admin.campaigns(params),
  });

  if (campaigns.isLoading) return <Loading label="Carregando campanhas..." />;
  if (campaigns.isError || !campaigns.data) return <ErrorState onRetry={() => campaigns.refetch()} />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <h2 className="text-2xl font-semibold">Campanhas</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="Pesquisar" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PAUSED">PAUSED</option>
          <option value="COMPLETED">COMPLETED</option>
        </Select>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Campanha</TH>
            <TH>Proprietario</TH>
            <TH>Produto</TH>
            <TH>Orcamento</TH>
            <TH>Status</TH>
            <TH>Criacao</TH>
          </TR>
        </THead>
        <TBody>
          {campaigns.data.items.map((campaign) => (
            <TR key={campaign.id}>
              <TD>{campaign.name}</TD>
              <TD>{campaign.owner.name}</TD>
              <TD>{campaign.product?.name ?? campaign.productId}</TD>
              <TD>{formatCurrency(campaign.budget)}</TD>
              <TD>
                <Badge tone={campaign.status === "ACTIVE" ? "success" : "neutral"}>{campaign.status}</Badge>
              </TD>
              <TD>{new Date(campaign.createdAt).toLocaleDateString("pt-BR")}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
