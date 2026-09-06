import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserRole, UserStatus } from "@affiliateos/shared";
import { api } from "../../lib/api";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { Loading } from "../../components/ui/Loading";
import { Select } from "../../components/ui/Select";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { useToast } from "../../components/ui/Toast";

export function AdminUsersPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const params = `?q=${encodeURIComponent(q)}${status ? `&status=${status}` : ""}`;
  const users = useQuery({ queryKey: ["admin-users", params], queryFn: () => api.admin.users(params) });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status?: UserStatus; role?: UserRole } }) =>
      api.admin.updateUser(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.push("Usuario atualizado.");
    },
  });

  if (users.isLoading) return <Loading label="Carregando usuarios..." />;
  if (users.isError || !users.data) return <ErrorState onRetry={() => users.refetch()} />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <h2 className="text-2xl font-semibold">Usuarios</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="Pesquisar" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </Select>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Usuario</TH>
            <TH>Role</TH>
            <TH>Status</TH>
            <TH>Criado</TH>
            <TH>Ultimo login</TH>
            <TH></TH>
          </TR>
        </THead>
        <TBody>
          {users.data.items.map((user) => (
            <TR key={user.id}>
              <TD>
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{user.email}</p>
              </TD>
              <TD>
                <Badge tone={user.role === "ADMIN" ? "accent" : "neutral"}>{user.role}</Badge>
              </TD>
              <TD>
                <Badge tone={user.status === "ACTIVE" ? "success" : "warning"}>{user.status}</Badge>
              </TD>
              <TD>{new Date(user.createdAt).toLocaleDateString("pt-BR")}</TD>
              <TD>{user.lastLogin ? new Date(user.lastLogin).toLocaleString("pt-BR") : "-"}</TD>
              <TD className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    update.mutate({
                      id: user.id,
                      body: { status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" },
                    })
                  }
                >
                  {user.status === "ACTIVE" ? "Suspender" : "Ativar"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    update.mutate({
                      id: user.id,
                      body: { role: user.role === "ADMIN" ? "USER" : "ADMIN" },
                    })
                  }
                >
                  {user.role === "ADMIN" ? "Tornar USER" : "Tornar ADMIN"}
                </Button>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
