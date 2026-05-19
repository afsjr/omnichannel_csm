# Relatório de Confiança — OmniChat CSM

> Gerado pelo Revisor em 2026-05-19

---

## Resumo Geral

| Nível | Quantidade | Percentual |
|-------|-----------|------------|
| 🟢 CONFIRMADO | 149 | 79.7% |
| 🟡 INFERIDO | 23 | 12.3% |
| 🔴 LACUNA | 15 | 8.0% |
| **Total** | 187 | 100% |

**Confiança geral:** 85.8% (🟢 + metade dos 🟡)

---

## Por Spec

| Spec | 🟢 | 🟡 | 🔴 | Confiança |
|------|----|----|-----|-----------|
| `auth/requirements.md` | 23 | 2 | 1 | 94% |
| `messages/requirements.md` | 18 | 2 | 2 | 90% |
| `contacts/requirements.md` | 12 | 0 | 0 | 100% |
| `conversations/requirements.md` | 18 | 1 | 0 | 97% |
| `ai/requirements.md` | 21 | 2 | 4 | 85% |
| `dashboard/requirements.md` | 9 | 1 | 4 | 68% |
| `websocket/requirements.md` | 11 | 0 | 1 | 92% |
| `webhooks/requirements.md` | 10 | 0 | 2 | 83% |
| `instances/requirements.md` | 10 | 0 | 0 | 100% |
| Gloabais (architecture, domain, ADRs) | 32 | 2 | 2 | 78% |

---

## Lacunas Pendentes 🔴

Itens que permaneceram sem confirmação após a revisão:

### auth/requirements.md
- **Rate limiting por role** — Não há limitação de requests

### messages/requirements.md  
- **Status de entrega** — Sem tracking de read/delivered
- **Rate limiting** — Não implementado

### ai/requirements.md
- **Fallback hardcoded para Comercial** — Não configurável
- **Prompt de triagem hardcoded** — Sem dinamismo por tenant
- **Rate limiting LLM** — Custo pode escalar sem controle
- **Cache de resultados** — Mesma mensagem reprocessada

### dashboard/requirements.md
- **company_id não validado via JWT** — Qualquer empresa via query param
- **Sem paginação** — byDepartment/byAgent podem crescer
- **avgResponseTime query imprecisa** — JOIN incremental pode falhar

### websocket/requirements.md
- **CORS origin '*'** — Aberto para qualquer origem

### webhooks/requirements.md
- **Sem autenticação** — Qualquer origem pode chamar
- **Sem validação de signature** — Não verifica Evolution API

---

## Reclassificações Realizadas

| De | Para | Afirmação | Evidência |
|----|------|-----------|-----------|
| 🟢 | 🟡 | RN-CV01: Estados da conversa | Estado `open` não estava listado — `ConversationRepository.js:84` |
| 🟢 | 🟡 | webhooks endpoint path | RF-WH01 dizia `/webhook/evolution`, rota real é `/webhook` — `routes/index.js:135` |
| 🔴 | 🟢 | Refresh tokens implementados | `AuthService.js:64-67` — `generateRefreshToken()` + `authController.js:110-161` — `POST /auth/refresh` |
| 🔴 | 🟢 | Logout invalida tokens | `authController.js:164-183` — `session.deleteByToken(refresh_token)` |

---

## Recomendações

- [x] **auth** — Refresh tokens e logout implementados ✅
- [ ] **webhooks** — Adicionar validação de assinatura (CRÍTICO) 
- [ ] **dashboard** — Validar company_id via JWT (CRÍTICO)
- [ ] **ai** — Adicionar rate limiting para chamadas LLM (ALTO)
- [ ] **messages** — Implementar status de entrega (MÉDIO)

---

*Revisão cruzada: não realizada (Codex não disponível nesta sessão)*