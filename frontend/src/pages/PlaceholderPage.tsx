import { EmptyState } from "../components/ui/EmptyState";

type Props = {
  title: string;
  module: string;
};

export function PlaceholderPage({ title, module }: Props) {
  return (
    <EmptyState
      module={module}
      title={`${title} ainda nao foi implementado`}
      description="Modulo em breve. A Fase 1 nao implementa este fluxo; nenhum dado ficticio e exibido."
    />
  );
}
