import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { NAVIGATION } from "@affiliateos/shared";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "../../lib/auth";

export function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const title = useMemo(() => {
    const match = NAVIGATION.filter((section) => user?.role === "ADMIN" || section.id !== "admin")
      .flatMap((section) => section.items)
      .find((item) => item.path === location.pathname);
    return match?.label ?? "AffiliateOS";
  }, [location.pathname, user?.role]);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} onMenu={() => setOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
