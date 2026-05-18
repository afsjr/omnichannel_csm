# OmniChat CSM

Sistema omnichannel de atendimento ao cliente com IA para escola técnica de enfermagem.

## 🚀 Produção

**Frontend:** https://omnichannel-csm.vercel.app

### APIs Disponíveis
| Endpoint | Descrição |
|----------|------------|
| `/api/login` | Login |
| `/api/register` | Registro |
| `/api/queue` | Fila de atendimentos |
| `/api/db-test` | Teste banco |

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     Evolution API                           │
│                  (WhatsApp Gateway)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ Webhook
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                    Backend (Fastify)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐  │
│  │ Controllers │  │  Services   │  │   Repositories     │  │
│  │  - Webhook   │  │  - Chat     │  │   - Conversation   │  │
│  │  - Message   │  │  - Triage   │  │   - Message        │  │
│  │  - AI        │  │  - AIDraft   │  │   - Contact        │  │
│  │  - Auth      │  │  - Auth      │  │   - Department     │  │
│  └─────────────┘  └─────────────┘  │   - User            │  │
│                                      └────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┤
│  │                      Providers                            │
│  │  - LLMProvider (Groq/OpenAI)                             │
│  │  - EvolutionProvider                                     │
│  └──────────────────────────────────────────────────────────┘
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API + Socket.io
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                  Frontend (React + Vite)                     │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │   Kanban     │  │  Chat Window  │  │  Metrics Panel  │  │
│  │  - Fila      │  │  - Messages   │  │  - Estatísticas │  │
│  │  - Meus Atend │  │  - AI Draft   │  │  - Gráficos     │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Stack

- **Backend**: Node.js + Fastify + PostgreSQL + Socket.io
- **Frontend**: React 18 + Vite + Zustand + Socket.io Client
- **Database**: PostgreSQL 16
- **IA**: Groq (Llama) ou OpenAI
- **WhatsApp**: Evolution API

## Começando

### 1. Configurar variáveis de ambiente

```bash
cp backend/.env.example backend/.env
# Edite backend/.env com suas configurações
```

### 2. Docker Compose (Recomendado)

```bash
docker-compose up -d
```

O sistema estará disponível em:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- PostgreSQL: localhost:5432

### 3. Sem Docker

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

## Configuração

### Variáveis de Ambiente (Backend)

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=omnichat

# LLM (Groq recomendado por ser gratuito e rápido)
LLM_PROVIDER=groq
LLM_API_KEY=sua_chave_groq
LLM_MODEL=llama-3.3-70b-versatile

# Evolution API
EVOLUTION_API_URL=https://sua-api.evolution.com
EVOLUTION_API_KEY=sua_chave
EVOLUTION_INSTANCE=omnichat

# JWT
JWT_SECRET=sua_chave_secreta
```

### Evolution API Setup

1. Instale a Evolution API
2. Crie uma instância
3. Configure o webhook para apontar para `https://seu-dominio/api/webhook`
4. Adicione as credenciais no `.env`

### Groq Setup (Gratuito)

1. Acesse https://console.groq.com
2. Crie uma API key
3. Adicione no `.env`

## Fluxo de Atendimento

```
1. Cliente envia mensagem via WhatsApp
2. Webhook recebe → salva mensagem → retorna HTTP 200 OK
3. Job de IA enfileirado (assíncrono)
4. TriageService classifica setor (Comercial/Financeiro/Secretaria/Acadêmico)
5. AIDraftService gera sugestão de resposta
6. Frontend recebe via Socket.io
7. Atendente revisa rascunho → aprova ou edita
8. Mensagem enviada via Evolution API
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `GET /api/auth/me` - Usuário atual

### Mensagens
- `POST /api/messages/send` - Enviar mensagem
- `GET /api/messages/conversation/:id` - Buscar conversa
- `GET /api/messages/queue` - Fila de atendimento
- `GET /api/messages/my-conversations` - Minhas conversas
- `POST /api/messages/assign` - Atribuir conversa
- `POST /api/messages/resolve` - Encerrar conversa

### IA
- `POST /api/ai/triage` - Forçar triagem
- `POST /api/ai/draft` - Gerar rascunho
- `GET /api/ai/jobs` - Jobs pendentes

### Dashboard
- `GET /api/dashboard/stats` - Estatísticas
- `GET /api/dashboard/activity` - Atividade recente

## Estrutura de Diretórios

```
backend/
├── src/
│   ├── app.js                 # Entry point
│   ├── dependencyInjection.js  # DI container
│   ├── database/
│   │   └── Database.js        # PostgreSQL pool
│   ├── repositories/          # Data access
│   ├── services/              # Business logic
│   ├── providers/             # External APIs
│   ├── controllers/           # HTTP handlers
│   └── routes/index.js
│
frontend/
├── src/
│   ├── App.jsx
│   ├── contexts/              # Zustand stores
│   ├── components/            # React components
│   ├── services/              # API client
│   └── hooks/
```

## Próximos Passos

1. [ ] Autenticação JWT com refresh tokens
2. [ ] Fila robusta (Redis/BullMQ)
3. [ ] Histórico de conversas
4. [ ] Multilingual (PT/EN)
5. [ ] Caching (Redis)
6. [ ] Deploy (Vercel/Railway)

## Licença

MIT