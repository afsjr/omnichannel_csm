# Mensagens

> Módulo de processamento e envio de mensagens do OmniChat CSM.

## Visão Geral

Responsável por processar mensagens recebidas do WhatsApp via webhook, enviar mensagens aos contatos, e gerenciar diferentes tipos de mídia. Integra com Evolution API para comunicação com WhatsApp.

## Responsabilidades

- Processamento de mensagens recebidas (webhook)
- Envio de mensagens de texto
- Envio de mensagens de mídia (imagem, vídeo, áudio, documento)
- Normalização de números de telefone
- Persistência de mensagens no banco
- Notificação em tempo real via WebSocket

## Regras de Negócio

- RN-M01: Telefone normalizado = apenas dígitos (remove máscara) 🟢
- RN-M02: Contato criado automaticamente se não existir 🟢
- RN-M03: Conversa criada se não existir (ou reaberta se resolvida) 🟢
- RN-M04: Última mensagem atualiza last_message_at da conversa 🟢
- RN-M05: Mensagem direcionada: incoming (contato) ou outgoing (atendente) 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-M01 | Processar mensagem recebida via webhook | Must | Mensagem persiste e conversa atualiza |
| RF-M02 | Normalizar telefone | Must | phone.replace(/\D/g, '') retorna apenas dígitos |
| RF-M03 | Buscar ou criar contato | Must | findOrCreate retorna contato existente ou novo |
| RF-M04 | Buscar ou criar conversa | Must |findOrCreate retorna conversa aberta ou cria nova |
| RF-M05 | Enviar mensagem de texto | Must | Evolution API recebe requisição |
| RF-M06 | Enviar mensagem de mídia | Must | sendMedia com url e caption |
| RF-M07 | Criar registro de mensagem enviada | Must | Persiste direction='outgoing' |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Latência | Processamento de webhook síncrono | `ChatService.processIncomingMessage` | 🟡 |
| IA Async | Após processar, dispara AI em background | `webhookController.js:117-136` | 🟢 |
| Normalização | Telefone sempre normalizado para salvar | `ContactRepository.js:113` | 🟢 |

## Critérios de Aceitação

```gherkin
Dado webhook com mensagem de texto
Quando processIncomingMessage executa
Then contato criado/atualizado, conversa atualizada, mensagem persistida

Dado telefone com máscara "+55 (11) 99999-9999"
Quando normalizePhone executa
Then retorna "5511999999999"

Dado conversa resolvida com nova mensagem
Quando processIncomingMessage executa
Then conversa status = "pending" (reaberta)

Dado requerimento de envio de mensagem
Quando sendMessage executa
Then Evolution API chamada, mensagem persistida
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Processamento incoming | Must | Caminho crítico de mensagens |
| Normalização telefone | Must | Sem isso dados inconsistentes |
| Criação contato/conversa | Must | Sem isso não há conversa |
| Envio de mensagens | Must | Funcionalidade principal |
| Mídia | Should | Importante mas texto é suficiente |
| IA background | Should | Não bloqueia mensagem |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `backend/src/services/ChatService.js` | `processIncomingMessage`, `sendMessage`, `sendMediaMessage` | 🟢 |
| `backend/src/repositories/MessageRepository.js` | `create`, `createIncoming`, `createOutgoing` | 🟢 |
| `backend/src/repositories/ContactRepository.js` | `findOrCreate` | 🟢 |
| `backend/src/repositories/ConversationRepository.js` | `findByContactAndStatus`, `create`, `update` | 🟢 |

---

## Lacunas Identificadas

| Item | Confiança | Descrição |
|------|-----------|------------|
| 🔴 | Retry em falha de envio | Não implementado explicitamente |
| 🔴 | Status de entrega (read/delivered) | Não há tracking de status WhatsApp |
| 🟡 | Rate limiting | Não implementado |