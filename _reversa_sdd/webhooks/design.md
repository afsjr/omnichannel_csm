# Design — Módulo Webhooks

## Fluxo

```
Evolution API ──► POST /webhook/evolution
                        │
                        ▼
              parseWebhookPayload()
              (extrai content, phone, media)
                        │
                        ▼
              ChatService.processIncomingMessage()
                        │
                        ▼
              { conversation, message, isNewConversation }
                        │
                        ▼
              AIProcessingService.processAll()
                        │
                        ▼
              WebSocket emit ai_processing_complete
```

## parseWebhookPayload()

Normaliza payload de múltiplos formatos:
1. Handles payload.data + payload.message
2. Handles payload.messages[0]
3. Extrai phone de key.remoteJid
4. Extrai contact_name de pushName
5. Parseia message conforme tipo (conversation, imageMessage, etc)

## Endpoint

`POST /webhook/evolution` — Recebe payloads da Evolution API.

---

🟢 CONFIRMADO