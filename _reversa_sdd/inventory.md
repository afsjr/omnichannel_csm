# Inventário do Projeto — omni-channel

## Estrutura de Pastas

```
omnichannel_csm/
├── api/                          # API Routes legacy (Fastify/Express)
│   ├── auth/                     # Autenticação e usuários
│   ├── login.js, register.js     # Entry points legados
│   ├── users.js, instances.js   # Recursos
│   ├── webhook-handler.js        # Webhooks
│   ├── queue.js                  # Filas
│   └── send-message.js           # Envio de mensagens
│
├── backend/                      # Backend principal (Fastify)
│   ├── src/
│   │   ├── app.js               # Entry point principal
│   │   ├── routes/               # Rotas
│   │   ├── controllers/         # Controllers (auth, message, contact, ai, dashboard, webhook)
│   │   ├── services/            # Services (Auth, Chat, AI, Triage, Funnel, AIDraft, Evolution)
│   │   ├── repositories/        # Repositories (Base, User, Contact, Message, Conversation, Department)
│   │   ├── providers/           # Providers (Evolution, LLM)
│   │   ├── database/            # Database (Database, SupabaseDatabase)
│   │   └── websocket/           # WebSocket
│   ├── scripts/                 # Scripts (seed)
│   └── package.json
│
├── frontend/                     # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.jsx              # App principal
│   │   ├── main.jsx            # Entry point
│   │   ├── pages/              # Páginas (Dashboard)
│   │   ├── components/          # Componentes (ChatWindow, Login, etc)
│   │   ├── contexts/            # Contexts (Auth, Chat)
│   │   ├── services/           # Services (api, socket)
│   │   └── hooks/              # Hooks (useSocket)
│   └── package.json
│
├── lib/                          # Utilitários legados
│   ├── auth.js, auth-supabase.js
│   ├── permissions.js
│   ├── messages.js, evolution.js
│   ├── security.js, db.js
│
├── docs/                         # Documentação
│   └── bmad/                     # Business Model / Architecture Doc
│
└── docker-compose.yml            # Orquestração Docker
```

## Tecnologias Identificadas

### Backend
- **Runtime:** Node.js 20.x
- **Framework:** Fastify 4.28.1
- **Banco:** PostgreSQL (via pg) + Supabase
- **WebSocket:** Socket.IO 4.8.1, ws 8.20.1
- **Auth:** bcrypt 5.1.1
- **Outros:** @fastify/cors, @supabase/ssr, dotenv

### Frontend
- **Framework:** React 18.3.1
- **Build:** Vite 6.0.6
- **Router:** react-router-dom 6.28.0
- **State:** Zustand 5.0.2
- **WebSocket:** socket.io-client 4.8.1

### API Routes (legacy)
- **Runtime:** Node.js (não especificado explicitamente)
- **Auth:** JWT (jsonwebtoken 9.0.2)
- **Supabase:** @supabase/supabase-js 2.106.0

## Pontos de Entrada

| Componente | Arquivo | Porta |
|------------|---------|-------|
| Backend | `backend/src/app.js` | 3001 (provável) |
| Frontend | `frontend/src/main.jsx` | 5173 (Vite dev) |
| API legacy | `api/*.js` | ? |

## Banco de Dados

- **Sistema:** PostgreSQL
- **Schema:** `backend/src/db/schema.sql`
- **Características:** Multi-tenant (companies), Multi-instância WhatsApp, Departments, RBAC

## Módulos Identificados

1. **Auth** — Autenticação e autorização (JWT, bcrypt, roles)
2. **Messages** — Mensagens WhatsApp via Evolution API
3. **Contacts** — Gestão de contatos/clientes
4. **Conversations** — Gestão de conversas e atribuuição
5. **AI** — IA para triagem, classificação funil, drafts
6. **Dashboard** — Métricas e analytics
7. **WebSocket** — Tempo real (chat, notifications)
8. **Webhooks** — Integração Evolution API

## Testes

- Sem arquivos de teste identificados (*.test.*, *.spec.*)