# Fluxo: Messages — omni-channel

## 1. Fluxo de Mensagem Recebida (Webhook)

```mermaid
sequenceDiagram
    participant Evolution as Evolution API
    participant Webhook as webhookController
    participant ChatService
    participant ContactRepo
    participant ConvRepo
    participant MsgRepo
    participant AI as AIProcessingService
    participant Socket as WebSocket

    Evolution->>Webhook: POST /webhook {event, data}
    Webhook->>Webhook: parseWebhookPayload(payload)
    
    note over Webhook: Normaliza phone<br/>Extrai content<br/>Detecta media type
    
    Webhook->>ChatService: processIncomingMessage(payload)
    
    ChatService->>ChatService: normalizePhone(phone)
    ChatService->>ContactRepo: findOrCreate(companyId, name, phone)
    
    alt Contato existe
        ContactRepo-->>ChatService: contact
    else Contato novo
        ContactRepo-->>ChatService: new contact
    end
    
    ChatService->>ConvRepo: findByContactAndStatus(companyId, contact, channel, 'open')
    
    alt Conversa aberta existe
        ConvRepo-->>ChatService: conversation
    else Busca resolvida
        ChatService->>ConvRepo: findByContactAndStatus(status='resolved')
        
        alt Existe resolvida
            ConvRepo-->>ChatService: resolved conversation
            ChatService->>ConvRepo: reopen(conversation.id)
            note over ChatService: wasResolved = true
        else Não existe
            ChatService->>ConvRepo: create({companyId, contactId, channel, status: 'pending'})
            ChatService-->>ChatService: new conversation
        end
    end
    
    ChatService->>MsgRepo: createIncoming(conversationId, content, metadata)
    ChatService->>ConvRepo: update(conversationId, {updateLastMessage: true})
    
    ChatService-->>Webhook: {conversation, message, contact, isNew, wasReopened}
    
    par Processamento IA
        Webhook->>AI: processAll()
        AI->>ConvRepo: triage(conversationId)
        AI->>ConvRepo: generateDraft(conversationId)
        
        AI->>Socket: emit('ai_processing_complete')
    end
    
    Webhook-->>Evolution: 200 OK
```

## 2. Fluxo de Envio de Mensagem

```mermaid
sequenceDiagram
    participant Client
    participant MessageController
    participant ChatService
    participant ConvRepo
    participant ContactRepo
    participant Evolution as EvolutionProvider
    participant MsgRepo

    Client->>MessageController: POST /messages {conversationId, content}
    MessageController->>ChatService: sendMessage(conversationId, content, senderId)
    
    ChatService->>ConvRepo: findById(conversationId)
    alt Conversa não encontrada
        ChatService-->>MessageController: Error "Conversa não encontrada"
    end
    
    ChatService->>ContactRepo: findById(conversation.contact_id)
    ContactRepo-->>ChatService: contact
    
    alt Contact has phone AND EvolutionProvider existe
        ChatService->>Evolution: sendText(contact.phone, content)
        Evolution-->>ChatService: evolutionResult
    else Simulação
        note over ChatService: evolutionResult = {simulated: true}
    end
    
    ChatService->>MsgRepo: createOutgoing(conversationId, content, senderId, status)
    ChatService->>ConvRepo: update(conversationId, {updateLastMessage: true})
    
    ChatService-->>MessageController: message
    MessageController-->>Client: 200 OK {message}
```

## 3. Estados da Conversa

```mermaid
stateDiagram-v2
    [*] --> pending: Nova conversa criada
    pending --> queued: AI classifica departamento
    queued --> in_progress: Atendente assume
    in_progress --> resolved: Atendente encerra
    in_progress --> queued: Devolver para fila
    resolved --> pending: Cliente envia nova mensagem
    resolved --> [*]: Após 24h sem resposta
    pending --> in_progress: Atendente assume antes da triagem
```

## 4. Normalização de Telefone

```mermaid
flowchart TD
    A["+55 (11) 99999-9999"] --> B[replace /\D/g, '']
    B --> C["5511999999999"]
    
    D["5511999999999@s.whatsapp.net"] --> E[replace '@s.whatsapp.net', '']
    E --> C
    
    F["5511999999999@g.us"] --> G[replace '@g.us', '']
    G --> C
    
    C --> H[Normalizado para DB]
```

## 5. Tipos de Mídia Suportados

```mermaid
flowchart LR
    subgraph Entrada
        W[Webhook Payload]
    end
    
    subgraph Parsing
        P[parseWebhookPayload]
    end
    
    subgraph Tipos
        T[extendedTextMessage]
        C[conversation]
        I[imageMessage]
        V[videoMessage]
        Au[audioMessage]
        D[documentMessage]
        S[stickerMessage]
    end
    
    W --> P
    P --> T
    P --> C
    P --> I
    P --> V
    P --> Au
    P --> D
    P --> S
    
    T --> Texto
    C --> Texto
    I --> Imagem
    V --> Vídeo
    Au --> Áudio
    D --> Documento
    S --> Sticker
```