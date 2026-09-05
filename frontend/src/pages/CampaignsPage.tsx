import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Campaign, CampaignStatus } from "@affiliateos/shared";
import { api, formatCurrency } from "../lib/api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";
import { Loading } from "../components/ui/Loading";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/Table";
import { Textarea } from "../components/ui/Textarea";
import { useToast } from "../components/ui/Toast";

export function CampaignsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: api.campaigns.list });
  const products = useQuery({ queryKey: ["products"], queryFn: api.products.list });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState({
    productId: "",
    name: "",
    description: "",
    budget: "0",
    status: "DRAFT" as CampaignStatus,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        productId: form.productId,
        name: form.name,
        description: form.description || null,
        budget: Number(form.budget),
        status: form.status,
      };
      if (editing) return api.campaigns.update(editing.id, payload);
      return api.campaigns.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      toast.push(editing ? "Campanha atualizada." : "Campanha criada.");
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.campaigns.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      toast.push("Campanha excluida.");
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({
      productId: products.data?.[0]?.id ?? "",
      name: "",
      description: "",
      budget: "0",
      status: "DRAFT",
    });
    setOpen(true);
  }

  function openEdit(campaign: Campaign) {
    setEditing(campaign);
    setForm({
      productId: campaign.productId,
      name: campaign.name,
      description: campaign.description ?? "",
      budget: String(campaign.budget),
      status: campaign.status,
    });
    setOpen(true);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  if (campaigns.isLoading) return <Loading label="Carregando campanhas..." />;
  if (campaigns.isError) return <ErrorState onRetry={() => campaigns.refetch()} />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Campanhas</h2>
          <p className="text-sm text-[var(--color-text-muted)]">CRUD associado a produtos da sua conta.</p>
        </div>
        <Button onClick={openCreate} disabled={!products.data?.length}>
          Nova campanha
        </Button>
      </div>

      {!campaigns.data?.length ? (
        <EmptyState
          title="Nenhuma campanha"
          description="Crie uma campanha vinculada a um produto existente."
          module="Campanhas"
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>Produto</TH>
              <TH>Orcamento</TH>
              <TH>Status</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {campaigns.data.map((campaign) => (
              <TR key={campaign.id}>
                <TD>{campaign.name}</TD>
                <TD>{campaign.product?.name ?? campaign.productId}</TD>
                <TD>{formatCurrency(campaign.budget)}</TD>
                <TD>
                  <Badge tone={campaign.status === "ACTIVE" ? "success" : "neutral"}>{campaign.status}</Badge>
                </TD>
                <TD className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(campaign)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(campaign.id)}>
                    Excluir
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Modal open={open} title={editing ? "Editar campanha" : "Nova campanha"} onClose={() => setOpen(false)}>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <Select
            label="Produto"
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
          >
            <option value="">Selecione</option>
            {products.data?.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
          <Input label="Nome" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea
            label="Descricao"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Orcamento"
            type="number"
            min={0}
            step="0.01"
            required
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as CampaignStatus })}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="COMPLETED">COMPLETED</option>
          </Select>
          {save.error ? <p className="text-sm text-[var(--color-danger)]">{save.error.message}</p> : null}
          <Button type="submit" disabled={save.isPending || !form.productId}>
            Salvar
          </Button>
        </form>
      </Modal>
    </div>
  );
}
