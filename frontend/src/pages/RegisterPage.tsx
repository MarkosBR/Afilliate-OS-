import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("As senhas nao coincidem.");
      return;
    }
    setPending(true);
    try {
      await register({ name, email, password, confirmPassword });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nao foi possivel cadastrar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] p-4">
      <Card className="w-full max-w-md">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">AffiliateOS</p>
        <h1 className="mt-2 text-2xl font-semibold">Criar conta</h1>
        <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
          <Input label="Nome" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Senha"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label="Confirmar senha"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Criando..." : "Cadastrar"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          Ja tem conta? <Link className="text-[var(--color-accent)]" to="/login">Entrar</Link>
        </p>
      </Card>
    </div>
  );
}
