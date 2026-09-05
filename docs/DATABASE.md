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

## Modelos (Fase 1)

- `users`
- `products`
- `affiliate_links`
- `campaigns`
- `content`
- `analytics`

Todos os registros de negocio pertencem a um `User`.

### User

- id, name, email, passwordHash, avatar, plan, status, lastLogin, createdAt, updatedAt

### Product

- nome, descricao, plataforma (HOTMART, EDUZZ, KIWIFY, OTHER), ID externo, link de afiliado, comissao, status

### AffiliateLink

- nome, slug unico por usuario, url, productId, userId

### Campaign

- nome, descricao, orcamento, status (DRAFT, ACTIVE, PAUSED, COMPLETED), productId, userId

### Content / Analytics

Estrutura preparada. Eventos de analytics so existem se forem gravados; a UI nao inventa valores.

## Comandos

```bash
npm run db:generate
npm run prisma:migrate:deploy -w backend
npm run db:push
npm run db:studio
```

Schema: `prisma/schema.prisma`
Migrations: `prisma/migrations`
