# Mensagens, Design Técnico

## Interface

### ChatService

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `processIncomingMessage` | `(payload: object)` | `{conversation, message, contact, isNewConversation, wasReopened}` | Processa mensagem recebida |
| `sendMessage` | `(conversationId, content, senderId)` | `message` | Envia mensagem de texto |
| `sendMediaMessage` | `(conversationId, mediaType, mediaUrl, caption, senderId)` | `message` | Envia mídia |
| `normalizePhone` | `(phone: string)` | `string` | Remove não-dígitos |

### MessageRepository

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `create` | `(data: object)` | `message` | Cria mensagem genérica |
| `createIncoming` | `(conversationId, content, metadata)` | `message` | Cria mensagem recebida |
| `createOutgoing` | `(conversationId, content, senderId, status)` | `message` | Cria mensagem enviada |
| `getConversationHistory` | `(conversationId, limit?)` | `messages[]` | Histórico da conversa |

### Payload do Webhook (entrada)

```javascript
{
  phone: "5511999999999",          // ou from, number
  content: "Olá, preciso de info", // ou message, text
  contact_name: "João",            // ou pushName
  media_type: "image",            // opcional
  media_url: "http...",          // opcional
  channel: "whatsapp"             // padrão
}
```

### Resultado de processIncomingMessage (saída)

```javascript
{
  conversation: { id, status, ... },
  message: { id, content, direction, ... },
  contact: { id, name, phone, ... },
  isNewConversation: true/false,
  wasReopened: true/false
}
```

## Fluxo Principal

### Fluxo 1: Mensagem Recebida

```
1. webhookController recebe POST /webhook
2. parseWebhookPayload normaliza dados
3. ChatService.processIncomingMessage(payload)
   3.1 normalizePhone(phone)
   3.2 ContactRepository.findOrCreate(companyId, name, phone)
   3.3 ConversationRepository.findByContactAndStatus (open)
       → se não existe: busca resolved → reopen ou create new
   3.4 MessageRepository.createIncoming()
   3.5 ConversationRepository.update(last_message_at)
4. Retorna {conversation, message, contact, isNew, wasReopened}
```

### Fluxo 2: Envio de Mensagem

```
1. Controller chama ChatService.sendMessage(conversationId, content, senderId)
2. ConversationRepository.findById(conversationId)
3. ContactRepository.findById(contact_id)
4. EvolutionProvider.sendText(contact.phone, content)
5. MessageRepository.createOutgoing(conversationId, content, senderId, status)
6. ConversationRepository.update(last_message_at)
```

### Fluxo 3: Envio de Mídia

```
1. Controller chama sendMediaMessage(conversationId, mediaType, mediaUrl, caption, senderId)
2. EvolutionProvider.sendMedia(phone, url, caption)
3. MessageRepository.create com metadata (media_type, media_url, caption)
```

## Fluxos Alternativos

- **Conversa resolvida**: Se Contact tem conversa resolved, reopen automatic (status = pending)
- **Conversa pendente**: Se não existe open nem resolved, cria nova com status = pending
- **Falha Evolution**: Se provider não disponível, registra message com status = pending (simulação)
- **Múltiplas mensagens same contact**: Uma única conversa (open ou resolved)

## Dependências

- `ContactRepository` — Busca/cria contato
- `ConversationRepository` — Busca/cria conversa
- `MessageRepository` — Persiste mensagem
- `EvolutionProvider` — Envia para WhatsApp

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Normalização always | `phone.replace(/\D/g, '')` | 🟢 |
| Reabertura automática | `ChatService.js:27-34` | 🟢 |
| Async AI após process | `webhookController.js:117` | 🟢 |
| Simulação se sem Evolution | `ChatService.js:157` | 🟢 |

## Estado Interno

O ChatService mantém referências a todos os repositories via injeção no construtor:

```javascript
constructor({ contactRepository, conversationRepository, messageRepository, departmentRepository, evolutionProvider }) {
  this.contactRepository = contactRepository;
  this.conversationRepository = conversationRepository;
  this.messageRepository = messageRepository;
  this.departmentRepository = departmentRepository;
  this.evolutionProvider = evolutionProvider;
}
```

## Observabilidade

- Logs de erro em falhas de Evolution API: `ChatService.js:162`
- Console.log do payload recebido no webhook: `webhookController.js:91-94`

## Riscos e Lacunas

- 🔴 Retry em falha de envio (não implementado)
- 🔴 Status read/delivery do WhatsApp não rastreado
- 🔴 Rate limiting ausente
- 🟡 Simulação quando Evolution não disponível