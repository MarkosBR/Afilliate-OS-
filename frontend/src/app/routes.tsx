import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { AdminRoute, ProtectedRoute, PublicOnlyRoute } from "../components/auth/ProtectedRoute";
import { DashboardPage } from "../pages/DashboardPage";
import { PlaceholderPage } from "../pages/PlaceholderPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ProductsPage } from "../pages/ProductsPage";
import { LinksPage } from "../pages/LinksPage";
import { LinkDetailPage } from "../pages/LinkDetailPage";
import { CampaignsPage } from "../pages/CampaignsPage";
import { ContentPage } from "../pages/ContentPage";
import { CalendarPage } from "../pages/CalendarPage";
import { AnalyticsPage } from "../pages/AnalyticsPage";
import { AutomationPage } from "../pages/AutomationPage";
import { ProfilePage } from "../pages/ProfilePage";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage";
import { AdminProductsPage } from "../pages/admin/AdminProductsPage";
import { AdminCampaignsPage } from "../pages/admin/AdminCampaignsPage";
import { AdminLogsPage } from "../pages/admin/AdminLogsPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicOnlyRoute>
        <RegisterPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "products/:id", element: <ProductsPage /> },
      { path: "affiliates", element: <PlaceholderPage title="Afiliados" module="Afiliados" /> },
      { path: "links", element: <LinksPage /> },
      { path: "links/:id", element: <LinkDetailPage /> },
      { path: "content", element: <ContentPage /> },
      { path: "campaigns", element: <CampaignsPage /> },
      { path: "automation", element: <AutomationPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "settings", element: <Navigate to="/settings/profile" replace /> },
      { path: "settings/profile", element: <ProfilePage /> },
      { path: "admin", element: <Navigate to="/admin/dashboard" replace /> },
      {
        path: "admin/dashboard",
        element: (
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        ),
      },
      {
        path: "admin/users",
        element: (
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        ),
      },
      {
        path: "admin/products",
        element: (
          <AdminRoute>
            <AdminProductsPage />
          </AdminRoute>
        ),
      },
      {
        path: "admin/campaigns",
        element: (
          <AdminRoute>
            <AdminCampaignsPage />
          </AdminRoute>
        ),
      },
      {
        path: "admin/logs",
        element: (
          <AdminRoute>
            <AdminLogsPage />
          </AdminRoute>
        ),
      },
      { path: "storyforge", element: <PlaceholderPage title="StoryForge AI" module="Criacao" /> },
      { path: "viral-studio", element: <PlaceholderPage title="Viral Studio" module="Criacao" /> },
      { path: "creative-forge", element: <PlaceholderPage title="Creative Forge" module="Criacao" /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "social", element: <PlaceholderPage title="Social Media" module="Distribuicao" /> },
      { path: "crm", element: <PlaceholderPage title="CRM" module="Vendas" /> },
      { path: "sales-ai", element: <PlaceholderPage title="Sales AI" module="Vendas" /> },
      { path: "post-sale", element: <PlaceholderPage title="Post-Sale" module="Vendas" /> },
      { path: "revenue", element: <PlaceholderPage title="Revenue Center" module="Analise" /> },
      { path: "memory", element: <PlaceholderPage title="Memory Hub" module="Inteligencia" /> },
      { path: "growth-lab", element: <PlaceholderPage title="Growth Lab" module="Inteligencia" /> },
      { path: "strategy", element: <PlaceholderPage title="Strategy Vault" module="Inteligencia" /> },
      { path: "opportunities", element: <PlaceholderPage title="Opportunity Finder" module="Inteligencia" /> },
      { path: "academy", element: <PlaceholderPage title="Academy AI" module="Inteligencia" /> },
      { path: "command", element: <PlaceholderPage title="Command Center" module="Sistema" /> },
      { path: "alerts", element: <PlaceholderPage title="Alert Center" module="Sistema" /> },
      { path: "integrations", element: <PlaceholderPage title="Integrations" module="Sistema" /> },
    ],
  },
]);
