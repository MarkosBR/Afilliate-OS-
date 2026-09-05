import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { Loading } from "../ui/Loading";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading label="Recuperando sessao..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading label="Carregando..." />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}
