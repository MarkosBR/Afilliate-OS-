export type NavItem = {
  id: string;
  label: string;
  path: string;
  implemented: boolean;
  adminOnly?: boolean;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export const NAVIGATION: NavSection[] = [
  {
    id: "main",
    label: "Principal",
    items: [
      { id: "dashboard", label: "Dashboard", path: "/dashboard", implemented: true },
      { id: "products", label: "Produtos", path: "/products", implemented: true },
      { id: "links", label: "Links", path: "/links", implemented: true },
      { id: "campaigns", label: "Campanhas", path: "/campaigns", implemented: true },
      { id: "content", label: "Conteudo", path: "/content", implemented: true },
      { id: "calendar", label: "Calendario", path: "/calendar", implemented: true },
      { id: "analytics", label: "Analytics", path: "/analytics", implemented: true },
      { id: "automation", label: "Automacao", path: "/automation", implemented: true },
      { id: "settings", label: "Configuracoes", path: "/settings/profile", implemented: true },
    ],
  },
  {
    id: "admin",
    label: "Administracao",
    items: [
      { id: "admin-dashboard", label: "Dashboard", path: "/admin/dashboard", implemented: true, adminOnly: true },
      { id: "admin-users", label: "Usuarios", path: "/admin/users", implemented: true, adminOnly: true },
      { id: "admin-products", label: "Produtos", path: "/admin/products", implemented: true, adminOnly: true },
      { id: "admin-campaigns", label: "Campanhas", path: "/admin/campaigns", implemented: true, adminOnly: true },
      { id: "admin-logs", label: "Logs", path: "/admin/logs", implemented: true, adminOnly: true },
    ],
  },
];
