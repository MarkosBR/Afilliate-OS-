# AffiliateOS

AffiliateOS — Seu sistema operacional para afiliados.

Fase 8: OAuth Google real e upload para o YouTube, sobre as Fases 0-7. As demais plataformas continuam como stub.

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

## Funcionalidades da Fase 8

- OAuth 2.0 Google para YouTube (`youtube.upload` + `youtube.readonly`)
- `GET /api/integrations/youtube/connect` e `GET /api/integrations/youtube/callback`
- Tokens cifrados no backend; nunca na API, logs ou frontend
- Upload resumable via YouTube Data API v3 (privacidade `private`, categoria `22`)
- `POST /api/content/:id/video` e `POST /api/publications/:id/publish`
- App sobe sem `GOOGLE_*`; sem credenciais responde `OAUTH_NOT_CONFIGURED`
- Instagram, Facebook, TikTok, WhatsApp e Telegram continuam `Em breve`

As Fases 0-7 permanecem: auth, CRUD, admin, tracking, analytics, content/IA, calendario e infraestrutura de integracoes.

## YouTube (Google Cloud)

1. Crie um OAuth client no Google Cloud (tipo Web).
2. Ative a YouTube Data API v3.
3. Authorized redirect URI: `http://localhost:3001/api/integrations/youtube/callback`
4. Preencha `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` no `.env`.
5. Em `/integrations`, conecte o canal. Publique so pecas APPROVED/SCHEDULED com arquivo de video local.

Limitacoes: sem cron automatico; publish e manual; videos ficam privados; sem live YouTube nos testes (HTTP mockado).

## Proximas fases

OAuth e publicacao real nas demais redes. Ver `docs/ROADMAP.md`.
