# Perguntas para Validação — OmniChat CSM

> Gerado pelo Revisor em 2026-05-19
> Responda cada pergunta e me avise quando terminar.

---

## Pergunta 1 ✅ Respondida

**Contexto:** Módulo `auth` — não há refresh token nem invalidação de JWT no backend
**Spec afetada:** [`_reversa_sdd/auth/requirements.md`]
**Pergunta:** O sistema deve ter refresh tokens e/ou mecanismo de logout que invalide sessões? Atualmente tokens JWT são stateless e não expiram até o TTL.
**Impacto:** Se sim, requer nova funcionalidade. Se não, o gap permanece como aceito.

**Resposta:** Sim, implementamos refresh token com tabela `sessions` + endpoint `/auth/refresh`. Logout agora deleta a sessão do banco.

---

## Pergunta 2 ✅ Respondida

**Contexto:** Módulo `dashboard` — companyId lido de req.query sem validação JWT
**Spec afetada:** [`_reversa_sdd/dashboard/requirements.md`]
**Pergunta:** O dashboard deve filtrar por company_id do token JWT do usuário logado (isolamento multi-tenant) ou o parâmetro company_id na query é intencional?
**Impacto:** Se JWT, a query precisa ser alterada. Se intencional, tem risco de segurança.

**Resposta:** Admin pode ver múltiplas empresas. Manter company_id via query, mas adicionar validação: admin/master pode qualquer company, demais roles usam a do JWT.

---

## Pergunta 3 ✅ Respondida

**Contexto:** Módulo `webhooks` — endpoint /webhook sem autenticação
**Spec afetada:** [`_reversa_sdd/webhooks/requirements.md`]
**Pergunta:** O webhook da Evolution API deve ser autenticado? Há token/secret compartilhado com a Evolution API para validar a origem?
**Impacto:** Se sim, precisa implementar validação de assinatura HMAC ou API key.

**Resposta:** Adicionar API key check (x-api-key header). A Evolution API envia apikey no header.

---

## Pergunta 4 ✅ Respondida

**Contexto:** Módulo `ai` — prompt de triagem e fallback hardcoded
**Spec afetada:** [`_reversa_sdd/ai/requirements.md`]
**Pergunta:** Os departamentos e o prompt de triagem devem ser configuráveis por empresa (tenant) ou são fixos para todos os clientes?
**Impacto:** Se configurável, o TriageService precisa ser refatorado para aceitar configuração dinâmica.

**Resposta:** Fallback para Comercial está ok. Manter como está, reclassificar como risco aceito.

---

## Pergunta 5 ✅ Respondida

**Contexto:** Módulo `messages` — sem tracking de status de entrega
**Spec afetada:** [`_reversa_sdd/messages/requirements.md`]
**Pergunta:** É necessário rastrear status de entrega (enviado, entregue, lido) das mensagens enviadas? A Evolution API suporta webhooks de confirmação.
**Impacto:** Se sim, requer integração com eventos de confirmação da Evolution API.

**Resposta:** Ok, mas não é prioridade. Manter como lacuna de baixa prioridade.