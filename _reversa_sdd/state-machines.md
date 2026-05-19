# Máquinas de Estado — omni-channel

> Nível: **detalhado**

---

## 1. Máquina de Estado: Conversa

### 1.1 Estados Possíveis

| Estado | Descrição | Origem |
|--------|-----------|--------|
| `pending` | Nova conversa, ainda não triada pela IA | `schema.sql:126` |
| `queued` | Triada pela IA, aguardando atribuicao | `TriageService.js:67` |
| `in_progress` | Em atendimento por um atendente | `ConversationRepository.js:135` |
| `open` | Estado genérico (usado em alguns selects) | `ChatService.js:20` |
| `resolved` | Encerrada pelo atendente | `ConversationRepository.js:139` |

### 1.2 Transições

```mermaid
stateDiagram-v2
    [*] --> pending: Nova conversa criada
    pending --> queued: TriageService.triage() executado
    queued --> in_progress: Atendente assume (assignTo)
    in_progress --> resolved: Atendente encerra (resolve)
    in_progress --> queued: Devolver para fila (requeue)
    resolved --> pending: Nova mensagem do contato (reopen)
    pending --> in_progress: Atendente assume antes da triagem
    resolved --> [*]: Após 24h sem resposta (?)
```

### 1.3 Gatilhos de Transição

| De | Para | Gatilho | Código |
|----|------|---------|--------|
| pending | queued | `TriageService.triage()` atualiza department_id | `TriageService.js:65-70` |
| pending | in_progress | Atendente chama `assignTo()` antes da triagem | `ChatService.js:143-146` |
| queued | in_progress | `assignTo(conversationId, userId)` | `ConversationRepository.js:132-137` |
| in_progress | resolved | `resolve(conversationId)` | `ConversationRepository.js:139-141` |
| in_progress | queued | `requeue(conversationId)` | `ConversationRepository.js:143-148` |
| resolved | pending | Nova mensagem recebida em conversa resolvida | `ChatService.js:27-34` |

### 1.4 Estados com metadata

| Campo | Descrição |
|-------|------------|
| `department_id` | Departamento asignado (pode ser null se não triado) |
| `assigned_to` | ID do atendente que está atendiendo |
| `ai_draft` | Resposta sugerida pela IA |
| `ai_confidence` | Confiança da triagem (0.3 a 0.95) |
| `funnel_stage` | Estágio do funil de vendas |
| `priority` | Prioridade da conversa (maior = mais urgente) |
| `last_message_at` | Timestamp da última mensagem |

---

## 2. Máquina de Estado: Instância (Connection)

### 2.1 Estados Possíveis

| Estado | Descrição | Origem |
|--------|-----------|--------|
| `offline` | Instância desconectada do WhatsApp | `schema.sql:104` |
| `connecting` | Solicitada conexão, QR Code gerado e pendente | `instances.js:287` |
| `connected` | Instância conectada e ativa | `instances.js` (implicitamente) |

### 2.2 Transições

```mermaid
stateDiagram-v2
    [*] --> offline: Instância criada
    
    offline --> connecting: POST /instances/:id/connect
    connecting --> connected: WhatsApp escaneia QR Code
    connecting --> offline: QR Code expira ou cancelado
    
    connected --> offline: POST /instances/:id/disconnect
    
    offline --> [*]: Instância deletada
```

### 2.3 Gatilhos de Transição

| De | Para | Gatilho | Código |
|----|------|---------|--------|
| offline | connecting | `connectInstance()` | `instances.js:235-310` |
| connecting | connected | Webhook de status change da Evolution API | 🔴 LACUNA |
| connecting | offline | QR Code expira | `instances.js:289` (expira timestamp) |
| connected | offline | `disconnectInstance()` | `instances.js:318-351` |

### 2.4 Estados com metadata

| Campo | Descrição |
|-------|------------|
| `instance_name` | Nome único da instância |
| `instance_id` | ID na Evolution API |
| `phone_number` | Número WhatsApp |
| `qr_code` | QR Code em base64 |
| `qr_code_expires` | Timestamp de expiração |
| `api_url` | URL da Evolution API |
| `api_key` | Chave de API |

---

## 3. Máquina de Estado: Usuário

### 3.1 Estados Possíveis

| Estado | Descrição | Origem |
|--------|-----------|--------|
| `is_online` | Usuário está online no sistema | `schema.sql:57` |
| `is_active` | Usuário está ativo (não desabilitado) | `schema.sql:56` |

### 3.2 Transições

```mermaid
stateDiagram-v2
    [*] --> is_active: Usuário criado
    
    is_active --> is_active: Login no sistema (is_online = true)
    is_active --> is_active: Logout do sistema (is_online = false)
    
    is_active --> is_active: Admin desabilita usuário (is_active = false)
    is_active --> is_active: Admin reabilita usuário (is_active = true)
```

---

## 4. Máquina de Estado: Mensagem

### 4.1 Estados Possíveis

| Estado | Descrição | Origem |
|--------|-----------|--------|
| `received` | Mensagem recebida do contato | `schema.sql:145` |
| `sent` | Mensagem enviada com sucesso | `ChatService.js:170` |
| `pending` | Mensagem enviada mas ainda não confirmada | `ChatService.js:170` |
| `failed` | Falha ao enviar | `ChatService.js:170` |

### 4.2 Transições

```mermaid
stateDiagram-v2
    [*] --> received: Recebida do WhatsApp
    
    received --> sent: Webhook confirma entrega (?)
    received --> failed: Falha no processamento (?)
    
    pending --> sent: Confirmation da Evolution API
    pending --> failed: Erro da Evolution API
```

🟡 INFERIDO — Não verificado explicitamente no código, pode haver mais estados.

---

## 5. Máquina de Estado: Funil de Vendas

### 5.1 Estados Possíveis

| Estado | Descrição |
|--------|-----------|
| `unclassified` | Não classificado |
| `new` | Novo lead |
| `interested` | Interessado |
| `negotiating` | Em negociação |
| `closed` | Fechado (cliente) |

### 5.2 Transições

```mermaid
stateDiagram-v2
    unclassified --> new: Primeira mensagem do lead
    
    new --> interested: Menciona preço/valor
    new --> new: Continua sem classificação
    
    interested --> negotiating: Menciona parcelamento/desconto
    interested --> closed: Confirma compra
    
    negotiating --> closed: Confirma compra
    negotiating --> interested: Volta a negociar
    
    closed --> [*]: Encerrado
```

🟡 INFERIDO — Lógica exata de transição não verificada no FunnelClassificationService.

---

## 6. Diagrama Completo de Estados das Entidades

```mermaid
erDiagram
    conversation {
        int id PK
        int company_id FK
        int contact_id FK
        int department_id FK
        int assigned_to FK
        int connection_id FK
        text channel
        text status
        int priority
        text ai_draft
        decimal ai_confidence
        text funnel_stage
        timestamp last_message_at
        timestamp created_at
    }

    connection {
        int id PK
        int company_id FK
        int department_id FK
        text instance_name
        text instance_id
        text phone_number
        text status
        text qr_code
        timestamp qr_code_expires
        text api_url
        text api_key
        jsonb settings
        timestamp created_at
        timestamp updated_at
    }

    user {
        int id PK
        int company_id FK
        int department_id FK
        text name
        text email UK
        text password
        text role
        bool is_active
        bool is_online
        int team_leader_id FK
        timestamp created_at
        timestamp updated_at
    }

    message {
        int id PK
        int conversation_id FK
        text sender_type
        int sender_id
        text content
        text direction
        text status
        jsonb metadata
        timestamp created_at
    }

    conversation }|--|| contact : "1:N"
    conversation }|--|| department : "1:N"
    conversation }|--|| user : "1:N (assigned_to)"
    conversation }|--|| connection : "1:N"
    conversation }|--|| company : "1:N"
    message }|--|| conversation : "1:N"
    user }|--|| company : "1:N"
    user }|--|| department : "1:N"
```

---

## 7. Observações

1. **Estado default de conversation**: `status = 'open'` no schema, mas na prática os fluxos usam `pending` para novas conversas.

2. **Reabertura automática**: Quando um contato envía mensagem em conversa resolvida, o sistema automaticamente "reabre" a conversa (via `ChatService.js:27-34`).

3. **QR Code expira**: O timestamp `qr_code_expires` indica que há uma janela de tempo para escanear o QR Code.

4. **Confiança de triagem**: Baseada no número de tokens da resposta do LLM — menos tokens = resposta mais direta = maior confiança.

🟢 CONFIRMADO na maioria, 🟡 INFERIDO em algumas transições não verificadas explicitamente.