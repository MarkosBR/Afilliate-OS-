import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AffiliateLink, LinkStatus } from "@affiliateos/shared";
import { api } from "../lib/api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";
import { Loading } from "../components/ui/Loading";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/Table";
import { useToast } from "../components/ui/Toast";

const emptyForm = {
  productId: "",
  campaignId: "",
  name: "",
  url: "",
  slug: "",
  status: "ACTIVE" as LinkStatus,
};

export function LinksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const links = useQuery({ queryKey: ["links"], queryFn: api.links.list });
  const products = useQuery({ queryKey: ["products"], queryFn: api.products.list });
  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: api.campaigns.list });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AffiliateLink | null>(null);
  const [form, setForm] = useState(emptyForm);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        productId: form.productId,
        name: form.name,
        url: form.url || undefined,
        slug: form.slug || undefined,
        status: form.status,
        campaignId: form.campaignId || null,
      };
      if (editing) return api.links.update(editing.id, payload);
      return api.links.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["links"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      toast.push(editing ? "Link atualizado." : "Link criado.");
      setOpen(false);
    },
  });

  const toggle = useMutation({
    mutationFn: (link: AffiliateLink) =>
      api.links.update(link.id, { status: link.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["links"] });
      toast.push("Status atualizado.");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.links.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["links"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      toast.push("Link excluido.");
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, productId: products.data?.[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(link: AffiliateLink) {
    setEditing(link);
    setForm({
      productId: link.productId,
      campaignId: link.campaignId ?? "",
      name: link.name,
      url: link.url,
      slug: link.slug,
      status: link.status,
    });
    setOpen(true);
  }

  async function copy(path: string) {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    toast.push("Link rastreavel copiado.");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  const filteredCampaigns = campaigns.data?.filter((item) => item.productId === form.productId) ?? [];

  if (links.isLoading) return <Loading label="Carregando links..." />;
  if (links.isError) return <ErrorState onRetry={() => links.refetch()} />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Links</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Links rastreaveis com slug unico e cliques reais.</p>
        </div>
        <Button onClick={openCreate} disabled={!products.data?.length}>
          + Criar link
        </Button>
      </div>

      {!links.data?.length ? (
        <EmptyState
          title="Nenhum link"
          description={products.data?.length ? "Crie um link rastreavel associado a um produto." : "Crie um produto antes de gerar links."}
          module="Links"
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>Produto</TH>
              <TH>Slug</TH>
              <TH>URL rastreavel</TH>
              <TH>Cliques</TH>
              <TH>Status</TH>
              <TH>Criado</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {links.data.map((link) => (
              <TR key={link.id}>
                <TD>{link.name}</TD>
                <TD>{link.product?.name ?? link.productId}</TD>
                <TD className="font-mono text-xs">{link.slug}</TD>
                <TD className="max-w-[12rem] truncate font-mono text-xs">{link.trackUrl}</TD>
                <TD>{link.clicks}</TD>
                <TD>
                  <Badge tone={link.status === "ACTIVE" ? "success" : "neutral"}>{link.status}</Badge>
                </TD>
                <TD className="text-xs text-[var(--color-text-muted)]">
                  {new Date(link.createdAt).toLocaleDateString("pt-BR")}
                </TD>
                <TD className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => void copy(link.trackUrl)}>
                    Copiar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/links/${link.id}`)}>
                    Ver
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(link)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggle.mutate(link)}>
                    {link.status === "ACTIVE" ? "Desativar" : "Ativar"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(link.id)}>
                    Excluir
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Modal open={open} title={editing ? "Editar link" : "Novo link"} onClose={() => setOpen(false)}>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <Select
            label="Produto"
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value, campaignId: "" })}
          >
            <option value="">Selecione</option>
            {products.data?.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
          <Select
            label="Campanha"
            value={form.campaignId}
            onChange={(e) => setForm({ ...form, campaignId: e.target.value })}
          >
            <option value="">Nenhuma</option>
            {filteredCampaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </Select>
          <Input label="Nome" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            label="Slug"
            placeholder="gerado automaticamente se vazio"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <Input
            label="URL de afiliado"
            type="url"
            placeholder="Usa o link do produto se vazio"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as LinkStatus })}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
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
