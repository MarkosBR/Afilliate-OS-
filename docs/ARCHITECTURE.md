# Architecture

AffiliateOS e um SaaS para afiliados. A Fase 00 entrega apenas a foundation.

## Principio

Foundation primeiro. Funcionalidade depois.

Nao ha produtos, campanhas, IA, CRM, analytics ou integracoes implementados nesta fase.

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

O shell possui sidebar, header e area principal. Paginas sem implementacao usam `EmptyState`.

## Backend

Express modular, organizado por dominio.

Implementado na Fase 1:

- `/api/health`
- `/api/auth`
- `/api/users`
- `/api/products`
- `/api/links`
- `/api/campaigns`
- `/api/analytics`

Ainda placeholder (`501`):

- `/api/content`
- `/api/leads`
- `/api/sales`
- `/api/ai`
- `/api/integrations`
- `/api/notifications`

## Seguranca (preparacao)

- Helmet
- CORS restrito a `FRONTEND_URL`
- Rate limiting
- Validacao de env com Zod
- Erros genericos em producao
- Secrets apenas em environment variables
- Senhas nunca em texto puro (`passwordHash` no modelo User)

## Autenticacao

Sessao HMAC com `AUTH_SECRET`, cookie HttpOnly e Bearer token. Senhas com `scrypt`. Rotas de negocio exigem usuario `ACTIVE`.

## Design system

Componentes reutilizaveis em `frontend/src/components/ui`.

Dark mode e light mode via classe `dark` no `html`.
