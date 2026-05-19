---
schemaVersion: 1
generatedAt: "2026-05-19T17:27:00Z"
reversa:
  version: "1.2.43"
kind: cutover_plan
producedBy: strategist
---

# Cutover Plan

> Plano de ativação para a estratégia Branch by Abstraction.

## Pré-requisitos

- [ ] `InstanceRepository` criado em `backend/src/repositories/`
- [ ] `InstanceService` criado em `backend/src/services/`
- [ ] Permissions migrado de `lib/permissions.js` para `backend/src/middlewares/` ou service
- [ ] Testes de paridade para cada endpoint migrado
- [ ] Backup da tabela `connections` no Supabase

## Passos

| # | Passo | Owner | Duração | Risco |
|---|-------|-------|---------|-------|
| 1 | Criar InstanceRepository (migrar queries de api/instances.js) | Adelino | 2h | Baixo |
| 2 | Criar InstanceService com connect/disconnect (usa EvolutionProvider existente) | Adelino | 2h | Baixo |
| 3 | Criar InstanceController e rotas em backend/src/routes/ | Adelino | 1h | Baixo |
| 4 | Migrar permissions.js para middleware Fastify em backend/src/middlewares/permissions.js | Adelino | 2h | Médio |
| 5 | Adicionar InstanceRepository + permissions middleware no DI container | Adelino | 30min | Baixo |
| 6 | Testar CRUD instances + connect/disconnect via backend/ | Adelino | 1h | Médio |
| 7 | Testar todas as permissões RBAC via backend/ | Adelino | 1h | Alto |
| 8 | Desligar roteador api/ (remover import do servidor principal) | Adelino | 15min | Baixo |
| 9 | Monitorar logs por 24h para detectar chamadas residuais ao api/ | Adelino | — | Baixo |

## Duração total estimada

~10h de trabalho (1-2 dias)

## Rollback

Se qualquer passo falhar:
1. Manter `api/` legado ativo (não desligar até passo 8)
2. Reverter as rotas do backend/ e reativar `api/`
3. Corrigir e tentar novamente

## Critérios de Go/No-Go

- [ ] Todos os CRUD de instances funcionam via backend/
- [ ] Connect/disconnect geram QR Code corretamente
- [ ] Permissões RBAC idênticas ao comportamento legado
- [ ] Nenhum erro 500 nos logs após cutover