import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { ErrorState } from "../../components/ui/ErrorState";
import { Loading } from "../../components/ui/Loading";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";

export function AdminLogsPage() {
  const logs = useQuery({ queryKey: ["admin-logs"], queryFn: () => api.admin.logs() });

  if (logs.isLoading) return <Loading label="Carregando logs..." />;
  if (logs.isError || !logs.data) return <ErrorState onRetry={() => logs.refetch()} />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <h2 className="text-2xl font-semibold">Logs</h2>
      <Table>
        <THead>
          <TR>
            <TH>Acao</TH>
            <TH>Admin</TH>
            <TH>Alvo</TH>
            <TH>Quando</TH>
          </TR>
        </THead>
        <TBody>
          {logs.data.items.map((log) => (
            <TR key={log.id}>
              <TD>{log.action}</TD>
              <TD>{log.admin?.email ?? log.adminUserId}</TD>
              <TD>{log.target?.email ?? log.targetUserId ?? "-"}</TD>
              <TD>{new Date(log.createdAt).toLocaleString("pt-BR")}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
