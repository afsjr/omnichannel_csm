# Auditoria de Requisitos vs Implementação

> Gerada em 2026-05-23 após reavaliação completa do código contra os documentos `_reversa_sdd/*/requirements.md`

---

## CONVERSATIONS

### RN-CV01 — Ciclo de vida: estado `open`
| Path | Comportamento | Veredito |
|------|---------------|----------|
| `ConversationRepository.create()` | Default `'open'` | 🟢 conforme spec |
| `ChatService.processIncomingMessage()` | Cria com `'pending'` | 🔴 **violação** — spec diz que `open` é o estado inicial |
| `lib/messages.js` `findOrCreateConversation()` | Cria com `'pending'` | 🔴 **violação** |
| **Conclusão** | NUNCA uma conversa nasce `open` no código. O estado `open` não é usado em lugar nenhum. | ❌ |

### RN-CV03 / RF-CV07 — Requeue deve usar `queued`
| Path | Comportamento | Veredito |
|------|---------------|----------|
| `ConversationRepository.requeue()` | Sets `status: 'queued'` | 🟢 |
| `api/messages.js` `requeueConversation()` (Vercel) | Sets `status: 'pending'` | 🔴 **BUG** — deveria ser `'queued'` |
| `ChatService.requeueConversation()` | Delega ao repo | 🟢 |
| **Conclusão** | A rota serverless `/api/messages/requeue` tem a mesma implementação de `reopen`. | ❌ |

### Fila não inclui `queued`
| Path | Filtro | Veredito |
|------|--------|----------|
| `ChatService.getQueue()` | Só `'pending'` | 🔴 deveria incluir `['pending', 'queued']` |
| `ChatService.getQueueByDepartment()` | Só `'pending'` | 🔴 |
| `api/messages.js` `getQueue()` (Vercel) | Só `'pending'` | 🔴 |
| `lib/messages.js` `getQueue()` | Só `'pending'` | 🔴 |
| **Conclusão** | Conversas em `queued` somem do sistema — não aparecem na fila nem nas minhas conversas. | ❌ |

### `findOrCreateConversation` não busca `queued`
| Path | Status buscado | Veredito |
|------|---------------|----------|
| `lib/messages.js` `findOrCreateConversation()` | `['pending', 'in_progress']` | 🔴 Se conversa foi requeued (`queued`) e contato responde, duplica conversa |
| `ChatService.processIncomingMessage()` | `['pending', 'in_progress']` | 🔴 idem |
| `ConversationRepository.findByContactAndStatus()` | Default `['pending', 'in_progress']` | 🟡 aceita array, basta passar o valor certo |

### `getResolved` ordena por coluna inexistente
| Path | Problema | Veredito |
|------|----------|----------|
| `api/messages.js:154` | `.order('updated_at', ...)` | 🔴 coluna `updated_at` não existe — Supabase JS v2 retorna `data: null` silenciosamente |

---

## MESSAGES
| Requisito | Status |
|-----------|--------|
| RF-M01 a RF-M07 | 🟢 todos implementados |
| normalização, criação de contato/conversa, envio texto/mídia | 🟢 |

---

## CONTACTS
| Requisito | Status |
|-----------|--------|
| RF-C01 a RF-C05 | 🟢 todos implementados |
| unicidade, normalização, nome padrão | 🟢 |

---

## WEBHOOKS
| Requisito | Status |
|-----------|--------|
| RF-WH01 a RF-WH08 (parsing, extração, trigger) | 🟢 |
| parsing de sticker, ephemeral | 🟢 |
| Sem autenticação/assinatura | 🔴 já documentado em lacunas da spec |

---

## DASHBOARD
| Requisito | Status |
|-----------|--------|
| RF-D01 a RF-D03 (stats, activity, full) | 🟢 |
| `company_id` validado via JWT? | 🔴 usa `req.query.companyId` sem validação |
| Departamento fixo no frontend | 🟡 hardcoded (1=Comercial, 2=Financeiro, 3=Secretaria, 4=Acadêmico) em `Dashboard.jsx:269-274` |

---

## Sumário de Correções Pendentes

| # | Severidade | Arquivo | Linha | Problema |
|---|-----------|---------|-------|----------|
| 1 | **HIGH** | `api/messages.js` | 141 | `requeueConversation` seta `status: 'pending'` — deveria ser `'queued'` |
| 2 | **HIGH** | `api/messages.js` | 67, 154 | `getQueue` filtra só `pending` (devia incluir `queued`); `getResolved` ordena por `updated_at` (inexistente) |
| 3 | **MEDIUM** | `lib/messages.js` | 103 | `findOrCreateConversation` não busca `queued` entre status ativos |
| 4 | **MEDIUM** | `ChatService.js` | 20, 76 | `processIncomingMessage` e `getQueue` não incluem `queued` |
| 5 | **LOW** | `Dashboard.jsx` | 269-274 | Departamentos hardcoded no filtro |
| 6 | **LOW** | `dashboardController.js` | 2 | `company_id` vem de `req.query` sem validação JWT |
| 7 | **INFO** | `ChatService.js`, `lib/messages.js` | criação de conversa | Estado `open` nunca é usado — spec vs realidade discrepantes |
