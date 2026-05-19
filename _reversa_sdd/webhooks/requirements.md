# Webhooks

> Módulo de recebimento de mensagens via Evolution API.

## Visão Geral

Responsável por receber webhooks da Evolution API (WhatsApp), parsear diferentes tipos de mensagem (texto, imagem, vídeo, áudio, documento, sticker), e acionar o ChatService para processar a mensagem recebida.

## Responsabilidades

- Receber webhook da Evolution API
- Parsear payload de多种 formatos de mensagem
- Extrair phone, content, media_type, contact_name
- Chamar ChatService.processIncomingMessage()
- Processamento assíncrono de IA após receber mensagem

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-WH01 | Receber POST /webhook/evolution | Must | Endpoint responde |
| RF-WH02 | Parsear mensagem texto | Must | content extraído |
| RF-WH03 | Parsear imagem/vídeo/áudio/doc | Must | media_type + url |
| RF-WH04 | Parsear sticker | Must | treated as image |
| RF-WH05 | Extrair phone number | Must | remoteJid parsed |
| RF-WH06 | Extrair contact_name | Must | pushName parsed |
| RF-WH07 | Acionar ChatService | Must | processIncomingMessage() |
| RF-WH08 | Processamento async IA | Should | processAll() after |

## Tipos de Mensagem Suportados

- texto (conversation, extendedTextMessage)
- imagem (imageMessage)
- vídeo (videoMessage)
- áudio (audioMessage)
- documento (documentMessage)
- sticker (stickerMessage)
- ephemeral (recursive parse)

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|------|-----------|-----------|-----------|
| Performance | setImmediate para async | `webhookController.js:117` | 🟢 |
| Confiabilidade | Try-catch em AI processing | `webhookController.js:118-135` | 🟢 |

---

## Lacunas

| Item | Confiança | Descrição |
|------|-----------|------------|
| 🔴 | Sem autenticação do webhook | Qualquer um pode chamar |
| 🔴 | Sem validação de signature | Não verifica Evolution API |