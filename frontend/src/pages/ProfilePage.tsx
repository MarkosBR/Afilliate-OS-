import { FormEvent, useState } from "react";
import { useAuth } from "../lib/auth";
import { api, ApiError } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Card, CardDescription, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useToast } from "../components/ui/Toast";

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [avatar, setAvatar] = useState(user?.avatar ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [pendingProfile, setPendingProfile] = useState(false);
  const [pendingPassword, setPendingPassword] = useState(false);

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileError("");
    setPendingProfile(true);
    try {
      const updated = await api.updateProfile({
        name,
        email,
        avatar: avatar.trim() ? avatar.trim() : null,
      });
      setUser(updated);
      toast.push("Perfil atualizado.");
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "Falha ao atualizar perfil.");
    } finally {
      setPendingProfile(false);
    }
  }

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError("");
    if (password !== confirmPassword) {
      setPasswordError("As senhas nao coincidem.");
      return;
    }
    setPendingPassword(true);
    try {
      await api.changePassword({ currentPassword, password, confirmPassword });
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      toast.push("Senha alterada.");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Falha ao alterar senha.");
    } finally {
      setPendingPassword(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Card>
        <CardTitle>Perfil</CardTitle>
        <CardDescription>Altere nome, email e avatar.</CardDescription>
        <form className="mt-4 flex flex-col gap-3" onSubmit={onSaveProfile}>
          <Input label="Nome" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Avatar URL"
            type="url"
            placeholder="https://..."
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
          />
          {profileError ? <p className="text-sm text-[var(--color-danger)]">{profileError}</p> : null}
          <Button type="submit" disabled={pendingProfile}>
            Salvar perfil
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle>Senha</CardTitle>
        <CardDescription>A senha atual e obrigatoria.</CardDescription>
        <form className="mt-4 flex flex-col gap-3" onSubmit={onChangePassword}>
          <Input
            label="Senha atual"
            type="password"
            required
            minLength={8}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="Nova senha"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {passwordError ? <p className="text-sm text-[var(--color-danger)]">{passwordError}</p> : null}
          <Button type="submit" disabled={pendingPassword}>
            Alterar senha
          </Button>
        </form>
      </Card>
    </div>
  );
}
