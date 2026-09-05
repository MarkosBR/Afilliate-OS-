import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../lib/auth";

type Props = {
  title: string;
  onMenu: () => void;
};

export function Header({ title, onMenu }: Props) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const initials = (user?.name ?? "AO")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="lg:hidden" onClick={onMenu}>
          Menu
        </Button>
        <Link to="/dashboard" className="hidden items-center gap-2 sm:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)] text-xs font-bold text-white">
            AO
          </span>
          <span className="text-sm font-semibold">AffiliateOS</span>
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">AffiliateOS</p>
          <h1 className="text-base font-semibold">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={toggleTheme}>
          {theme === "dark" ? "Light" : "Dark"}
        </Button>
        {user ? (
          <>
            <Link
              to="/settings/profile"
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-2 py-1"
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-xs font-semibold">
                  {initials}
                </span>
              )}
              <span className="hidden text-sm md:block">{user.name}</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              Sair
            </Button>
          </>
        ) : null}
      </div>
    </header>
  );
}
