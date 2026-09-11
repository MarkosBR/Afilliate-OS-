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

## Modelos

- `users`
- `products`
- `affiliate_links`
- `campaigns`
- `content`
- `publications`
- `connected_accounts`
- `oauth_states`
- `notifications`
- `analytics`
- `admin_logs`

Todos os registros de negocio pertencem a um `User`.

### User

- id, name, email, passwordHash, avatar, plan, status, role, lastLogin, createdAt, updatedAt

### Product

- nome, descricao, plataforma (HOTMART, EDUZZ, KIWIFY, OTHER), ID externo, link de afiliado, comissao, status

### AffiliateLink

- nome, slug unico, url, productId, userId, campaignId opcional, contador de cliques

### Campaign

- nome, descricao, orcamento, status (DRAFT, ACTIVE, PAUSED, COMPLETED), productId, userId

### Content

- titulo, corpo, kind (inclui VIDEO), tags, videoPath, videoFileName
- status (DRAFT, APPROVED, SCHEDULED, PUBLISHED, FAILED, ARCHIVED), source MANUAL/AI
- `videoPath` nunca e serializado; a API expoe `hasVideo` e `videoFileName`

### Publication

- contentId, platform, scheduledAt, status, publishedAt, errorMessage, externalId
- `connectedAccountId` opcional (SetNull). Deve pertencer ao mesmo usuario e, quando informado, a plataforma deve ser compativel

### ConnectedAccount

- unique (`userId`, `platform`)
- platform: INSTAGRAM, FACEBOOK, TIKTOK, YOUTUBE, WHATSAPP, TELEGRAM
- status: DISCONNECTED, CONNECTING, CONNECTED, EXPIRED, ERROR
- `accessToken` / `refreshToken` cifrados (AES-256-GCM); nunca serializados na API
- displayName, externalAccountId, scopes, tokenExpiresAt, metadata

### OAuthState (Fase 8)

- state assinado HMAC, one-time, com `expiresAt` e `usedAt`
- unique em `state`; FK `userId` com cascade

### Notification / Analytics / AdminLog

Notificacoes internas de fluxo de conteudo. Eventos de analytics so existem se forem gravados. Logs administrativos sem secrets.

## Comandos

```bash
npm run db:generate
npm run prisma:migrate:deploy -w backend
npm run db:push
npm run db:studio
```

Schema: `prisma/schema.prisma`
Migrations: `prisma/migrations`
