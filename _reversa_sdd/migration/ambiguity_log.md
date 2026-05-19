---
schemaVersion: 1
generatedAt: "2026-05-19T17:12:00Z"
reversa:
  version: "1.2.43"
kind: ambiguity_log
producedBy: curator
---

# Ambiguity Log

> Registro de itens ambíguos, pendentes e resoluções durante a migração.

## PENDENTES

*(nenhum)*

## RESOLVIDOS COM DECISÃO HUMANA

| ID | Decisão | Decisor |
|----|---------|---------|
| BR-HUMANA-001 | Implementar rate limiting por role | Adelino |
| BR-HUMANA-002 | Admin/master usa query param; demais roles usam JWT | Adelino |
| BR-HUMANA-003 | Implementar API key check no webhook | Adelino |
| BR-HUMANA-004 | Adiar — Groq free suficiente. Revisar quando mudar para API paga | Adelino |
| BR-HUMANA-005 | Implementar cache em memória por message_id | Adelino |
| BR-HUMANA-006 | Corrigir query avgResponseTime com LAG() + partition | Adelino |
| BR-HUMANA-007 | Restringir CORS para domínios conhecidos | Adelino |
| BR-HUMANA-008 | Adiar — baixa prioridade | Adelino |

## REFERIDOS À CODIFICAÇÃO

| ID | Descrição | Ação esperada |
|----|-----------|---------------|
| BR-HUMANA-001 | Rate limiting | Implementar middleware de rate limit por role (Fastify) |
| BR-HUMANA-003 | Webhook auth | Validar header x-api-key no webhookController |
| BR-HUMANA-005 | Cache IA | Adicionar cache Map<messageId, result> em AIService |
| BR-HUMANA-006 | avgResponseTime | Substituir JOIN por LAG() no dashboardController |
| BR-HUMANA-007 | CORS WebSocket | Restringir origins no initWebSocket() |