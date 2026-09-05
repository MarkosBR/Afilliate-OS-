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
      description="Esta tela e um empty state da Fase 00. A foundation esta pronta, mas este modulo nao possui backend, dados ou fluxos funcionais."
    />
  );
}
