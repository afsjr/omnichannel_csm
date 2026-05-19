# Arquitetura do Sistema — omni-channel

## Visão Geral

O **OmniChat CSM** é um sistema SaaS multi-tenant de atendimento omnichannel via WhatsApp, com suporte a múltiplas empresas, múltiplas instâncias WhatsApp por empresa, e Inteligência Artificial para triagem automática de mensagens.

## Características Arquiteturais

| Característica | Status | Descrição |
|----------------|--------|------------|
| **Multi-tenant** | ✅ | Isolamento por company_id |
| **Event-driven** | ✅ | Webhooks de mensagens |
| **Async Processing** | ✅ | JobQueue para IA |
| **Real-time** | ✅ | WebSocket para notifications |
| **REST API** | ✅ | Fastify como framework |
| **SPA Frontend** | ✅ | React + Vite |

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18.3.1, Vite 6, Zustand, Socket.IO Client |
| Backend | Node.js 20, Fastify 4.28.1 |
| Database | PostgreSQL 16 (Supabase) |
| WhatsApp | Evolution API |
| IA | LLM Provider (Groq, OpenAI, etc) |
| Auth | JWT + bcrypt |

## Padrões de Projeto

| Padrão | Aplicação |
|--------|-----------|
| **Repository** | ContactRepository, ConversationRepository, etc |
| **Service** | AuthService, ChatService, TriageService |
| **Controller** | Controllers Fastify |
| **Provider** | LLMProvider, EvolutionProvider |
| **Job Queue** | AIProcessingService com JobQueue |

## Fluxo de Dados

```
WhatsApp ──► Evolution API ──► Webhook ──► ChatService
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ↓                         ↓                         ↓
              ContactRepository       ConversationRepository      MessageRepository
                    ↓                         ↓                         ↓
                  contacts              conversations               messages
                    │                         │                         │
                    └─────────────────────────┼─────────────────────────┘
                                              ↓
                                       AIProcessingService
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ↓                         ↓                         ↓
              TriageService            AIDraftService           FunnelService
                    ↓                         ↓
              conversations           conversations
              (department_id)          (ai_draft)
```

## Decisões Arquiteturais Registradas em ADRs

| ADR | Título | Status |
|-----|--------|--------|
| ADR-001 | Sistema de Múltiplas Instâncias WhatsApp | Aceito |
| ADR-002 | Sistema de Roles e Permissões (RBAC) | Aceito |
| ADR-003 | Sistema de Triagem Automática com IA | Aceito |
| ADR-004 | Autenticação JWT com Senhas Bcrypt | Aceito |
| ADR-005 | Schema SQL com Suporte a Upgrades | Aceito |

## Métricas do Sistema

| Métrica | Valor |
|---------|-------|
| Entidades do banco | 7 |
| Módulos identificados | 9 |
| endpoints de API principais | ~15 |
| Roles de permissão | 4 |
| Estados de conversa | 5 |
| Departamentos de triagem | 4 |

## Dívidas Técnicas Identificadas

| Item | Severidade | Descrição |
|------|------------|-----------|
| API routes legada (api/) | Média | Duplicação de código (backend está sendo migrado) |
| Middleware de permissão | Média | Verificado no código? Todas as rotas aplicam? |
| Testes unitários | Alta | Nenhum arquivo de teste identificado |
| Rate limiting | Baixa | Não implementado |
| Refresh tokens | Baixa | Não implementado |

## Próximos Passos Sugeridos

1. Consolidar API routes em único backend (Fastify)
2. Implementar testes unitários para serviços críticos
3. Adicionar rate limiting por role
4. Implementar refresh tokens para JWT
5. Adicionar monitoramento (logs, metrics, tracing)

---

*Artefatos relacionados:*
- `c4-context.md` — Diagrama C4 Contexto
- `c4-containers.md` — Diagrama C4 Containers  
- `c4-components.md` — Diagrama C4 Componentes
- `erd-complete.md` — ERD Completo
- `traceability/spec-impact-matrix.md` — Matriz de Impacto
- `deployment.md` — Diagrama de Deployment
- `adrs/` — ADRs Retroativos

🟢 CONFIRMADO — Baseado na análise completa do código