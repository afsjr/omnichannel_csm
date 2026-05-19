# Design — Módulo AI

## Arquitetura de Serviços

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI Service Container                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ TriageService│  │AIDraftService│  │    JobQueue   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                  │
│         └─────────────────┴─────────────────┘                  │
│                          │                                      │
│                   ┌──────┴──────┐                              │
│                   │LLMProvider  │                              │
│                   └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes

### TriageService
- **Responsabilidade**: Classificar conversa por departamento
- **Dependências**: LLMProvider, ConversationRepository, MessageRepository, DepartmentRepository
- **Métodos públicos**:
  - `triage(conversationId)` → `{ department, confidence, funnel }`
- **Algoritmo**: Extrai últimas 10 mensagens → monta prompt → chama LLM → parseia resultado → atualiza conversation

### AIDraftService
- **Responsabilidade**: Gerar resposta sugerida
- **Dependências**: LLMProvider, ConversationRepository, MessageRepository
- **Métodos públicos**:
  - `generateDraft(conversationId)` → `{ draft, confidence }`

### FunnelClassificationService
- **Responsabilidade**: Classificar estágio do funil
- **Estágios**: lead → interested → proposal → negotiation → closed
- **Aplicação**: Apenas para departamento Comercial

### JobQueue
- **Responsabilidade**: Processamento assíncrono
- **Características**:
  - Fila em memória (Map)
  - Retry automático (maxAttempts=3)
  - Estados: pending → processing → completed/failed
- **Tipos de job**: triage, generate_draft

### AIProcessingService
- **Responsabilidade**: Orquestrar processamento em background
- **Métodos**: enqueueTriage, enqueueDraft, enqueueFullProcessing, processJob

## Fluxo de Dados

```
1.Mensagem recebida (Webhook)
       ↓
2.ChatService.processMessage()
       ↓
3.AIProcessingService.enqueueFullProcessing(conversationId)
       ↓
4.JobQueue enqueue (triage + draft)
       ↓
5.Processamento assíncrono:
   - TriageService.triage() → department
   - AIDraftService.generateDraft() → draft
       ↓
6.ConversationRepository.update(departmentId, aiConfidence, funnelStage)
       ↓
7.MessageRepository.createSystem(ai_triage)
       ↓
8.io.to(conversation:X).emit('ai_complete')
```

## Interfaces

### AI Controller Endpoints

| Endpoint | Método | Input | Output |
|----------|--------|-------|--------|
| `/ai/process` | POST | `{ conversationId }` | `{ triage, draft }` |
| `/ai/triage` | POST | `{ conversationId }` | `{ department, confidence }` |
| `/ai/draft` | POST | `{ conversationId }` | `{ draft, confidence }` |

### Eventos WebSocket

| Evento | Payload |
|--------|---------|
| `ai_complete` | `{ conversationId, department, departmentId, confidence, draft, funnelStage }` |
| `draft_updated` | `{ conversationId, draft, confidence }` |

## Dependências Externas

- **LLM Provider**: Groq, OpenAI, ou outro configurado em `lib/providers/llm.js`
- **Evoluation API**: Para envio de mensagens (via ChatService)

## Decisões de Design

| Decisão | Justificativa |
|---------|---------------|
| JobQueue em memória | Simplifica setup inicial |
| Limite 10 mensagens | Balance entre contexto e custo LLM |
| Fallback Comercial | Maximiza chances de atendimento |
| Funil apenas Comercial | Foco em vendas |

---

🟢 CONFIRMADO — Extraído do código fonte