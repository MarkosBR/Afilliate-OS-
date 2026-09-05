import { Button } from "../ui/Button";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  title: string;
  onMenu: () => void;
};

export function Header({ title, onMenu }: Props) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="lg:hidden" onClick={onMenu}>
          Menu
        </Button>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            AffiliateOS
          </p>
          <h1 className="text-base font-semibold">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={toggleTheme}>
          {theme === "dark" ? "Light" : "Dark"}
        </Button>
      </div>
    </header>
  );
}
