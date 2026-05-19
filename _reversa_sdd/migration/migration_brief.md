---
schemaVersion: 1
generatedAt: "2026-05-19T17:00:00Z"
reversa:
  version: "1.2.43"
kind: migration_brief
producedBy: orchestrator
---

# Migration Brief

> Documento de critério de migração coletado em entrevista no início do `/reversa-migrate`.

## Objetivo da migração

Melhorar manutenibilidade do sistema. Unificar o código legado (`api/`) dentro do padrão já adotado no `backend/` (Fastify + DI + Services + Repositories + Providers), eliminando duplicação e centralizando a lógica de negócio.

## Métricas de sucesso

- Mesma funcionalidade após migração (zero regressão funcional)
- Testes de paridade passando para todos os fluxos principais
- Código do `api/` legado totalmente descontinuado

## Restrições

- **Prazo**: Sem prazo definido
- **Orçamento**: Zero (sem contratação externa)
- **Técnicas**: Deve manter compatibilidade com Evolution API e Supabase (PostgreSQL 16)
- **Operacionais**: Sempre disponível, sem janela de manutenção forçada

## Fatores de risco conhecidos

- **Perda de dados**: Especial cuidado com a tabela `connections` e QR Codes de WhatsApp
- **Integração com Evolution API**: API externa com comportamento não controlável

## Stakeholders

| Nome / papel | Responsabilidade na migração |
|---|---|
| Adelino | Único stakeholder e decisor |

## Stack alvo

- **Linguagem**: Node.js 20
- **Framework**: Fastify (manter atual)
- **Banco**: PostgreSQL 16 via Supabase (manter atual)
- **Mensageria**: Nenhuma (JobQueue em memória)
- **Infra**: Vercel (manter)
- **Outros componentes relevantes**: Evolution API (WhatsApp), Socket.IO, LLM Provider (Groq/OpenAI)

## Escopo declarado

- **Incluído**: Todos os 9 módulos mapeados (auth, messages, contacts, conversations, ai, dashboard, websocket, webhooks, instances)
- **Excluído**: Nenhum

## Notas livres

Projeto já tem backend novo em Fastify rodando. O legado `api/instances.js` e `lib/permissions.js` são os principais candidatos a migração. Frontend React não será migrado nesta etapa.