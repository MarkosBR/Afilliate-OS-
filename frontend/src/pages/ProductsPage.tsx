import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Product, ProductPlatform, ProductStatus } from "@affiliateos/shared";
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
import { Textarea } from "../components/ui/Textarea";
import { useToast } from "../components/ui/Toast";

const emptyForm = {
  name: "",
  description: "",
  platform: "HOTMART" as ProductPlatform,
  externalId: "",
  affiliateUrl: "",
  commission: "0",
  status: "ACTIVE" as ProductStatus,
};

export function ProductsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const products = useQuery({ queryKey: ["products"], queryFn: api.products.list });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        description: form.description || null,
        platform: form.platform,
        externalId: form.externalId || null,
        affiliateUrl: form.affiliateUrl,
        commission: Number(form.commission),
        status: form.status,
      };
      if (editing) return api.products.update(editing.id, payload);
      return api.products.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      toast.push(editing ? "Produto atualizado." : "Produto criado.");
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.products.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      toast.push("Produto excluido.");
    },
  });

  const title = useMemo(() => (editing ? "Editar produto" : "Novo produto"), [editing]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      platform: product.platform,
      externalId: product.externalId ?? "",
      affiliateUrl: product.affiliateUrl,
      commission: String(product.commission),
      status: product.status,
    });
    setOpen(true);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  if (products.isLoading) return <Loading label="Carregando produtos..." />;
  if (products.isError) return <ErrorState onRetry={() => products.refetch()} />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Produtos</h2>
          <p className="text-sm text-[var(--color-text-muted)]">CRUD isolado por usuario.</p>
        </div>
        <Button onClick={openCreate}>Novo produto</Button>
      </div>

      {!products.data?.length ? (
        <EmptyState
          title="Nenhum produto"
          description="Crie o primeiro produto afiliado. Nenhum dado ficticio e exibido."
          module="Produtos"
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>Plataforma</TH>
              <TH>Comissao</TH>
              <TH>Status</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {products.data.map((product) => (
              <TR key={product.id}>
                <TD>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{product.externalId || product.affiliateUrl}</p>
                </TD>
                <TD>{product.platform}</TD>
                <TD>{product.commission}%</TD>
                <TD>
                  <Badge tone={product.status === "ACTIVE" ? "success" : "neutral"}>{product.status}</Badge>
                </TD>
                <TD className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(product)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(product.id)}>
                    Excluir
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Modal open={open} title={title} onClose={() => setOpen(false)}>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <Input label="Nome" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea
            label="Descricao"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Select
            label="Plataforma"
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value as ProductPlatform })}
          >
            <option value="HOTMART">Hotmart</option>
            <option value="EDUZZ">Eduzz</option>
            <option value="KIWIFY">Kiwify</option>
            <option value="OTHER">Outro</option>
          </Select>
          <Input
            label="ID externo"
            value={form.externalId}
            onChange={(e) => setForm({ ...form, externalId: e.target.value })}
          />
          <Input
            label="Link de afiliado"
            type="url"
            required
            value={form.affiliateUrl}
            onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })}
          />
          <Input
            label="Comissao (%)"
            type="number"
            min={0}
            step="0.01"
            required
            value={form.commission}
            onChange={(e) => setForm({ ...form, commission: e.target.value })}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </Select>
          {save.error ? <p className="text-sm text-[var(--color-danger)]">{save.error.message}</p> : null}
          <Button type="submit" disabled={save.isPending}>
            Salvar
          </Button>
        </form>
      </Modal>
    </div>
  );
}
