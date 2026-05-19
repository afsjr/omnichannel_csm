# Lacunas — OmniChat CSM

> Gerado pelo Revisor em 2026-05-19
> Categorizado por severidade: 🔴 Crítico / 🟡 Moderado / 🔵 Cosmético

---

## 🔴 Crítico

### 1. Ausência de refresh token e invalidação de sessão
- **Spec:** `auth/requirements.md`
- **Descrição:** JWT é stateless sem refresh token. Logout não invalida token.
- **Impacto:** Token roubado vale até expirar. Sessão não pode ser encerrada.
- **Pergunta:** `questions.md#1`

### 2. company_id sem validação JWT no dashboard
- **Spec:** `dashboard/requirements.md`
- **Descrição:** Endpoints de dashboard aceitam company_id via query string sem verificar se o usuário pertence à empresa.
- **Impacto:** Vazamento de dados entre empresas (multi-tenant quebrado).
- **Pergunta:** `questions.md#2`

### 3. Webhook sem autenticação
- **Spec:** `webhooks/requirements.md`
- **Descrição:** POST /webhook sem qualquer validação de origem ou assinatura.
- **Impacto:** Qualquer pessoa pode enviar payloads falsos para o sistema.
- **Pergunta:** `questions.md#3`

---

## 🟡 Moderado

### 4. Rate limiting ausente
- **Specs:** `auth/requirements.md`, `messages/requirements.md`, `ai/requirements.md`
- **Descrição:** Nenhum endpoint tem rate limiting implementado.
- **Impacto:** Abuso de API, custos LLM descontrolados, força bruta em login.

### 5. Fallback e prompt de IA hardcoded
- **Spec:** `ai/requirements.md`
- **Descrição:** Prompt de triagem e fallback "Comercial" estão fixos no código.
- **Impacto:** Difícil customizar por tenant ou atualizar sem deploy.
- **Pergunta:** `questions.md#4`

### 6. Sem cache de resultados de IA
- **Spec:** `ai/requirements.md`
- **Descrição:** Mesma mensagem pode ser reprocessada pela IA.
- **Impacto:** Custo desnecessário de LLM.

### 7. Sem tracking de status de entrega
- **Spec:** `messages/requirements.md`
- **Descrição:** Não há rastreamento se mensagem foi entregue/lida.
- **Impacto:** Sem confirmação de recebimento para o atendente.
- **Pergunta:** `questions.md#5`

### 8. Query de avgResponseTime imprecisa
- **Spec:** `dashboard/requirements.md`
- **Descrição:** JOIN baseado em id incremental pode falhar com mensagens concorrentes.
- **Impacto:** Métrica de tempo de resposta pode estar incorreta.

### 9. API legada de instances duplicada
- **Spec:** `instances/requirements.md`
- **Descrição:** CRUD de instances existe em `api/instances.js` (Supabase) sem equivalente no backend Fastify.
- **Impacto:** Duplicação de código, risco de divergência.

---

## 🔵 Cosmético

### 10. CORS aberto no WebSocket
- **Spec:** `websocket/requirements.md`
- **Descrição:** Socket.IO configurado com `origin: '*'`.
- **Impacto:** Baixo, pois WebSocket tem autenticação por room.

### 11. Sem paginação em byDepartment/byAgent
- **Spec:** `dashboard/requirements.md`
- **Descrição:** Consultas retornam todos os registros sem limite.
- **Impacto:** Com muitas empresas, pode ficar lento.

---

## Resumo

| Severidade | Quantidade | Itens |
|-----------|-----------|-------|
| 🔴 Crítico | 3 | Refresh token, company_id JWT, webhook auth |
| 🟡 Moderado | 6 | Rate limiting, IA hardcoded, cache, tracking, query, instances |
| 🔵 Cosmético | 2 | CORS, paginação |
| **Total** | **11** | |