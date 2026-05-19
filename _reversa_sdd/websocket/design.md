# Design — Módulo WebSocket

## Arquitetura

```
Fastify Server
      │
      └── Socket.IO Server
            │
            └── Rooms:
                  ├── department:X
                  ├── user:X
                  └── conversation:X
```

## Inicialização

`initWebSocket(fastify, container)`:
1. Cria Server Socket.IO com fastify.server
2. Configura CORS origin '*'
3. Registra listeners de conexão
4. Decora fastify com 'io'
5. Retorna instância io

## Rooms

| Room | Join Event | Leave Event |
|------|------------|-------------|
| department | `join:department` | `leave:department` |
| user | `join:user` | — |
| conversation | `join:conversation` | `leave:conversation` |

## Decoração

Após init, `fastify.io` disponível em todos os requests.

---

🟢 CONFIRMADO