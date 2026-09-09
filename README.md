# AffiliateOS

AffiliateOS — Seu sistema operacional para afiliados.

Fase 7: infraestrutura de integracoes sociais sobre as Fases 0-6. Sem OAuth real e sem publicacao externa.

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

## Funcionalidades da Fase 7

- `ConnectedAccount` por usuario e plataforma
- Tokens cifrados no backend (`TOKEN_ENCRYPTION_KEY`)
- `/api/integrations` list/get/connect/disconnect/status
- Stubs OAuth/adapter (`OAUTH_NOT_CONFIGURED`, `PLATFORM_NOT_IMPLEMENTED`)
- UI `/integrations` sem exibir tokens
- Agendamento pode referenciar conta propria

As Fases 0-6 permanecem: auth, CRUD, admin, tracking, analytics, content/IA e calendario.

## Proximas fases

OAuth real por plataforma e publicacao externa. Ver `docs/ROADMAP.md`.
