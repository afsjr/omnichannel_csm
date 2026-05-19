---
schemaVersion: 1
generatedAt: "2026-05-19T17:36:00Z"
reversa:
  version: "1.2.43"
kind: handoff
producedBy: orquestrador
---

# Handoff — Pipeline de Migração

> Pipeline completo do Time de Migração. Artefatos prontos para o agente de codificação.

## Resumo

| Item | Valor |
|---|---|
| Brief | Unificar api/ legado no backend/ (Fastify + DI + Supabase) |
| Stack alvo | Node.js 20 + Fastify + Supabase (PostgreSQL 16) — manter |
| Escopo | 9 módulos (100% cobertos) |
| Paradigma | OO com DI (conservador — manter) |
| Estratégia | Branch by Abstraction |
| Topologia | package-by-layer (preservar) |
| Telas | N/A (backend API puro, sem UI) |
| Fluxos cobertos (parity) | 18 cenários Gherkin |

## Artefatos gerados

### Planejamento
| Artefato | Descrição |
|---|---|
| `migration_brief.md` | Brief coletado do usuário |
| `paradigm_decision.md` | Decisão: OO com DI (conservador) |
| `target_business_rules.md` | 34 regras MIGRAR + 8 decisões humanas |
| `ambiguity_log.md` | 0 pendentes |
| `migration_strategy.md` | Estratégia A: Branch by Abstraction |
| `risk_register.md` | 5 riscos identificados |
| `cutover_plan.md` | 9 passos de ativação |
| `topology_decision.md` | Topologia package-by-layer preservada |

### Arquitetura alvo
| Artefato | Descrição |
|---|---|
| `target_architecture.md` | Diagrama Mermaid com InstanceController/Service/Repository + Permissions Middleware |
| `target_domain_model.md` | 7 aggregates + Session (novo) |
| `target_data_model.md` | Schema mantido + tabela sessions |
| `data_migration_plan.md` | Sem ETL (mesmo banco) |

### Tela
| Artefato | Descrição |
|---|---|
| `screen_modernization_decision.md` | skipped (sem UI) |
| `target_screens.md` | skipped |
| `screen_deviation_log.md` | vazio |

### Paridade
| Artefato | Descrição |
|---|---|
| `parity_specs.md` | Characterization + contract + data parity |
| `parity_tests/01-instances-crud.feature` | 7 cenários CRUD |
| `parity_tests/02-instances-connect.feature` | 5 cenários connect/disconnect |
| `parity_tests/03-permissions-rbac.feature` | 6 cenários RBAC |

## Decisões-chave

1. **Paradigma**: OO com DI mantido — sem mudança estrutural
2. **Estratégia**: Branch by Abstraction — criar InstanceRepository, InstanceService e permissions middleware, desligar api/
3. **Topologia**: package-by-layer preservada — sem reorganização
4. **Refresh token**: implementado (tabela `sessions`, `POST /auth/refresh`, logout real)
5. **5 itens adiados para codificação**: rate limiting (BR-HUMANA-001), webhook auth (003), cache IA (005), avgResponseTime LAG (006), CORS WebSocket (007)

## O que codificar (em ordem)

### Passo 1: InstanceRepository
- Criar `backend/src/repositories/InstanceRepository.js`
- Migrar queries de `api/instances.js` (findByCompany, findById, create, update, delete)
- Estender `SupabaseBaseRepository`, tabela `connections`
- Registrar no DI container

### Passo 2: InstanceService
- Criar `backend/src/services/InstanceService.js`
- Migrar lógica de connect/disconnect de `api/instances.js`
- Usar EvolutionProvider (já existe em `backend/src/providers/`)
- Registrar no DI container

### Passo 3: InstanceController + rotas
- Criar `backend/src/controllers/instanceController.js`
- Adicionar rotas em `backend/src/routes/`
- Plugar no app.js

### Passo 4: Permissions Middleware
- Criar `backend/src/middlewares/permissions.js`
- Migrar lógica de `lib/permissions.js` (can(), role hierarchy, company filter)
- Registrar no DI container e aplicar nas rotas

### Passo 5: Remover api/ legado
- Desligar import do roteador api/
- Verificar logs por 24h

## Riscos a monitorar

| ID | Risco | Mitigação |
|---|---|---|
| R-001 | Permissions middleware quebrar existente | Testar em staging |
| R-002 | Evolution API mudar contrato | Manter api/ vivo até validar |
| R-003 | Perda de QR Code | Backup manual da tabela connections |
| R-004 | Rota api/ esquecida | Checklist cutover |
| R-005 | Regressão RBAC | Testar combinações role x permissão |

## Próximos passos (usuário)

1. `npm run dev` no backend/ para iniciar
2. Executar os passos de codificação na ordem acima
3. Rodar os cenários de paridade manualmente (ou criar testes automatizados)
4. Validar cutover com checklist em `cutover_plan.md`
