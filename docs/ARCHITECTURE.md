# Architecture

AffiliateOS e um SaaS para afiliados. A Fase 8 entrega OAuth Google real e upload YouTube sobre as Fases 0-7.

## Principio

Foundation primeiro. Funcionalidade depois.

YouTube e a unica plataforma com OAuth e envio reais. Instagram, Facebook, TikTok, WhatsApp e Telegram permanecem stub. Tokens nunca saem do backend.

## Visao geral

```text
Browser
  -> Vite dev server (5173)
      -> React shell (sidebar, header, main)
      -> /api proxy
          -> Express API (3001)
              -> Prisma
                  -> PostgreSQL
```

## Pacotes

- `frontend`: interface, design system, routing, empty states
- `backend`: API REST modular, middlewares de seguranca, health check
- `shared`: constantes, tipos, navegacao
- `prisma`: modelo de dados e migrations

## Frontend

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- TanStack Query
- Reverse proxy `/api` -> `http://localhost:3001`
- `server.allowedHosts` inclui `.monkeycode-ai.live`

O shell possui sidebar, header e area principal. Paginas sem implementacao usam `EmptyState`. `/integrations` lista plataformas com status, conectar e desconectar, sem exibir tokens.

## Backend

Express modular, organizado por dominio.

Implementado:

- `/api/health`
- `/api/auth`
- `/api/users`
- `/api/products`
- `/api/links`
- `/api/campaigns`
- `/api/analytics`
- `/api/admin`
- `/api/content`
- `/api/ai`
- `/api/calendar`
- `/api/publications`
- `/api/notifications`
- `/api/integrations`
- `GET /api/integrations/youtube/connect`
- `GET /api/integrations/youtube/callback`
- `POST /api/content/:id/video`
- `POST /api/publications/:id/publish`
- `GET /go/:slug`

Ainda placeholder (`501`):

- `/api/leads`
- `/api/sales`

## Integracoes (Fase 8)

- Modelo `ConnectedAccount` (um por `userId+platform`) e `OAuthState` one-time HMAC
- Tokens cifrados em AES-256-GCM (`TOKEN_ENCRYPTION_KEY`, fallback `AUTH_SECRET`)
- Serializer nunca inclui `accessToken` / `refreshToken`
- YouTube: `YouTubeOAuthProvider` + `YouTubePlatformAdapter` (OAuth 2.0 + upload resumable)
- App sobe sem `GOOGLE_*`; connect sem config responde `OAUTH_NOT_CONFIGURED`
- Demais plataformas: stubs `OAUTH_NOT_CONFIGURED` / `PLATFORM_NOT_IMPLEMENTED`
- Publish YouTube exige conteudo APPROVED/SCHEDULED, conta CONNECTED do mesmo usuario e arquivo local
- Sucesso: `PUBLISHED` + `externalId`; falha: `FAILED` + notificacao
- Videos em `uploads/videos/{userId}/` (gitignored); privacidade YouTube `private`, categoria `22`

### Como adicionar uma plataforma

1. Incluir o valor em `IntegrationPlatform` (Prisma + shared)
2. Registrar um `PlatformAdapter` concreto em `platform.adapter.ts`
3. Implementar `OAuthProvider` em `oauth.provider.ts` quando houver credenciais reais
4. Persistir tokens apenas via `encryptSecret` / `storeEncryptedTokens`
5. Nunca devolver tokens em serializers, logs ou frontend

## Seguranca

- Helmet
- CORS restrito a `FRONTEND_URL`
- Rate limiting
- Validacao de env com Zod
- Erros genericos em producao
- Secrets apenas em environment variables
- Senhas nunca em texto puro (`passwordHash` no modelo User)
- Tokens de integracao apenas no backend, cifrados em repouso

## Autenticacao

Sessao HMAC com `AUTH_SECRET`, cookie HttpOnly e Bearer token. Senhas com `scrypt`. Rotas de negocio exigem usuario `ACTIVE`.

## Design system

Componentes reutilizaveis em `frontend/src/components/ui`.

Dark mode e light mode via classe `dark` no `html`.
