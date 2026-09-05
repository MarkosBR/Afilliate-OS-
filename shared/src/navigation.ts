export type NavItem = {
  id: string;
  label: string;
  path: string;
  implemented: boolean;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export const NAVIGATION: NavSection[] = [
  {
    id: "overview",
    label: "Visao Geral",
    items: [{ id: "dashboard", label: "Dashboard", path: "/", implemented: true }],
  },
  {
    id: "management",
    label: "Gestao",
    items: [
      { id: "products", label: "Products", path: "/products", implemented: false },
      { id: "campaigns", label: "Campaigns", path: "/campaigns", implemented: false },
    ],
  },
  {
    id: "creation",
    label: "Criacao",
    items: [
      { id: "storyforge", label: "StoryForge AI", path: "/storyforge", implemented: false },
      { id: "viral-studio", label: "Viral Studio", path: "/viral-studio", implemented: false },
      { id: "creative-forge", label: "Creative Forge", path: "/creative-forge", implemented: false },
    ],
  },
  {
    id: "distribution",
    label: "Distribuicao",
    items: [
      { id: "calendar", label: "Content Calendar", path: "/calendar", implemented: false },
      { id: "social", label: "Social Media", path: "/social", implemented: false },
    ],
  },
  {
    id: "sales",
    label: "Vendas",
    items: [
      { id: "crm", label: "CRM", path: "/crm", implemented: false },
      { id: "sales-ai", label: "Sales AI", path: "/sales-ai", implemented: false },
      { id: "post-sale", label: "Post-Sale", path: "/post-sale", implemented: false },
    ],
  },
  {
    id: "analysis",
    label: "Analise",
    items: [
      { id: "analytics", label: "Analytics", path: "/analytics", implemented: false },
      { id: "revenue", label: "Revenue Center", path: "/revenue", implemented: false },
    ],
  },
  {
    id: "intelligence",
    label: "Inteligencia",
    items: [
      { id: "memory", label: "Memory Hub", path: "/memory", implemented: false },
      { id: "growth-lab", label: "Growth Lab", path: "/growth-lab", implemented: false },
      { id: "strategy", label: "Strategy Vault", path: "/strategy", implemented: false },
      { id: "opportunities", label: "Opportunity Finder", path: "/opportunities", implemented: false },
      { id: "academy", label: "Academy AI", path: "/academy", implemented: false },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    items: [
      { id: "command", label: "Command Center", path: "/command", implemented: false },
      { id: "alerts", label: "Alert Center", path: "/alerts", implemented: false },
      { id: "integrations", label: "Integrations", path: "/integrations", implemented: false },
      { id: "settings", label: "Settings", path: "/settings", implemented: false },
    ],
  },
];
