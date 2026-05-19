# Dicionário de Dados — omni-channel

> Nível: **detalhado**

---

## 1. Tabelas do Banco de Dados

### 1.1 companies

| Coluna | Tipo | Obrigatório | Default | Descrição |
|--------|------|--------------|---------|------------|
| id | SERIAL | SIM | auto | PK |
| name | TEXT | SIM | - | Nome da empresa |
| document | TEXT | NÃO | NULL | CNPJ/CPF |
| plan | TEXT | NÃO | 'free' | Plano (free, basic, pro) |
| settings | JSONB | NÃO | {} | Configurações |
| created_at | TIMESTAMP | NÃO | NOW() | Data criação |

**Índices:** PK (id)  
**Relacionamentos:** 1 → N (users, departments, contacts, conversations)

---

### 1.2 departments

| Coluna | Tipo | Obrigatório | Default | Descrição |
|--------|------|--------------|---------|------------|
| id | SERIAL | SIM | auto | PK |
| company_id | INT | SIM | - | FK companies(id) |
| name | TEXT | SIM | - | Nome do departamento |
| description | TEXT | NÃO | NULL | Descrição |
| is_active | BOOLEAN | NÃO | TRUE | Ativo/inativo |
| created_at | TIMESTAMP | NÃO | NOW() | Data criação |

**Índices:** PK (id), UNIQUE (company_id, name)  
**Relacionamentos:** N → 1 (companies), 1 → N (users, conversations, connections)

---

### 1.3 users

| Coluna | Tipo | Obrigatório | Default | Descrição |
|--------|------|--------------|---------|------------|
| id | SERIAL | SIM | auto | PK |
| company_id | INT | SIM | - | FK companies(id) |
| department_id | INT | NÃO | NULL | FK departments(id) |
| name | TEXT | SIM | - | Nome do usuário |
| email | TEXT | SIM | - | Email único |
| password | TEXT | NÃO | NULL | Hash bcrypt |
| role | TEXT | NÃO | 'agent' | master/admin/leader/agent |
| is_active | BOOLEAN | NÃO | TRUE | Ativo/inativo |
| is_online | BOOLEAN | NÃO | FALSE | Online no sistema |
| team_leader_id | INT | NÃO | NULL | FK users(id) |
| created_at | TIMESTAMP | NÃO | NOW() | Data criação |
| updated_at | TIMESTAMP | NÃO | NOW() | Data atualização |

**Índices:** PK (id), UNIQUE (email), idx_users_company, idx_users_department, idx_users_role  
**Relacionamentos:**
- N → 1 (companies)
- N → 1 (departments)
- N → 1 (users, team_leader_id)
- 1 → N (conversations, users)

---

### 1.4 contacts

| Coluna | Tipo | Obrigatório | Default | Descrição |
|--------|------|--------------|---------|------------|
| id | SERIAL | SIM | auto | PK |
| company_id | INT | SIM | - | FK companies(id) |
| name | TEXT | NÃO | NULL | Nome do contato |
| phone | TEXT | SIM | - | Telefone (normalizado) |
| email | TEXT | NÃO | NULL | Email |
| created_at | TIMESTAMP | NÃO | NOW() | Data criação |

**Índices:** PK (id), UNIQUE (company_id, phone), idx_contacts_company_phone  
**Relacionamentos:** N → 1 (companies), 1 → N (conversations)

---

### 1.5 connections

| Coluna | Tipo | Obrigatório | Default | Descrição |
|--------|------|--------------|---------|------------|
| id | SERIAL | SIM | auto | PK |
| company_id | INT | SIM | - | FK companies(id) |
| department_id | INT | NÃO | NULL | FK departments(id) |
| instance_name | TEXT | SIM | - | Nome único por empresa |
| instance_id | TEXT | NÃO | NULL | ID na Evolution API |
| phone_number | TEXT | SIM | - | Número WhatsApp |
| status | TEXT | NÃO | 'offline' | offline/connecting/connected |
| qr_code | TEXT | NÃO | NULL | QR Code (base64) |
| qr_code_expires | TIMESTAMP | NÃO | NULL | Expiração QR |
| api_url | TEXT | NÃO | NULL | URL Evolution API |
| api_key | TEXT | NÃO | NULL | API Key |
| settings | JSONB | NÃO | {} | Configurações |
| created_at | TIMESTAMP | NÃO | NOW() | Data criação |
| updated_at | TIMESTAMP | NÃO | NOW() | Data atualização |

**Índices:** PK (id), UNIQUE (company_id, instance_name), idx_connections_company  
**Relacionamentos:**
- N → 1 (companies)
- N → 1 (departments)
- 1 → N (conversations)

---

### 1.6 conversations

| Coluna | Tipo | Obrigatório | Default | Descrição |
|--------|------|--------------|---------|------------|
| id | SERIAL | SIM | auto | PK |
| company_id | INT | SIM | - | FK companies(id) |
| contact_id | INT | SIM | - | FK contacts(id) |
| department_id | INT | NÃO | NULL | FK departments(id) |
| assigned_to | INT | NÃO | NULL | FK users(id) |
| connection_id | INT | NÃO | NULL | FK connections(id) |
| channel | TEXT | NÃO | 'whatsapp' | Canal (whatsapp) |
| status | TEXT | NÃO | 'open' | pending/queued/in_progress/open/resolved |
| priority | INT | NÃO | 0 | Prioridade |
| ai_draft | TEXT | NÃO | NULL | Resposta sugerida por IA |
| ai_confidence | DECIMAL(3,2) | NÃO | NULL | Confiança IA (0-1) |
| funnel_stage | TEXT | NÃO | 'unclassified' | new/interested/negotiating/closed |
| last_message_at | TIMESTAMP | NÃO | NOW() |Última mensagem |
| created_at | TIMESTAMP | NÃO | NOW() | Data criação |

**Índices:**
- PK (id)
- idx_conversations_company_status
- idx_conversations_department
- idx_conversations_assigned
- idx_conversations_connection

**Relacionamentos:**
- N → 1 (companies, contacts)
- N → 1 (departments, users, connections)
- 1 → N (messages)

---

### 1.7 messages

| Coluna | Tipo | Obrigatório | Default | Descrição |
|--------|------|--------------|---------|------------|
| id | SERIAL | SIM | auto | PK |
| conversation_id | INT | SIM | - | FK conversations(id) |
| sender_type | TEXT | NÃO | 'contact' | contact/user/system |
| sender_id | INT | NÃO | NULL | ID do remetente |
| content | TEXT | SIM | - | Texto da mensagem |
| direction | TEXT | NÃO | 'incoming' | incoming/outgoing |
| status | TEXT | NÃO | 'received' | received/sent/failed |
| metadata | JSONB | NÃO | NULL | Metadados (media_url, etc) |
| created_at | TIMESTAMP | NÃO | NOW() | Data criação |

**Índices:**
- PK (id)
- idx_messages_conversation
- idx_messages_created

**Relacionamentos:** N → 1 (conversations)

---

## 2. Estruturas de Dados em Memória

### 2.1 JWT Payload

```json
{
  "id": 1,
  "email": "admin@csm.com",
  "company_id": 1,
  "role": "master"
}
```

### 2.2 Webhook Payload (Evolution API)

```json
{
  "event": "messages.upsert",
  "data": {
    "messages": [{
      "key": { "remoteJid": "5511999999999@s.whatsapp.net" },
      "pushName": "Nome Cliente",
      "message": { "conversation": ["Olá"] }
    }],
    "pushName": "Nome Cliente"
  }
}
```

### 2.3 ChatService.processIncomingMessage Result

```json
{
  "conversation": { ... },
  "message": { ... },
  "contact": { ... },
  "isNewConversation": true,
  "wasReopened": false
}
```

### 2.4 TriageService.triage Result

```json
{
  "conversationId": 1,
  "department": "Comercial",
  "departmentId": 1,
  "confidence": 0.85,
  "funnel": { "stage": "new", "score": 0.3 },
  "rawResponse": "Comercial"
}
```

### 2.5 Dashboard Stats

```json
{
  "total": 150,
  "open": 45,
  "queued": 20,
  "resolvedToday": 35,
  "onlineAgents": 5,
  "avgResponseSeconds": 45.2,
  "byDepartment": [{ "name": "Comercial", "total": 50, "id": 1 }],
  "byStatus": [{ "status": "pending", "count": 20 }]
}
```

---

## 3. Enum Values

### 3.1 user.role
- `master` — Admin global
- `admin` — Admin da empresa
- `leader` — Líder de equipe
- `agent` — Atendente

### 3.2 conversation.status
- `pending` — Não triada
- `queued` — Triada, esperando
- `in_progress` — Em atendimento
- `open` — Aberta (genérico)
- `resolved` — Finalizada

### 3.3 conversation.funnel_stage
- `unclassified` — Não classificado
- `new` — Novo lead
- `interested` — Interessado
- `negotiating` — Em negociação
- `closed` — Fechado

### 3.4 connection.status
- `offline` — Desconectada
- `connecting` — Conectando (QR pendente)
- `connected` — Conectada

### 3.5 message.direction
- `incoming` — Recebida do contato
- `outgoing` — Enviada pelo atendente

### 3.6 message.status
- `received` — Recebida
- `sent` — Enviada
- `failed` — Falhou

### 3.7 company.plan
- `free` — Plano gratuito
- `basic` — Básico
- `pro` — Profissional

---

## 4. Mapeamento ORM

| Tabela | Repository | Métodos Principais |
|--------|------------|-------------------|
| companies | SupabaseBaseRepository | insert, update, select |
| departments | DepartmentRepository | findByCompany, findByName |
| users | UserRepository | findByEmail, create, findAll |
| contacts | ContactRepository | findByPhone, findOrCreate |
| connections | (via Supabase) | select, insert, update, delete |
| conversations | ConversationRepository | findByCompany, findByContactAndStatus, create, update |
| messages | MessageRepository | create, getConversationHistory |

---

## 5. Normalização de Dados

### 5.1 Telefone
```javascript
// Remove todos os caracteres não-dígitos
phone.replace(/\D/g, '')
// Ex: "+55 (11) 99999-9999" → "5511999999999"
```

### 5.2 Conversão JID WhatsApp
```javascript
// Remove sufixos do JID do WhatsApp
phone.replace('@s.whatsapp.net', '').replace('@g.us', '')
// Ex: "5511999999999@s.whatsapp.net" → "5511999999999"
```

---

## 6. Timestamps

Todas as tabelas têm `created_at` (TIMESTAMP DEFAULT NOW()).

Tabelas atualizáveis têm `updated_at` (updated_at TIMESTAMP DEFAULT NOW()).