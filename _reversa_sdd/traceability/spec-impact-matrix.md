# Matriz de Impacto de Specs

> Rastreabilidade: qual componente impacta qual quando modificado

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| → | Impacta diretamente |
| ↔ | Dependência mútua |
| →? | Impacto parcial/condicional |

---

## Matriz: Features → Componentes

| Feature | Auth | Chat | AI | Dashboard | WebSocket | Webhook | Instances |
|---------|------|------|----|-----------|-----------|---------|-----------|
| **Login/Auth** | →→→ | - | - | → | → | - | - |
| **CRUD Usuários** | →→ | - | - | - | - | - | - |
| **Receber Mensagem** | - | →→→ | → | - | → | →→→ | → |
| **Enviar Mensagem** | - | →→→ | - | - | → | - | →→ |
| **Triagem IA** | - | → | →→→ | - | → | - | - |
| **AI Draft** | - | → | →→→ | - | → | - | - |
| **Dashboard** | - | → | - | →→→ | - | - | - |
| **Conexão WhatsApp** | - | → | - | - | - | → | →→→ |
| **Gerenciar Instâncias** | → | - | - | - | - | - | →→→ |
| **Fila de Mensagens** | - | → | → | - | - | → | - |

---

## Matriz: Componentes → Database

| Componente | companies | departments | users | contacts | connections | conversations | messages |
|------------|-----------|-------------|-------|----------|-------------|---------------|----------|
| **AuthService** | - | - | →→→ | - | - | - | - |
| **ChatService** | - | → | - | →→→ | → | →→→ | →→→ |
| **TriageService** | - | → | - | - | - | →→ | → |
| **AIDraftService** | - | - | - | - | - | →→ | → |
| **Dashboard** | → | →→ | →→ | - | - | →→ | → |
| **Webhook** | - | - | - | → | → | → | →→ |

---

## Rastreabilidade de Fluxos

### Fluxo 1: Mensagem Recebida

```
WhatsApp → Evolution API → webhookController
                                ↓
                         ChatService.processIncomingMessage
                                ↓
         ┌─────────────────────┼─────────────────────┐
         ↓                     ↓                     ↓
   ContactRepository    ConversationRepository   MessageRepository
         ↓                     ↓                     ↓
      contacts            conversations          messages
```

### Fluxo 2: Triagem IA

```
Webhook → ChatService → AIProcessingService.processAll()
                                         ↓
                      ┌──────────────────┴──────────────────┐
                      ↓                                     ↓
            TriageService.triage()               AIDraftService.generateDraft()
                      ↓                                     ↓
            ConversationRepository.update()      ConversationRepository.updateDraft()
                      ↓                                     ↓
              conversations (department_id,              conversations (ai_draft,
              status, ai_confidence, funnel_stage)       ai_confidence)
```

### Fluxo 3: Dashboard Stats

```
Frontend → dashboardController.getStats()
                              ↓
         ┌─────────────────────┼─────────────────────┐
         ↓                     ↓                     ↓
  ConversationRepository  MessageRepository   UserRepository
         ↓                     ↓                     ↓
      conversations          messages            users
```

---

## Impacto de Mudanças

| Mudança Proposta | Componentes Afetados | Impacto | Esforço |
|------------------|---------------------|---------|---------|
| Adicionar novo departamento | TriageService, schema | Média | Médio |
| Novo provedor de IA | LLMProvider | Baixo | Baixo |
| Adicionar canal (Telegram) | ChatService, Webhook, EvolutionProvider | Alto | Alto |
| Alterar roles de permissão | permissions.js, AuthService | Médio | Médio |
| Adicionar metricas ao dashboard | dashboardController, SQL queries | Baixo | Baixo |
| Mudar banco de dados | Repositories, Database classes | Alto | Alto |
| Adicionar rate limiting | Fastify config, middleware | Médio | Médio |

---

## Dependências Externas

| Serviço | Componentes que Dependem | Tipo de Dependência |
|---------|---------------------------|---------------------|
| **Supabase** | Todos os Repositories | Database |
| **Evolution API** | EvolutionProvider, Instances API | WhatsApp |
| **LLM Provider** | LLMProvider, TriageService, AIDraftService | IA |
| **WhatsApp** | (indireto via Evolution) | Canal |

---

## Riscos de Acoplamento

| Componente | Acoplado com | Risco |
|------------|---------------|-------|
| ChatService | ConversationRepository, ContactRepository, EvolutionProvider | Alto — muita responsabilidade |
| TriageService | ConversationRepository, LLMProvider | Médio |
| Dashboard | Múltiplas queries diretas ao DB | Médio — queries complexas |
| WebhookController | ChatService, AIProcessingService | Médio |

🟢 CONFIRMADO — Baseado na análise de código e fluxos