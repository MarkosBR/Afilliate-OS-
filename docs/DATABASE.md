# Database

PostgreSQL + Prisma ORM.

## Conexao

`DATABASE_URL` no arquivo `.env`.

Exemplo local:

```text
postgresql://affiliateos:affiliateos@localhost:5432/affiliateos?schema=public
```

## Docker

```bash
docker compose up -d postgres
```

## Modelo atual (Fase 00)

Somente `User`.

Campos:

- id
- name
- email
- passwordHash
- avatar
- plan
- status
- createdAt
- updatedAt

Indices:

- email (unique + index)
- status
- plan
- createdAt

Enums:

- `Plan`: FREE, STARTER, PRO, ENTERPRISE
- `UserStatus`: ACTIVE, INACTIVE, SUSPENDED, PENDING

## Relacionamentos futuros

O modelo User e a base para:

- Products
- Campaigns
- Content
- Leads
- Sales
- Notifications
- Integrations

Essas tabelas nao existem nesta fase.

## Comandos

```bash
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio
```

Schema: `prisma/schema.prisma`
Migrations: `prisma/migrations`
