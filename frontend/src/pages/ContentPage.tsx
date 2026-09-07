import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Content, ContentKind, ContentStatus, ContentTone } from "@affiliateos/shared";
import { api, ApiError } from "../lib/api";
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

const kinds: ContentKind[] = ["POST", "CAPTION", "AD", "PRODUCT_DESCRIPTION", "SCRIPT"];
const tones: ContentTone[] = ["professional", "casual", "persuasive", "urgent", "friendly"];

const emptyForm = {
  productId: "",
  campaignId: "",
  linkId: "",
  title: "",
  body: "",
  kind: "POST" as ContentKind,
  channel: "",
  status: "DRAFT" as ContentStatus,
  source: "MANUAL" as Content["source"],
  generatedBy: "",
};

export function ContentPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const contents = useQuery({ queryKey: ["contents"], queryFn: api.content.list });
  const products = useQuery({ queryKey: ["products"], queryFn: api.products.list });
  const campaigns = useQuery({ queryKey: ["campaigns"], queryFn: api.campaigns.list });
  const links = useQuery({ queryKey: ["links"], queryFn: api.links.list });
  const aiStatus = useQuery({ queryKey: ["ai-status"], queryFn: api.ai.status });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Content | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [tone, setTone] = useState<ContentTone>("professional");
  const [extraContext, setExtraContext] = useState("");
  const [titles, setTitles] = useState<string[]>([]);

  const filteredCampaigns = useMemo(
    () => campaigns.data?.filter((campaign) => !form.productId || campaign.productId === form.productId) ?? [],
    [campaigns.data, form.productId],
  );
  const filteredLinks = useMemo(
    () => links.data?.filter((link) => !form.productId || link.productId === form.productId) ?? [],
    [links.data, form.productId],
  );

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        productId: form.productId || null,
        campaignId: form.campaignId || null,
        linkId: form.linkId || null,
        title: form.title,
        body: form.body || null,
        kind: form.kind,
        channel: form.channel || null,
        status: form.status,
        source: form.source,
        generatedBy: form.source === "AI" ? form.generatedBy || null : null,
      };
      if (editing) return api.content.update(editing.id, payload);
      return api.content.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contents"] });
      toast.push(editing ? "Conteudo atualizado." : "Conteudo salvo como rascunho.");
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.content.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contents"] });
      toast.push("Conteudo excluido.");
    },
  });

  const generate = useMutation({
    mutationFn: () =>
      api.ai.generate({
        productId: form.productId,
        campaignId: form.campaignId || null,
        kind: form.kind,
        tone,
        extraContext: extraContext || null,
      }),
    onSuccess: (result) => {
      setForm((current) => ({
        ...current,
        title: result.title,
        body: result.body,
        source: "AI",
        generatedBy: result.provider,
        status: "DRAFT",
      }));
      setTitles(result.titles);
      toast.push("Rascunho gerado. Revise antes de salvar.");
    },
  });

  function openCreate() {
    setEditing(null);
    setTitles([]);
    setExtraContext("");
    setTone("professional");
    setForm({
      ...emptyForm,
      productId: products.data?.[0]?.id ?? "",
    });
    setOpen(true);
  }

  function openEdit(item: Content) {
    setEditing(item);
    setTitles([]);
    setExtraContext("");
    setForm({
      productId: item.productId ?? "",
      campaignId: item.campaignId ?? "",
      linkId: item.linkId ?? "",
      title: item.title,
      body: item.body ?? "",
      kind: item.kind,
      channel: item.channel ?? "",
      status: item.status,
      source: item.source,
      generatedBy: item.generatedBy ?? "",
    });
    setOpen(true);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  const generateError =
    generate.error instanceof ApiError
      ? generate.error.code === "AI_NOT_CONFIGURED"
        ? "Provedor de IA nao configurado."
        : generate.error.message
      : generate.error
        ? generate.error.message
        : null;

  if (contents.isLoading) return <Loading label="Carregando conteudos..." />;
  if (contents.isError) return <ErrorState onRetry={() => contents.refetch()} />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Conteudo</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            CRUD de pecas e geracao de rascunhos com IA, sem publicacao automatica.
          </p>
        </div>
        <Button onClick={openCreate}>Novo conteudo</Button>
      </div>

      {!contents.data?.length ? (
        <EmptyState
          title="Nenhum conteudo"
          description="Crie manualmente ou gere um rascunho a partir de um produto real."
          module="Conteudo"
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Titulo</TH>
              <TH>Tipo</TH>
              <TH>Produto</TH>
              <TH>Origem</TH>
              <TH>Status</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {contents.data.map((item) => (
              <TR key={item.id}>
                <TD>{item.title}</TD>
                <TD>{item.kind}</TD>
                <TD>{item.product?.name ?? "-"}</TD>
                <TD>
                  <Badge tone={item.source === "AI" ? "success" : "neutral"}>{item.source}</Badge>
                </TD>
                <TD>
                  <Badge tone={item.status === "PUBLISHED" ? "success" : "neutral"}>{item.status}</Badge>
                </TD>
                <TD className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(item.id)}>
                    Excluir
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Modal open={open} title={editing ? "Editar conteudo" : "Novo conteudo"} onClose={() => setOpen(false)}>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <Select
            label="Produto"
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value, campaignId: "", linkId: "" })}
          >
            <option value="">Nenhum</option>
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
          <Select label="Link" value={form.linkId} onChange={(e) => setForm({ ...form, linkId: e.target.value })}>
            <option value="">Nenhum</option>
            {filteredLinks.map((link) => (
              <option key={link.id} value={link.id}>
                {link.name}
              </option>
            ))}
          </Select>
          <Select
            label="Tipo"
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as ContentKind })}
          >
            {kinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </Select>
          <Select label="Tom" value={tone} onChange={(e) => setTone(e.target.value as ContentTone)}>
            {tones.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Textarea
            label="Contexto extra"
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
          />
          {!aiStatus.data?.configured ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              IA indisponivel: configure AI_PROVIDER e AI_API_KEY no ambiente.
            </p>
          ) : null}
          {generateError ? <p className="text-sm text-[var(--color-danger)]">{generateError}</p> : null}
          <Button
            type="button"
            variant="ghost"
            disabled={generate.isPending || !form.productId}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? "Gerando..." : "Gerar rascunho com IA"}
          </Button>
          {titles.length ? (
            <Select
              label="Titulos gerados"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            >
              {titles.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </Select>
          ) : null}
          <Input label="Titulo" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Corpo" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <Input label="Canal" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="ARCHIVED">ARCHIVED</option>
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
