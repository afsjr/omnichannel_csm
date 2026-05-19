---
schemaVersion: 1
generatedAt: "2026-05-19T17:10:00Z"
reversa:
  version: "1.2.43"
kind: target_business_rules
producedBy: curator
---

# Target Business Rules

> Catálogo das regras de negócio do legado com decisão de migração: MIGRAR, DESCARTAR ou DECISÃO HUMANA.

## Resumo
- Total de regras analisadas: 42
- MIGRAR: 34
- DESCARTAR: 0 (nenhuma — paradigma conservador, sem descarte por paradigma)
- DECISÃO HUMANA: 8

## Regras MIGRAR

### Módulo Auth
| ID | Origem | Descrição | Confiança |
|----|--------|-----------|-----------|
| BR-MIGRAR-001 | `auth/requirements.md` § RN-A01 | Master tem acesso a todas as empresas | 🟢 |
| BR-MIGRAR-002 | `auth/requirements.md` § RN-A02 | Admin/Leader/Agent só acessam própria empresa | 🟢 |
| BR-MIGRAR-003 | `auth/requirements.md` § RN-A03 | Agent só vê conversas atribuídas | 🟢 |
| BR-MIGRAR-004 | `auth/requirements.md` § RN-A04 | Leader vê conversas do departamento | 🟡 |
| BR-MIGRAR-005 | `auth/requirements.md` § RN-A05 | Hierarquia: master > admin > leader > agent | 🟢 |
| BR-MIGRAR-006 | `auth/requirements.md` § RF-A08/09/10 | Refresh token + logout com invalidação | 🟢 |

### Módulo Messages
| ID | Origem | Descrição | Confiança |
|----|--------|-----------|-----------|
| BR-MIGRAR-007 | `messages/requirements.md` § RN-M01 | Telefone normalizado (apenas dígitos) | 🟢 |
| BR-MIGRAR-008 | `messages/requirements.md` § RN-M02 | Contato criado automaticamente se não existir | 🟢 |
| BR-MIGRAR-009 | `messages/requirements.md` § RN-M03 | Conversa criada se não existir (ou reaberta) | 🟢 |
| BR-MIGRAR-010 | `messages/requirements.md` § RN-M04 | Última mensagem atualiza last_message_at | 🟢 |
| BR-MIGRAR-011 | `messages/requirements.md` § RN-M05 | Direção: incoming (contato) / outgoing (atendente) | 🟢 |

### Módulo Contacts
| ID | Origem | Descrição | Confiança |
|----|--------|-----------|-----------|
| BR-MIGRAR-012 | `contacts/requirements.md` § RN-C01 | Unicidade (company_id, phone) | 🟢 |
| BR-MIGRAR-013 | `contacts/requirements.md` § RN-C02 | Normalização de telefone | 🟢 |
| BR-MIGRAR-014 | `contacts/requirements.md` § RN-C03 | Nome padrão = telefone normalizado | 🟢 |

### Módulo Conversations
| ID | Origem | Descrição | Confiança |
|----|--------|-----------|-----------|
| BR-MIGRAR-015 | `conversations/requirements.md` § RN-CV01 | Ciclo de vida: open → pending → queued → in_progress → resolved | 🟡 |
| BR-MIGRAR-016 | `conversations/requirements.md` § RN-CV02 | Reabertura limpa assigned_to | 🟢 |
| BR-MIGRAR-017 | `conversations/requirements.md` § RN-CV03 | Requeue limpa assigned_to | 🟢 |
| BR-MIGRAR-018 | `conversations/requirements.md` § RN-CV04 | Atribuição muda para in_progress | 🟢 |
| BR-MIGRAR-019 | `conversations/requirements.md` § RN-CV05 | Atualização altera last_message_at | 🟢 |

### Módulo AI
| ID | Origem | Descrição | Confiança |
|----|--------|-----------|-----------|
| BR-MIGRAR-020 | `ai/requirements.md` § RN-AI01 | Classificação por departamento via LLM | 🟢 |
| BR-MIGRAR-021 | `ai/requirements.md` § RN-AI02 | Departamentos fixos: Comercial, Financeiro, Secretaria, Acadêmico | 🟢 |
| BR-MIGRAR-022 | `ai/requirements.md` § RN-AI03 | Fallback para Comercial se ambíguo | 🟢 |
| BR-MIGRAR-023 | `ai/requirements.md` § RN-AI04 | Funil apenas para departamento Comercial | 🟡 |
| BR-MIGRAR-024 | `ai/requirements.md` § RN-AI05 | Confiança calculada baseada em tokens | 🟡 |

### Módulo Dashboard
| ID | Origem | Descrição | Confiança |
|----|--------|-----------|-----------|
| BR-MIGRAR-025 | `dashboard/requirements.md` § RN-D01 | Métricas isoladas por company_id | 🟢 |
| BR-MIGRAR-026 | `dashboard/requirements.md` § RN-D02 | Status counting com IN ('open','pending','in_progress','queued') | 🟢 |
| BR-MIGRAR-027 | `dashboard/requirements.md` § RN-D03 | Resolved today = DATE(last_message_at) = CURRENT_DATE | 🟢 |
| BR-MIGRAR-028 | `dashboard/requirements.md` § RN-D04 | Funil apenas para Comercial | 🟡 |

### Módulo WebSocket
| ID | Origem | Descrição | Confiança |
|----|--------|-----------|-----------|
| BR-MIGRAR-029 | `websocket/requirements.md` | Join/leave rooms (department, user, conversation) | 🟢 |

### Módulo Webhooks
| ID | Origem | Descrição | Confiança |
|----|--------|-----------|-----------|
| BR-MIGRAR-030 | `webhooks/requirements.md` | Parse de mensagens (texto, imagem, vídeo, áudio, doc, sticker) | 🟢 |
| BR-MIGRAR-031 | `webhooks/requirements.md` | Extração de phone + contact_name | 🟢 |
| BR-MIGRAR-032 | `webhooks/requirements.md` | Acionar ChatService após receber mensagem | 🟢 |
| BR-MIGRAR-033 | `webhooks/requirements.md` | Processamento async de IA | 🟢 |

### Módulo Instances
| ID | Origem | Descrição | Confiança |
|----|--------|-----------|-----------|
| BR-MIGRAR-034 | `instances/requirements.md` | CRUD de instâncias + connect/disconnect via Evolution API | 🟢 |

## Regras DESCARTAR (resumo)

Nenhuma regra descartada. Paradigma conservador (OO com DI → OO com DI) não gera descarte por mudança de paradigma.

## Regras DECISÃO HUMANA

### BR-HUMANA-001 ✅
- **Origem**: `auth/requirements.md` § Lacunas
- **Tipo**: 🔴 GAP
- **Descrição**: Implementar rate limiting por role para evitar abuso de API e força bruta
- **Opções**: (a) Implementar rate limiting simples (ex: 100 req/min por user), (b) Ignorar (risco aceito)
- **Recomendação do Curator**: (a) Implementar — CRÍTICO para produção
- **Decisão**: Implementar rate limiting
- **Status**: RESOLVIDA (Adelino, 2026-05-19) — REFERIDO À CODIFICAÇÃO

### BR-HUMANA-002 ✅
- **Origem**: `dashboard/requirements.md` § Lacunas
- **Tipo**: 🔴 GAP
- **Descrição**: Validação de company_id — admin vê múltiplas empresas, demais roles só a própria
- **Opções**: (a) Implementar validação por role (admin/master pode query, demais usam JWT), (b) Manter como está (aberto)
- **Recomendação do Curator**: (a) Implementar — risco de vazamento multi-tenant
- **Decisão**: Admin/master pode usar query param; demais roles usam company_id do JWT
- **Status**: RESOLVIDA (Adelino, 2026-05-19)

### BR-HUMANA-003 ✅
- **Origem**: `webhooks/requirements.md` § Lacunas
- **Tipo**: 🔴 GAP
- **Descrição**: Webhook sem validação de origem — qualquer um pode chamar
- **Opções**: (a) API key check obrigatório (x-api-key header), (b) IP whitelist, (c) Ambos
- **Recomendação do Curator**: (a) API key check — Evolution API já envia apikey no header
- **Decisão**: Implementar API key check (x-api-key)
- **Status**: RESOLVIDA (Adelino, 2026-05-19)

### BR-HUMANA-004 ✅
- **Origem**: `ai/requirements.md` § Lacunas
- **Tipo**: 🔴 GAP
- **Descrição**: Rate limiting para chamadas LLM para controlar custo
- **Opções**: (a) Implementar rate limit por conversa (ex: 1 chamada a cada 5min), (b) Ignorar (risco de custo)
- **Recomendação do Curator**: (a) Implementar — custo LLM pode escalar sem controle
- **Decisão**: Adiar — Groq free cobre por enquanto. Revisar quando migrar para API paga
- **Status**: RESOLVIDA (Adelino, 2026-05-19) — REFERIDO À CODIFICAÇÃO como nota futura

### BR-HUMANA-005 ✅
- **Origem**: `ai/requirements.md` § Lacunas
- **Tipo**: 🔴 GAP
- **Descrição**: Cache de resultados de IA para evitar reprocessamento da mesma mensagem
- **Opções**: (a) Cache simples em memória por message_id, (b) Ignorar
- **Recomendação do Curator**: (a) Cache — baixo custo, alto benefício
- **Decisão**: Implementar cache em memória
- **Status**: RESOLVIDA (Adelino, 2026-05-19) — REFERIDO À CODIFICAÇÃO

### BR-HUMANA-006 ✅
- **Origem**: `dashboard/requirements.md` § Lacunas
- **Tipo**: 🔴 GAP
- **Descrição**: avgResponseTime query usa JOIN incremental que pode falhar com mensagens concorrentes
- **Opções**: (a) Corrigir query para usar LAG() com partition by conversation_id, (b) Ignorar (métrica aproximada)
- **Recomendação do Curator**: (a) Corrigir — impacto na precisão da métrica
- **Explicação**: JOIN `m2.id = m1.id + 1` assume IDs sequenciais, mas inserts concorrentes quebram isso. `LAG(created_at) OVER (PARTITION BY conversation_id ORDER BY created_at)` é a forma correta — calcula diferença de tempo entre mensagens consecutivas independente de ID. Correção de ~30 min.
- **Decisão**: Corrigir usando LAG() com partition
- **Status**: RESOLVIDA (Adelino, 2026-05-19) — REFERIDO À CODIFICAÇÃO

### BR-HUMANA-007 ✅
- **Origem**: `websocket/requirements.md` § Lacunas
- **Tipo**: 🔴 GAP
- **Descrição**: CORS configurado como origin '*' (qualquer origem pode conectar)
- **Opções**: (a) Restringir CORS para origins conhecidas (ex: domínio do frontend + localhost), (b) Manter '*' (baixo risco)
- **Recomendação do Curator**: (a) Restringir — boa prática de segurança
- **Decisão**: Restringir para domínios do frontend + localhost
- **Status**: RESOLVIDA (Adelino, 2026-05-19) — REFERIDO À CODIFICAÇÃO

### BR-HUMANA-008 ✅
- **Origem**: `messages/requirements.md` § Lacunas
- **Tipo**: 🔴 GAP
- **Descrição**: Sem tracking de status de entrega (enviado/entregue/lido)
- **Opções**: (a) Implementar futuramente (baixa prioridade), (b) Ignorar
- **Recomendação do Curator**: (a) Implementar futuramente — não crítico agora
- **Decisão**: Implementar depois (baixa prioridade)
- **Status**: RESOLVIDA (Adelino, 2026-05-19) — REFERIDO À CODIFICAÇÃO como nota futura

## Notas

8 itens de DECISÃO HUMANA analisados. Todos resolvidos. 5 itens referidos à codificação (BR-HUMANA-001, 005, 006, 007, 003). 3 itens registrados como nota futura (BR-HUMANA-004, 008 e #2 já como parte do código existente).