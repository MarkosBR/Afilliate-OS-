# Fase 2

## Entrega

- Identidade visual mais tecnológica, sem neon excessivo
- Dashboard operacional com periodo, grafico, atividades e zeros reais
- Roles USER e ADMIN
- Area `/admin` com dashboard, usuarios, produtos, campanhas e logs
- Autorizacao no backend (`requireAdmin`)
- Logs administrativos sem senhas ou secrets

## Banco

Migration `20260905180000_phase2`:

- `users.role` (`USER` | `ADMIN`)
- `admin_logs`

## Limitacoes

- Primeiro ADMIN precisa ser promovido no banco
- Sem tracking real de cliques
- Sem automacoes reais
