# AffiliateOS

AffiliateOS — Seu sistema operacional para afiliados.

Fase 00: foundation. Layout, design system, API modular, PostgreSQL e Prisma. Modulos de produto ainda nao estao implementados.

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 15+ (Docker Compose ou instalacao local)

## Instalacao

```bash
npm install
```

## Configuracao do .env

```bash
cp .env.example .env
```

Variaveis:

```bash
DATABASE_URL=postgresql://affiliateos:affiliateos@localhost:5432/affiliateos?schema=public
AUTH_SECRET=replace-this-auth-secret-min-32-chars
AI_PROVIDER=
AI_API_KEY=
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
PORT=3001
NODE_ENV=development
```

Nao coloque secrets reais no repositorio.

## PostgreSQL

### Docker Compose

```bash
docker compose up -d postgres
bash scripts/setup-local-db.sh
```

### Local

Crie um banco e um usuario equivalentes aos valores de `DATABASE_URL`.

```bash
createdb affiliateos
```

## Migrations

```bash
npm run db:generate
npm run db:migrate
```

Em ambientes ja migrados:

```bash
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

## Health check

```bash
curl http://localhost:3001/api/health
```

Resposta esperada:

```json
{
  "success": true,
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

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

## Documentacao

- docs/ARCHITECTURE.md
- docs/DATABASE.md
- docs/ROADMAP.md
