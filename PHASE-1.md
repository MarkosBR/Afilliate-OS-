# Fase 1

## Funcionalidades

- Cadastro, login, logout e recuperacao de sessao
- Protecao de rotas no frontend e na API
- Perfil: nome, email, avatar e troca de senha com senha atual
- Dashboard com produtos, links, campanhas, cliques, conversoes e receita
- CRUD de produtos, links de afiliado e campanhas
- Analytics inicial (contagens reais, zeros se nao houver eventos)
- Tela de automacao com status "Em breve"

## Decisoes tecnicas

- Sessao via token HMAC (`AUTH_SECRET`) em cookie HttpOnly e header Bearer
- Hash de senha com `scrypt` (salt por usuario)
- Validacao com Zod
- Isolamento por `userId` em todas as queries
- Nenhum dado ficticio no dashboard/analytics
- Foundation da Fase 0 preservada (health check, design system, placeholders)

## Banco

Migration `20260905120000_phase1`:

- `users.lastLogin`
- `products`
- `affiliate_links`
- `campaigns`
- `content`
- `analytics`

Relacionamentos com `onDelete: Cascade` a partir do usuario.

## Autenticacao

Rotas publicas:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/health`

Rotas autenticadas:

- `GET /api/auth/me`
- `PATCH /api/auth/profile`
- `PATCH /api/auth/password`
- `/api/users/me`
- `/api/products`
- `/api/links`
- `/api/campaigns`
- `/api/analytics`

## Rotas frontend

Protegidas: `/dashboard`, `/products`, `/links`, `/campaigns`, `/analytics`, `/automation`, `/settings/profile`.

Publicas: `/login`, `/register`.

## Testes

- Contrato do health check
- Schemas de auth
- Isolamento entre usuarios (cadastro, login, produto invisivel para outro usuario, 401 sem token)

## Limitacoes

- Sem OAuth, reset de senha por email ou 2FA
- Sem tracking real de cliques/conversoes
- Conteudo e automacao ainda nao executam fluxos
- Token simetrico HMAC, nao JWT assimetrico

## Proximos passos (Fase 2)

- Tracking de cliques
- Integracoes de plataformas
- Conteudo e calendario
- Automacoes reais
