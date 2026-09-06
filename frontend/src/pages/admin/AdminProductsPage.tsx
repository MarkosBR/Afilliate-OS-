import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { Loading } from "../../components/ui/Loading";
import { Select } from "../../components/ui/Select";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { useToast } from "../../components/ui/Toast";

export function AdminProductsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const params = `?q=${encodeURIComponent(q)}${status ? `&status=${status}` : ""}`;
  const products = useQuery({
    queryKey: ["admin-products", params],
    queryFn: () => api.admin.products(params),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      api.admin.updateProduct(id, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.push("Status do produto atualizado.");
    },
  });

  if (products.isLoading) return <Loading label="Carregando produtos..." />;
  if (products.isError || !products.data) return <ErrorState onRetry={() => products.refetch()} />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <h2 className="text-2xl font-semibold">Produtos</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="Pesquisar" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </Select>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Produto</TH>
            <TH>Proprietario</TH>
            <TH>Status</TH>
            <TH></TH>
          </TR>
        </THead>
        <TBody>
          {products.data.items.map((product) => (
            <TR key={product.id}>
              <TD>{product.name}</TD>
              <TD>
                {product.owner.name}
                <p className="text-xs text-[var(--color-text-muted)]">{product.owner.email}</p>
              </TD>
              <TD>
                <Badge tone={product.status === "ACTIVE" ? "success" : "neutral"}>{product.status}</Badge>
              </TD>
              <TD className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    update.mutate({
                      id: product.id,
                      status: product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                    })
                  }
                >
                  Alternar status
                </Button>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
