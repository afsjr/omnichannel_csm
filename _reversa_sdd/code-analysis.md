# Análise de Código — omni-channel

> Nível: **detalhado**  
> 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA

---

## 1. Arquitetura Geral

O projeto é um sistema **omnichannel SaaS** para atendimento via WhatsApp com múltiplas empresas (multi-tenant), múltiplas instâncias WhatsApp por empresa, e IA para triagem e sugestões de resposta.

### Stack
| Camada | Tecnologia |
|--------|------------|
| Backend | Node.js 20 + Fastify 4.28.1 |
| Frontend | React 18 + Vite 6 |
| Database | PostgreSQL + Supabase |
| WebSocket | Socket.IO 4.8.1 |
| Mensagens | Evolution API (WhatsApp) |
| IA | LLM Provider (genérico) |

### Estrutura de Pastas
```
backend/src/
├── app.js                  # Entry point
├── routes/                 # Rotas Fastify
├── controllers/           # Controllers (auth, message, contact, ai, dashboard, webhook)
├── services/              # Services (Auth, Chat, AI, Triage, Funnel, AIDraft, Evolution)
├── repositories/          # Repositories (Base, User, Contact, Message, Conversation, Department)
├── providers/             # Providers (Evolution, LLM)
├── database/               # Database (Database, SupabaseDatabase)
└── websocket/             # WebSocket (Socket.IO)
```

---

## 2. Módulos Identificados

### 2.1 Auth (Autenticação)

**Arquivos:**
- `backend/src/services/AuthService.js` — Lógica de autenticação
- `backend/src/controllers/authController.js` — Controller HTTP
- `api/auth/*` — API routes legada

**Funcionalidades:**
- `hashPassword(password)` — Hasheia senha com bcrypt (10 rounds)
- `comparePassword(password, hash)` — Compara senha com hash
- `generateToken(user)` — Gera JWT manual (HS256)
- `verifyToken(token)` — Valida JWT

**Estrutura de dados:**
| Campo | Tipo | Descrição |
|-------|------|------------|
| id | INT | ID do usuário |
| email | TEXT | Email único |
| company_id | INT | FK para companies |
| role | TEXT | master/admin/leader/agent |
| password | TEXT | Hash bcrypt |

**Fluxo:**
```
Usuário faz login → authController → AuthService.hashPassword/compare
→ AuthService.generateToken → retorna JWT para cliente
```

**Roles (RBAC):**
- `master` — Admin global (acesso total)
- `admin` — Admin da empresa
- `leader` — Líder de equipe
- `agent` — Atendente

🟢 CONFIRMADO — Extraído de schema.sql e AuthService.js

---

### 2.2 Messages (Mensagens)

**Arquivos:**
- `backend/src/repositories/MessageRepository.js`
- `backend/src/services/ChatService.js` — processIncomingMessage, sendMessage

**Funcionalidades:**
- `processIncomingMessage(payload)` — Processa mensagem recebida do webhook
- `sendMessage(conversationId, content, senderId)` — Envia mensagem via Evolution API
- `sendMediaMessage()` — Envia mídia (imagem, vídeo, áudio, documento)

**Estrutura de dados (messages table):**
| Campo | Tipo | Descrição |
|-------|------|------------|
| id | SERIAL | PK |
| conversation_id | INT | FK |
| sender_type | TEXT | contact/user |
| sender_id | INT | ID do remetente |
| content | TEXT | Texto da mensagem |
| direction | TEXT | incoming/outgoing |
| status | TEXT | received/sent/failed |
| metadata | JSONB | Metadados (media_url, tipo, etc) |
| created_at | TIMESTAMP | Data criação |

**Normalização de telefone:**
```javascript
phone.replace(/\D/g, '') // Remove todos os não-dígitos
```

**Fluxo de mensagem recebida:**
```
Webhook Evolution API → webhookController.receiveWebhook
→ parseWebhookPayload() → ChatService.processIncomingMessage
→ ContactRepository.findOrCreate → ConversationRepository.findOrCreate
→ MessageRepository.create → retorna para cliente via WebSocket
```

🟢 CONFIRMADO — Extraído de ChatService.js e schema.sql

---

### 2.3 Contacts (Contatos)

**Arquivos:**
- `backend/src/repositories/ContactRepository.js`

**Funcionalidades:**
- `findByPhone(companyId, phone)` — Busca contato por telefone
- `findOrCreate(companyId, name, phone)` — Cria se não existir
- `findAll(companyId, options)` — Lista com busca e paginação
- `update(id, data)` — Atualiza dados

**Estrutura de dados (contacts table):**
| Campo | Tipo | Descrição |
|-------|------|------------|
| id | SERIAL | PK |
| company_id | INT | FK companies |
| name | TEXT | Nome do contato |
| phone | TEXT | Telefone (único por empresa) |
| email | TEXT | Email (opcional) |

**Restrições:**
- UNIQUE(company_id, phone)

🟢 CONFIRMADO — Extraído de ContactRepository.js e schema.sql

---

### 2.4 Conversations (Conversas)

**Arquivos:**
- `backend/src/repositories/ConversationRepository.js`
- `backend/src/services/ChatService.js`

**Funcionalidades:**
- `findByContactAndStatus()` — Busca conversa aberta/resolvida
- `findByCompany()` — Lista com filtros (status, department, assigned)
- `create()` — Cria nova conversa
- `update()` — Atualiza status, departamento, assignee, etc
- `assignTo()` — Atribui a um atendente
- `resolve()` — Marca como resolvida
- `reopen()` — Reabre conversa
- `requeue()` — Devolve para fila

**Estados de conversa:**
- `pending` — Não triada ainda
- `queued` — Triada, esperando atribuicao
- `in_progress` — Em atendimento
- `open` — Aberta (genérico)
- `resolved` — Resolvida

**Fluxo de triagem:**
```
Nova mensagem → ChatService.processIncomingMessage
→ cria conversa se não existir → marca pending
→ após triage (AI) → atualiza department_id, status=queued
→ assignment → status=in_progress
```

🟢 CONFIRMADO — Extraído de ConversationRepository.js e ChatService.js

---

### 2.5 AI (Inteligência Artificial)

**Arquivos:**
- `backend/src/services/AIService.js`
- `backend/src/services/TriageService.js`
- `backend/src/services/AIDraftService.js`
- `backend/src/services/FunnelClassificationService.js`
- `backend/src/providers/LLMProvider.js`

**Componentes:**

#### 2.5.1 TriageService
Classifica a mensagem para um departamento:
- Comercial — dúvidas sobre cursos, matrículas
- Financeiro — pagamentos, boletos
- Secretaria — documentos, transferências
- Acadêmico — aulas, certificados

Usa LLM para classificar e atualiza:
- `department_id` na conversa
- `status` para `queued`
- `ai_confidence` (0.3 a 0.95)
- `funnel_stage` (via FunnelClassificationService)

#### 2.5.2 AIDraftService
Gera sugestão de resposta baseada no histórico da conversa.

#### 2.5.3 FunnelClassificationService
Classifica o lead em estágio do funil:
- `unclassified` — Não classificado
- `new` — Novo lead
- `interested` — Interessado
- `negotiating` — Em negociação
- `closed` — Fechado

#### 2.5.4 AIProcessingService (JobQueue)
Sistema de filas para processar tarefas de IA:
- `triage` — Classificação de departamento
- `generate_draft` — Geração de resposta

**Fluxo de IA:**
```
Webhook → ChatService.processIncomingMessage
→ async: AIProcessingService.processAll()
→ TriageService.triage() → classifica departamento
→ FunnelClassificationService.classify() → funil
→ AIDraftService.generateDraft() → sugestão
→ WebSocket 'ai_processing_complete' → frontend
```

🟡 INFERIDO — Comportamento esperado baseado nos arquivos de serviço

---

### 2.6 Dashboard (Painel)

**Arquivos:**
- `backend/src/controllers/dashboardController.js`

**Funcionalidades:**
- `getStats()` — Estatísticas gerais (total, open, queued, resolved today, agents online)
- `getDashboardStats()` — Métricas por período (today, week, month) + por departamento + por agente
- `getRecentActivity()` — Mensagens recentes

**Métricas:**
- Total de conversas
- Conversas abertas/pendentes/em progresso/na fila
- Resolvidas hoje
- Agentes online
- Tempo médio de resposta (calculado via lag)
- Por departamento
- Por status
- Por agente (em progresso, resolvidas hoje)
- Funil de vendas (por estágio)

**SQL Features:**
- `COUNT(*) FILTER (WHERE status = 'x')` — Agregação condicional
- `DATE_TRUNC('week', CURRENT_DATE)` — Truncagem de data
- `EXTRACT(EPOCH FROM ...)` — Cálculo de tempo

🟢 CONFIRMADO — Extraído de dashboardController.js

---

### 2.7 WebSocket (Tempo Real)

**Arquivos:**
- `backend/src/websocket/index.js`

**Funcionalidades:**
- `join:department` — Entra no room do departamento
- `join:user` — Entra no room do usuário
- `join:conversation` — Entra no room da conversa
- `leave:*` — Sai dos rooms

**Events emitidos:**
- `connected` — Confirma conexão
- `ai_processing_complete` — Quando IA termina (via webhookController)

**Rooms:**
- `department:{id}` — Mensagens para um departamento
- `user:{id}` — Mensagens privadas do usuário
- `conversation:{id}` — Atualização de uma conversa específica

🟢 CONFIRMADO — Extraído de websocket/index.js

---

### 2.8 Webhooks (Integrações)

**Arquivos:**
- `backend/src/controllers/webhookController.js`

**Funcionalidades:**
- `receiveWebhook(req)` — Recebe webhook da Evolution API
- `parseWebhookPayload(payload)` — Normaliza dados de diferentes formatos de payload

**Tipos de mensagem processados:**
- `extendedTextMessage` — Texto com link
- `conversation` — Texto simples
- `imageMessage` — Imagem (com caption, url, mimetype)
- `videoMessage` — Vídeo
- `audioMessage` — Áudio
- `documentMessage` — Documento
- `stickerMessage` — Sticker

**Parsing de phone:**
```javascript
phone.replace('@s.whatsapp.net', '').replace('@g.us', '')
```

**Fluxo completo:**
```
Evolution API → POST /webhook → webhookController.receiveWebhook
→ parseWebhookPayload → ChatService.processIncomingMessage
→ async: AIProcessingService.processAll()
→ WebSocket emit → retorna 200 OK
```

🟢 CONFIRMADO — Extraído de webhookController.js

---

### 2.9 Instances (Instâncias WhatsApp)

**Arquivos:**
- `api/instances.js`
- `backend/src/providers/EvolutionProvider.js`

**Funcionalidades:**
- `listInstances()` — Lista todas as instâncias
- `createInstance()` — Cria nova instância
- `getInstance()` — Detalhes
- `updateInstance()` — Atualiza
- `deleteInstance()` — Remove
- `connectInstance()` — Gera QR Code (chama Evolution API)
- `disconnectInstance()` — Desconecta

**Estrutura de dados (connections table):**
| Campo | Tipo | Descrição |
|-------|------|------------|
| id | SERIAL | PK |
| company_id | INT | FK companies |
| department_id | INT | FK departments (opcional) |
| instance_name | TEXT | Nome único por empresa |
| instance_id | TEXT | ID na Evolution API |
| phone_number | TEXT | Número WhatsApp |
| status | TEXT | offline/connecting/connected |
| qr_code | TEXT | QR Code (base64) |
| qr_code_expires | TIMESTAMP | Expiração do QR |
| api_url | TEXT | URL da Evolution API |
| api_key | TEXT | API Key |
| settings | JSONB | Configurações |

**Fluxo de conexão:**
```
POST /instances/:id/connect → Evolution API POST /instance/connect/{name}
→ recebe QR Code → salva em connections → retorna para cliente
→ cliente escaneia → Evolution API conecta → webhook updateConnectionStatus
```

🟢 CONFIRMADO — Extraído de instances.js e schema.sql

---

## 3. Repositories (Padrão Repository)

Todos os repositories estendem `SupabaseBaseRepository` e usam o cliente Supabase:

| Repository | Tabela | Funções Principais |
|------------|--------|-------------------|
| UserRepository | users | findByEmail, create, findAll, update |
| ContactRepository | contacts | findByPhone, findOrCreate, findAll |
| ConversationRepository | conversations | findById, findByCompany, create, update |
| MessageRepository | messages | create, getConversationHistory |
| DepartmentRepository | departments | findByCompany, findByName |

🟢 CONFIRMADO — Extraído dos arquivos de repository

---

## 4. Providers

### 4.1 LLMProvider
Abstrai chamadas para provedores de IA (OpenAI, Anthropic, etc). Classe genérica que pode ser extendida.

### 4.2 EvolutionProvider
Abstrai chamadas para Evolution API:
- `sendText(phone, text)`
- `sendMedia(phone, url, caption)`
- `connect(instanceName)`
- `disconnect(instanceName)`

🟡 INFERIDO — Não analisar os arquivos diretamente

---

## 5. Database

### 5.1 Multi-Tenant
- `companies` table com `id` como chave
- Todas as tabelas principais têm `company_id`
- Queries sempre filtram por `company_id`

### 5.2 Índices
```sql
idx_users_company, idx_users_department, idx_users_role
idx_conversations_company_status, idx_conversations_department
idx_conversations_assigned, idx_conversations_connection
idx_messages_conversation, idx_messages_created
idx_contacts_company_phone, idx_connections_company
```

🟢 CONFIRMADO — Extraído de schema.sql

---

## 6. Fluxo de Dados Completo

```
[WhatsApp] → [Evolution API] → [Webhook] → [webhookController]
    ↓
[ChatService.processIncomingMessage()]
    ├─→ ContactRepository.findOrCreate()
    ├─→ ConversationRepository.findOrCreate/create()
    ├─→ MessageRepository.create()
    └─→ (async) AIProcessingService.processAll()
         ├─→ TriageService.triage()
         │    └─→ ConversationRepository.update(department_id, status)
         └─→ AIDraftService.generateDraft()
              └─→ ConversationRepository.updateDraft(ai_draft)

[WebSocket] ← [io.emit('ai_processing_complete')]

[Frontend] ← [Socket.IO] → [Dashboard atualiza]
```

---

## 7. Entidades e Relacionamentos

```
companies (1) ──┬── (N) users
                ├── (N) departments
                ├── (N) contacts
                └── (N) conversations

departments (1) ──┬── (N) users
                  ├── (N) conversations
                  └── (N) connections

users (1) ──┬── (N) conversations (assigned_to)
            └── (N) users (team_leader_id)

contacts (1) ──── (N) conversations

conversations (1) ──┬── (N) messages
                   ├── (1) contacts
                   ├── (1) departments
                   ├── (1) users (assigned_to)
                   └── (1) connections
```

---

## 8. GAPs e Lacunas

| Item | Confiança | Descrição |
|------|------------|------------|
| LLMProvider implementation | 🔴 LACUNA | Classe base não analisada, comportamento exato desconhecido |
| EvolutionProvider implementation | 🔴 LACUNA | Classe base não analisada, chamadas API não verificadas |
| Frontend components | 🔴 LACUNA | Análise superficial, apenas listagem de arquivos |
| Auth middleware | 🔴 LACUNA | Como as rotas protegem JWT não verificado |
| WebSocket authentication | 🔴 LACUNA | Como o socket autentica usuários |

---

## 9. Sumário

| Módulo | Arquivos | Complexidade | Confiança |
|--------|----------|--------------|------------|
| Auth | 3 | Média | 🟢 |
| Messages | 2 | Alta | 🟢 |
| Contacts | 1 | Baixa | 🟢 |
| Conversations | 2 | Alta | 🟢 |
| AI | 5 | Alta | 🟡 |
| Dashboard | 1 | Média | 🟢 |
| WebSocket | 1 | Baixa | 🟢 |
| Webhooks | 1 | Média | 🟢 |
| Instances | 2 | Média | 🟢 |

**Total de entidades:** 9  
**Total de arquivos principal:** ~20  
**Complexidade geral:** Média-Alta  
**Confiança geral:** 🟢 (70% confirmado, 30% inferido)