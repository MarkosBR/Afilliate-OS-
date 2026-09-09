import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { INTEGRATION_PLATFORMS, type ConnectedAccount, type ConnectionStatus, type IntegrationPlatform } from "@affiliateos/shared";
import { ApiError, api } from "../lib/api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardDescription, CardTitle } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { Loading } from "../components/ui/Loading";
import { useToast } from "../components/ui/Toast";

const labels: Record<IntegrationPlatform, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
};

function statusTone(status: ConnectionStatus) {
  if (status === "CONNECTED") return "success" as const;
  if (status === "EXPIRED" || status === "ERROR") return "danger" as const;
  if (status === "CONNECTING") return "warning" as const;
  return "neutral" as const;
}

function accountFor(items: ConnectedAccount[] | undefined, platform: IntegrationPlatform) {
  return items?.find((item) => item.platform === platform) ?? null;
}

export function IntegrationsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const integrations = useQuery({ queryKey: ["integrations"], queryFn: api.integrations.list });

  const connect = useMutation({
    mutationFn: (platform: IntegrationPlatform) => api.integrations.connect(platform),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
      const code = error instanceof ApiError ? error.code : "";
      if (code === "OAUTH_NOT_CONFIGURED") {
        toast.push("OAuth ainda nao esta configurado para esta plataforma.");
        return;
      }
      if (code === "PLATFORM_NOT_IMPLEMENTED") {
        toast.push("Esta plataforma ainda nao foi implementada.");
        return;
      }
      toast.push(error instanceof Error ? error.message : "Falha ao conectar.");
    },
  });

  const disconnect = useMutation({
    mutationFn: (id: string) => api.integrations.disconnect(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.push("Conta desconectada.");
    },
    onError: (error) => {
      toast.push(error instanceof Error ? error.message : "Falha ao desconectar.");
    },
  });

  if (integrations.isLoading) return <Loading label="Carregando integracoes..." />;
  if (integrations.isError) return <ErrorState onRetry={() => integrations.refetch()} />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">Integracoes</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Infraestrutura de contas conectadas. Nenhuma API social real e chamada nesta fase.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INTEGRATION_PLATFORMS.map((platform) => {
          const account = accountFor(integrations.data, platform);
          const status = account?.status ?? "DISCONNECTED";
          return (
            <Card key={platform}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{labels[platform]}</CardTitle>
                  <CardDescription>
                    {account?.displayName || "Nenhuma conta conectada."}
                  </CardDescription>
                </div>
                <Badge tone={statusTone(status)}>{status}</Badge>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => connect.mutate(platform)}
                  disabled={connect.isPending || disconnect.isPending}
                >
                  Conectar
                </Button>
                {account ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => disconnect.mutate(account.id)}
                    disabled={connect.isPending || disconnect.isPending}
                  >
                    Desconectar
                  </Button>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
