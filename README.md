# AffiliateOS

AffiliateOS — Seu sistema operacional para afiliados.

Fase 9: OAuth TikTok real e Content Posting API, sobre as Fases 0-8 (incluindo YouTube). Instagram, Facebook, WhatsApp e Telegram continuam como stub.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query
- Backend: Node.js, TypeScript, Express
- Database: PostgreSQL + Prisma ORM
- Infra local: Docker Compose

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 15+ (Docker Compose ou instalacao local)

## Instalacao

```bash
npm install
```

## Configuracao

```bash
cp .env.example .env
```

Variaveis:

```bash
DATABASE_URL=postgresql://affiliateos:affiliateos@localhost:5432/affiliateos?schema=public
AUTH_SECRET=replace-this-auth-secret-min-32-chars
AI_PROVIDER=
AI_API_KEY=
TOKEN_ENCRYPTION_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/api/integrations/youtube/callback
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
PORT=3001
NODE_ENV=development
```

Nao coloque secrets reais no repositorio.

## Banco

### Docker Compose

```bash
docker compose up -d postgres
bash scripts/setup-local-db.sh
```

### Local

Crie um banco e um usuario equivalentes aos valores de `DATABASE_URL`.

## Migrations

```bash
npm run db:generate
npm run prisma:migrate:deploy -w backend
```

## Execucao

Frontend (porta 5173, proxy `/api` para o backend):

```bash
npm run dev:frontend
```

Backend (porta 3001):

```bash
npm run dev:backend
```

Ou ambos:

```bash
npm run dev
```

Abra `http://localhost:5173`, crie uma conta em `/register` e acesse o dashboard.

## Testes

```bash
npm test
```

## Build

```bash
npm run build
```

## Estrutura

```text
frontend/   React + Vite + Tailwind
backend/    Express + TypeScript
shared/     tipos e navegacao
prisma/     schema e migrations
docs/       arquitetura e roadmap
scripts/    utilitarios locais
```

## Funcionalidades da Fase 9

- OAuth 2.0 TikTok (`user.info.basic` + `video.publish`)
- `GET /api/integrations/tiktok/connect` e `GET /api/integrations/tiktok/callback`
- Content Posting API: `FILE_UPLOAD` + PUT em `upload_url` + `status/fetch`
- `PUBLISHED` so quando TikTok confirma `PUBLISH_COMPLETE`; senao `PENDING` (`TIKTOK_PROCESSING`)
- Tokens cifrados no backend; nunca na API, logs ou frontend
- App sobe sem `TIKTOK_*` / `GOOGLE_*`; sem credenciais responde `OAUTH_NOT_CONFIGURED`
- Instagram, Facebook, WhatsApp e Telegram continuam `Em breve`

As Fases 0-8 permanecem, inclusive OAuth e upload reais do YouTube.

## YouTube (Google Cloud)

1. Crie um OAuth client no Google Cloud (tipo Web).
2. Ative a YouTube Data API v3.
3. Authorized redirect URI: `http://localhost:3001/api/integrations/youtube/callback`
4. Preencha `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` no `.env`.
5. Em `/integrations`, conecte o canal. Publique so pecas APPROVED/SCHEDULED com arquivo de video local.

Limitacoes: sem cron automatico; publish e manual; videos ficam privados; sem live YouTube nos testes (HTTP mockado).

## TikTok (Developer Portal)

1. Crie um app em https://developers.tiktok.com/ (Login Kit + Content Posting API).
2. Redirect URI: `http://localhost:3001/api/integrations/tiktok/callback`
3. Scopes: `user.info.basic`, `video.publish`.
4. Preencha `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` e `TIKTOK_REDIRECT_URI` no `.env`.
5. Direct Post (`video.publish`) exige aprovacao do app TikTok. Sem auditoria, a API pode recusar o envio.
6. Fluxo: init (`source=FILE_UPLOAD`) -> PUT no `upload_url` -> `status/fetch`. Privacy prefere `SELF_ONLY`.
7. Caption usa titulo + corpo (max 2200). Publish manual; consultar de novo enquanto `PENDING`.

Limitacoes reais: app TikTok precisa de aprovacao Content Posting / Direct Post; sem cron; testes mockam HTTP e nao chamam a API live.

## Proximas fases

OAuth e publicacao real nas demais redes. Ver `docs/ROADMAP.md`.
