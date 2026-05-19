# WebSocket

> Módulo de comunicação em tempo real do OmniChat CSM.

## Visão Geral

Responsável por manter conexões WebSocket persistentes usando Socket.IO, permitir participação em rooms por departamento, usuário ou conversa, e emitir eventos em tempo real para atualização de interface.

## Responsabilidades

- Inicialização de servidor Socket.IO com Fastify
- Gerenciamento de rooms (departamento, usuário, conversa)
- Emissão de eventos para clientes conectados
- Suporte a CORS

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-WS01 | Inicializar Socket.IO com Fastify | Must | io disponível em req.server.io |
| RF-WS02 | Join room department | Must | socket.join(`department:${id}`) |
| RF-WS03 | Join room user | Must | socket.join(`user:${id}`) |
| RF-WS04 | Join room conversation | Must | socket.join(`conversation:${id}`) |
| RF-WS05 | Leave rooms | Must | socket.leave() funciona |
| RF-WS06 | Evento connected | Must | Retorna socketId ao conectar |

## Eventos Emitidos

| Evento | Origem | Payload |
|--------|--------|---------|
| `connected` | auto | `{ ok, socketId }` |
| `ai_complete` | aiController.js | `{ conversationId, department, ... }` |
| `draft_updated` | aiController.js | `{ conversationId, draft, ... }` |
| `new_message` | ChatService? | `{ conversationId, message }` |

## Requisitos Não Funcionais

| Tipo | Requisito | Evidência | Confiança |
|------|-----------|-----------|-----------|
| Performance | Socket.IO com fastify.server | `index.js:3` | 🟢 |
| Segurança | CORS origin '*' | `index.js:4` | 🔴 |

---

🟢 CONFIRMADO — Extraído do código fonte