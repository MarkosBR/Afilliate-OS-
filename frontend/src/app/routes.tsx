import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { DashboardPage } from "../pages/DashboardPage";
import { PlaceholderPage } from "../pages/PlaceholderPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "products", element: <PlaceholderPage title="Products" module="Gestao" /> },
      { path: "campaigns", element: <PlaceholderPage title="Campaigns" module="Gestao" /> },
      { path: "storyforge", element: <PlaceholderPage title="StoryForge AI" module="Criacao" /> },
      { path: "viral-studio", element: <PlaceholderPage title="Viral Studio" module="Criacao" /> },
      { path: "creative-forge", element: <PlaceholderPage title="Creative Forge" module="Criacao" /> },
      { path: "calendar", element: <PlaceholderPage title="Content Calendar" module="Distribuicao" /> },
      { path: "social", element: <PlaceholderPage title="Social Media" module="Distribuicao" /> },
      { path: "crm", element: <PlaceholderPage title="CRM" module="Vendas" /> },
      { path: "sales-ai", element: <PlaceholderPage title="Sales AI" module="Vendas" /> },
      { path: "post-sale", element: <PlaceholderPage title="Post-Sale" module="Vendas" /> },
      { path: "analytics", element: <PlaceholderPage title="Analytics" module="Analise" /> },
      { path: "revenue", element: <PlaceholderPage title="Revenue Center" module="Analise" /> },
      { path: "memory", element: <PlaceholderPage title="Memory Hub" module="Inteligencia" /> },
      { path: "growth-lab", element: <PlaceholderPage title="Growth Lab" module="Inteligencia" /> },
      { path: "strategy", element: <PlaceholderPage title="Strategy Vault" module="Inteligencia" /> },
      {
        path: "opportunities",
        element: <PlaceholderPage title="Opportunity Finder" module="Inteligencia" />,
      },
      { path: "academy", element: <PlaceholderPage title="Academy AI" module="Inteligencia" /> },
      { path: "command", element: <PlaceholderPage title="Command Center" module="Sistema" /> },
      { path: "alerts", element: <PlaceholderPage title="Alert Center" module="Sistema" /> },
      { path: "integrations", element: <PlaceholderPage title="Integrations" module="Sistema" /> },
      { path: "settings", element: <PlaceholderPage title="Settings" module="Sistema" /> },
    ],
  },
]);
