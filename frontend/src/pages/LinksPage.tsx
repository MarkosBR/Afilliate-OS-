import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AffiliateLink } from "@affiliateos/shared";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";
import { Loading } from "../components/ui/Loading";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/Table";
import { useToast } from "../components/ui/Toast";

export function LinksPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const links = useQuery({ queryKey: ["links"], queryFn: api.links.list });
  const products = useQuery({ queryKey: ["products"], queryFn: api.products.list });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AffiliateLink | null>(null);
  const [form, setForm] = useState({ productId: "", name: "", url: "" });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { productId: form.productId, name: form.name, url: form.url || undefined };
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
    setForm({ productId: products.data?.[0]?.id ?? "", name: "", url: "" });
    setOpen(true);
  }

  function openEdit(link: AffiliateLink) {
    setEditing(link);
    setForm({ productId: link.productId, name: link.name, url: link.url });
    setOpen(true);
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    toast.push("Link copiado.");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  if (links.isLoading) return <Loading label="Carregando links..." />;
  if (links.isError) return <ErrorState onRetry={() => links.refetch()} />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Links</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Cada link pertence a um produto da sua conta.</p>
        </div>
        <Button onClick={openCreate} disabled={!products.data?.length}>
          Novo link
        </Button>
      </div>

      {!links.data?.length ? (
        <EmptyState
          title="Nenhum link"
          description={products.data?.length ? "Crie um link associado a um produto." : "Crie um produto antes de gerar links."}
          module="Links"
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>Produto</TH>
              <TH>URL</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {links.data.map((link) => (
              <TR key={link.id}>
                <TD>{link.name}</TD>
                <TD>{link.product?.name ?? link.productId}</TD>
                <TD className="max-w-xs truncate">{link.url}</TD>
                <TD className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => void copy(link.url)}>
                    Copiar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(link)}>
                    Editar
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
          <Input
            label="URL"
            type="url"
            placeholder="Usa o link do produto se vazio"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          {save.error ? <p className="text-sm text-[var(--color-danger)]">{save.error.message}</p> : null}
          <Button type="submit" disabled={save.isPending || !form.productId}>
            Salvar
          </Button>
        </form>
      </Modal>
    </div>
  );
}
