---
schemaVersion: 1
generatedAt: "2026-05-19T17:05:00Z"
reversa:
  version: "1.2.43"
kind: paradigm_decision
producedBy: paradigm_advisor
---

# Paradigm Decision

> Decisão consciente sobre como tratar a mudança (ou ausência) de paradigma entre o legado e a stack alvo.

## Paradigma do legado detectado

- **Paradigma principal**: OO com DI (dominante) + event-driven (componentes)
- **Confiança**: 🟢 CONFIRMADO
- **Evidências**:
  - `_reversa_sdd/design.md` → Container DI com repositories/services/providers em `dependencyInjection.js`
  - `_reversa_sdd/architecture.md` → Repository pattern, Service layer, Controllers anêmicos
  - `_reversa_sdd/dependencies.md` → JobQueue em memória, WebSocket Socket.IO, Webhooks
- **Variações observadas** (híbrido):
  - Fluxos CRUD (auth, contacts, messages, conversations): OO com DI puro
  - AI Processing: event-driven via JobQueue (enqueue/dequeue/process)
  - Notificações: event-driven via WebSocket (rooms por departamento/conversa)
  - Recebimento de mensagens: event-driven via Webhook

## Stack alvo declarada

- Linguagem: Node.js 20
- Framework: Fastify (manter atual)
- Infra: Vercel + Supabase (PostgreSQL 16)

## Paradigma natural inferido

- **Paradigma**: event-driven assíncrono (runtime async-first do Node)
- **Justificativa**: Node.js é single-threaded orientado a eventos. Fastify usa async handlers. A stack inteira favorece fluxos assíncronos.
- **Alternativas viáveis**: OO com DI (viável, já implementado no legado via DI container manual)

## Gap identificado

- **Severidade**: nenhum
- **Implicações concretas**: O legado já está na stack alvo e já adota OO com DI (alternativa viável). Os componentes event-driven já existem para AI e notificações. Não há gap real de paradigma.

## Opções apresentadas ao usuário

1. **Adotar paradigma natural da stack** (transformacional) — Refatorar tudo para event-driven puro com mensageria externa
2. **Forçar paradigma similar ao legado** (conservador) — Manter OO com DI como está, migrar apenas o que está no `api/` legado para o padrão atual
3. **Híbrido** (equilibrado) — OO com DI para CRUD + event-driven para AI/webhooks (o que já é hoje)

## Decisão do usuário

- **Escolha**: 2 (conservador)
- **Justificativa do usuário**: Manter paradigma atual, sem necessidade de mudança estrutural
- **Decidido em**: "2026-05-19T17:06:00Z"

## Apetite derivado

- `derived_appetite`: conservative

## Implicações pendentes para próximos agentes

| Agente | Implicação | Como honrar |
|---|---|---|
| Curator | O que migrar mantendo OO com DI | Avaliar cada módulo do `api/` legado; trazer para o padrão existente |
| Strategist | Estratégia deve ser de migração gradual (sem mudança de arquitetura) | Propor strangler fig ou migração por módulo |
| Designer | Topologia deve refletir a estrutura atual | Preservar organização por módulos (auth, messages, etc.) |
| Inspector | Testes de paridade comparam mesmo comportamento | Validar que cada endpoint migrado tem mesma resposta |

## Notas

A migração deve focar em unificar o código legado (`api/instances.js`, `lib/permissions.js`) dentro do padrão já estabelecido em `backend/`. Não há necessidade de mudança de paradigma — o sistema já está na stack correta com o padrão correto.