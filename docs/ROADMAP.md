# Roadmap

## Fase 00 — Foundation

Status: concluida.

- Frontend React + TypeScript + Vite
- Backend Node + TypeScript
- PostgreSQL + Prisma
- Layout AffiliateOS
- Design system
- Routing com empty states
- Health check
- Docker Compose
- Documentacao

## Fase 01 — Auth, produtos e operacao inicial

Status: concluida.

- Cadastro, login, logout e sessao
- Perfil
- CRUD de produtos, links e campanhas
- Dashboard e analytics sem dados ficticios
- Isolamento por usuario

## Fase 02 — Gestao e admin

Status: concluida.

- Roles USER/ADMIN
- `/admin` operacional
- Logs administrativos

## Fase 03 — Tracking

Status: concluida.

- Links rastreaveis
- `GET /go/:slug`
- Cliques reais, UTM e origem

## Fase 04 — Analytics

Status: concluida.

- Relatorios e breakdown reais
- Dashboard operacional

## Fase 05 — Conteudo e IA

Status: concluida.

- CRUD de Content
- Adapters OpenAI/Anthropic
- `/api/content`, `/api/ai/generate|status`

## Fase 06 — Agendamento

Status: concluida.

- Calendario e Publicacao
- Aprovar, rejeitar, agendar e cancelar
- Notificacoes internas
- Sem envio externo

## Fase 07 — Integracoes (infraestrutura)

Status: concluida.

- `ConnectedAccount` e tokens cifrados
- OAuth/adapter stubs (`OAUTH_NOT_CONFIGURED`, `PLATFORM_NOT_IMPLEMENTED`)
- `/api/integrations` (list/get/connect/disconnect/status)
- `/integrations` com cartoes de status
- Ownership de `Publication.connectedAccountId`
- Executor interno sem publish real

## Fase 08 — YouTube real

Status: concluida.

- OAuth 2.0 Google (`youtube.upload`, `youtube.readonly`)
- State HMAC one-time; callback sem autenticacao de sessao
- Upload resumable YouTube Data API v3
- `ContentKind.VIDEO`, tags e arquivo local
- Publish manual via executor; sem cron

## Fase 09 — TikTok real

Status: concluida nesta entrega.

- OAuth 2.0 TikTok (`user.info.basic`, `video.publish`)
- Content Posting API com `FILE_UPLOAD` + `status/fetch`
- `PUBLISHED` so apos `PUBLISH_COMPLETE`; processamento vira `PENDING`
- Publish manual; sem cron; exige video local e conta CONNECTED
- Instagram, Facebook, WhatsApp e Telegram continuam stub

## Proximas fases (planejado)

### Fase 10 — Demais redes

OAuth e publicacao real em Instagram, Facebook e correlatas.
