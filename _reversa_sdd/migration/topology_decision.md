---
schemaVersion: 1
generatedAt: "2026-05-19T17:28:00Z"
reversa:
  version: "1.2.43"
kind: topology_decision
producedBy: designer
hash: "sha256:0"
---

# Topology Decision

> Decisão consciente sobre como organizar o sistema novo.

## Topologia do legado detectada
- **Padrão organizacional**: package-by-layer (controllers → services → repositories → providers → db) com módulos de domínio transversais, mais `api/` legado flat e `lib/` utilitária
- **Confiança**: 🟢 CONFIRMADO
- **Evidências**:
  - `_reversa_sdd/c4-components.md` → Fastify Server → Controllers → Services → Repositories → BaseRepository → DB
  - `_reversa_sdd/inventory.md` → pastas `backend/src/controllers/`, `services/`, `repositories/`, `providers/`
  - `_reversa_sdd/architecture.md` → padrões Repository, Service, Controller, Provider listados explicitamente
  - DI container (`dependencyInjection.js`) monta a injeção entre camadas
- **Mapa da árvore legada**:
  ```
  backend/src/
  ├── app.js (entry point)
  ├── routes/
  ├── controllers/   (auth, message, contact, ai, dashboard, webhook)
  ├── services/      (Auth, Chat, AI, Triage, Funnel, AIDraft, Evolution)
  ├── repositories/  (Base, User, Contact, Message, Conversation, Department)
  ├── providers/     (Evolution, LLM)
  ├── database/      (Database, SupabaseDatabase)
  └── websocket/

  api/     (legado flat: instances, users, login, register, webhook-handler, queue)
  lib/     (utilitários: permissions, auth, evolution, db)
  frontend/ (React)
  ```

## Diagnóstico estrutural
- **Acoplamento**: Médio — Services dependem de múltiplos repositórios, mas DI container centraliza e desacopla a instanciação
- **Coesão por módulo**: Alta — cada camada tem responsabilidade única bem definida
- **Módulos órfãos / mortos**: `api/` legado está parcialmente morto (90% já migrado para backend/)
- **Camadas redundantes**: Nenhuma
- **Violações de fronteira**: Nenhuma — o padrão package-by-layer é respeitado consistentemente
- **Mistura de paradigmas/estilos**: Homogêneo — OO com DI dominante; event-driven pontual (AI job queue, WebSocket, webhooks)
- **Avaliação geral**: Saudável

## Topologia moderna proposta
- **Padrão**: None — manter a topologia atual (package-by-layer)
- **Justificativa**: O apetite é conservador (paradigma OO com DI mantido), a estratégia é Branch by Abstraction (migração interna do api/ → backend/), e a topologia atual já está consolidada em produção com 90% do backend migrado. package-by-layer com DI container é um padrão maduro, bem compreendido, fácil de testar e evolutivo. Não há débito estrutural que justifique uma mudança de topologia — o custo de reorganizar superaria o ganho.
- **Ganhos concretos esperados**: (aplica-se à opção 2 — não relevante aqui)
- **Custo / risco**: (aplica-se à opção 2 — não relevante aqui)
- **Esboço da árvore proposta**: idêntica à legada, com `api/` removido e `lib/` absorvido

## Opções apresentadas ao usuário
1. **Preservar topologia legada** (conservador)
   - Consequências: mantém a estrutura atual package-by-layer; risco mínimo; apenas criar os repositórios/services/controllers faltantes (InstanceRepository, InstanceService, permissions middleware); `api/` removido ao final; zero mudança estrutural.
2. **Adotar topologia moderna proposta** (transformacional)
   - N/A — não há topologia moderna significativamente superior para este caso dado o apetite conservador.
3. **Híbrido** (equilibrado)
   - N/A — a separação api/ vs backend/ já é um híbrido temporário; migrar api/ para o padrão backend/ elimina a necessidade de híbrido.

## Decisão do usuário
- **Escolha**: 1 (preservar topologia legada)
- **Justificativa do usuário**: Seguiu a recomendação
- **Decidido em**: "2026-05-19T17:29:00Z"

## Mapeamento legado → novo
| Módulo / pasta legada | Bounded context novo | Tipo | Observações |
|---|---|---|---|
| `api/instances.js` | `backend/` como InstanceService + InstanceRepository | migrado | Absorvido no padrão package-by-layer |
| `lib/permissions.js` | `backend/src/middlewares/permissions.js` | migrado | Vira middleware Fastify no DI |
| `api/` (demais) | `backend/` (já migrado) | preservado | 90% já migrado |
| `lib/` (demais) | `backend/` (absorvido) | migrado | Cada util vai para seu service/repository |

## Implicações pendentes para próximos passos do Designer
| Etapa do Designer | Implicação | Como honrar |
|---|---|---|
| Bounded contexts | Apenas 1 bounded context (backend unificado) | Todo o domínio vive em `backend/src/` |
| target_architecture | Manter package-by-layer com DI | Arquitetura atual é a alvo |
| target_domain_model | Mesmos aggregates do domain.md | Sem alteração |
| target_data_model | Manter schema.sql atual | Sem alteração |

## Notas
A decisão de topologia é trivial neste caso: a migração é intra-sistema (api/ → backend/), não há mudança de arquitetura, paradigma ou banco. A pergunta real é apenas se o usuário concorda em continuar com a estrutura package-by-layer atual.
