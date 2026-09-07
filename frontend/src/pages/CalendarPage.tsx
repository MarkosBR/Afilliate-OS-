import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Content, PublicationPlatform, PublicationStatus } from "@affiliateos/shared";
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

const platforms: PublicationPlatform[] = ["INSTAGRAM", "TIKTOK", "YOUTUBE", "FACEBOOK", "OTHER"];
const statuses: PublicationStatus[] = ["PENDING", "SCHEDULED", "READY", "PUBLISHED", "FAILED", "CANCELLED"];

function toLocalInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  date.setHours(0, 0, 0, 0);
  return toLocalInput(date);
}

function defaultTo() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  date.setHours(23, 59, 0, 0);
  return toLocalInput(date);
}

function defaultScheduleAt() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setMinutes(0, 0, 0);
  return toLocalInput(date);
}

export function CalendarPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [status, setStatus] = useState("");
  const [platform, setPlatform] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Content | null>(null);
  const [scheduleAt, setScheduleAt] = useState(defaultScheduleAt);
  const [schedulePlatform, setSchedulePlatform] = useState<PublicationPlatform>("INSTAGRAM");

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (from) search.set("from", new Date(from).toISOString());
    if (to) search.set("to", new Date(to).toISOString());
    if (status) search.set("status", status);
    if (platform) search.set("platform", platform);
    const value = search.toString();
    return value ? `?${value}` : "";
  }, [from, to, status, platform]);

  const calendar = useQuery({
    queryKey: ["calendar", params],
    queryFn: () => api.calendar.list(params),
  });
  const contents = useQuery({ queryKey: ["contents"], queryFn: api.content.list });

  const approve = useMutation({
    mutationFn: (id: string) => api.content.approve(id),
    onSuccess: async (item) => {
      await queryClient.invalidateQueries({ queryKey: ["contents"] });
      setSelected(item);
      toast.push("Conteudo aprovado.");
    },
  });

  const schedule = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecione um conteudo.");
      return api.content.schedule(selected.id, {
        platform: schedulePlatform,
        scheduledAt: new Date(scheduleAt).toISOString(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendar"] });
      await queryClient.invalidateQueries({ queryKey: ["contents"] });
      toast.push("Conteudo agendado.");
      setOpen(false);
    },
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.publications.cancel(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendar"] });
      await queryClient.invalidateQueries({ queryKey: ["contents"] });
      toast.push("Agendamento cancelado.");
    },
  });

  function openSchedule(item: Content) {
    setSelected(item);
    setScheduleAt(defaultScheduleAt());
    setSchedulePlatform("INSTAGRAM");
    setOpen(true);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    schedule.mutate();
  }

  if (calendar.isLoading) return <Loading label="Carregando calendario..." />;
  if (calendar.isError) return <ErrorState onRetry={() => calendar.refetch()} />;

  const schedulable = contents.data?.filter((item) => item.status === "APPROVED" || item.status === "DRAFT" || item.status === "FAILED") ?? [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Calendario</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Aprovar, agendar e cancelar pecas. Nenhuma publicacao externa e enviada nesta fase.
          </p>
        </div>
        <Button onClick={() => schedulable[0] && openSchedule(schedulable[0])} disabled={!schedulable.length}>
          Agendar
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input label="De" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Ate" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Select label="Plataforma" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="">Todas</option>
          {platforms.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      {!contents.data?.length ? (
        <EmptyState title="Nenhum conteudo" description="Crie um rascunho em Conteudo antes de agendar." module="Calendario" />
      ) : !calendar.data?.length ? (
        <EmptyState title="Nenhum agendamento" description="Aprove um conteudo e defina data e plataforma." module="Calendario" />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Data</TH>
              <TH>Conteudo</TH>
              <TH>Plataforma</TH>
              <TH>Status</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {calendar.data.map((item) => (
              <TR key={item.id}>
                <TD>{new Date(item.scheduledAt).toLocaleString("pt-BR")}</TD>
                <TD>{item.content?.title ?? item.contentId}</TD>
                <TD>{item.platform}</TD>
                <TD>
                  <Badge tone={item.status === "FAILED" ? "danger" : item.status === "CANCELLED" ? "neutral" : "accent"}>
                    {item.status}
                  </Badge>
                </TD>
                <TD className="text-right">
                  {item.status === "SCHEDULED" || item.status === "PENDING" || item.status === "READY" ? (
                    <Button variant="ghost" size="sm" onClick={() => cancel.mutate(item.id)}>
                      Cancelar
                    </Button>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Modal open={open} title="Agendar conteudo" onClose={() => setOpen(false)}>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <Select
            label="Conteudo"
            value={selected?.id ?? ""}
            onChange={(e) => setSelected(contents.data?.find((item) => item.id === e.target.value) ?? null)}
          >
            <option value="">Selecione</option>
            {contents.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} ({item.status})
              </option>
            ))}
          </Select>
          {selected && (selected.status === "DRAFT" || selected.status === "FAILED") ? (
            <Button type="button" variant="ghost" onClick={() => approve.mutate(selected.id)} disabled={approve.isPending}>
              Aprovar rascunho
            </Button>
          ) : null}
          <Select
            label="Plataforma"
            value={schedulePlatform}
            onChange={(e) => setSchedulePlatform(e.target.value as PublicationPlatform)}
          >
            {platforms.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Input
            label="Data e hora"
            type="datetime-local"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            required
          />
          {schedule.error ? <p className="text-sm text-[var(--color-danger)]">{schedule.error.message}</p> : null}
          <Button type="submit" disabled={schedule.isPending || !selected}>
            Agendar
          </Button>
        </form>
      </Modal>
    </div>
  );
}
