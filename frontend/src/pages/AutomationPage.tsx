import { Card, CardDescription, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

const channels = [
  { id: "tiktok", name: "TikTok", description: "Publicacao e analise de criativos curtos." },
  { id: "youtube", name: "YouTube", description: "Roteiros, thumbs e distribuicao de videos." },
  { id: "instagram", name: "Instagram", description: "Reels, stories e calendario social." },
  { id: "content", name: "Conteudo", description: "Fila de pecas e templates." },
  { id: "campaigns", name: "Campanhas", description: "Regras automaticas de budget e status." },
];

export function AutomationPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">Automacao</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Estrutura inicial da Fase 1. Nenhuma automacao e executada nesta etapa.
        </p>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {channels.map((channel) => (
          <Card key={channel.id}>
            <div className="mb-3 flex items-center justify-between">
              <CardTitle>{channel.name}</CardTitle>
              <Badge tone="warning">Em breve</Badge>
            </div>
            <CardDescription>{channel.description}</CardDescription>
          </Card>
        ))}
      </section>
    </div>
  );
}
