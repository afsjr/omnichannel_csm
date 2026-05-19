# C4 — Diagrama de Containers

## Visão de Containers

```mermaid
graph TD
    subgraph "Frontend - React"
        REACT[App.jsx<br/>SPA]
        ROUTER[React Router]
        ZUSTAND[Zustand<br/>State]
        SOCKET[Socket.IO Client]
        API[API Service]
    end

    subgraph "Backend - Node.js/Fastify"
        FASTIFY[Fastify Server<br/>:3001]
        
        subgraph "Controllers"
            AUTH_CTL[authController]
            MSG_CTL[messageController]
            DASH_CTL[dashboardController]
            WEBHOOK_CTL[webhookController]
        end
        
        subgraph "Services"
            AUTH_SVC[AuthService]
            CHAT_SVC[ChatService]
            AI_SVC[AIService]
            TRIAGE[TriageService]
            DRAFT[AIDraftService]
        end
        
        subgraph "Repositories"
            USER_REP[UserRepository]
            CONV_REP[ConversationRepository]
            MSG_REP[MessageRepository]
            CONTACT_REP[ContactRepository]
            DEPT_REP[DepartmentRepository]
        end
        
        subgraph "Providers"
            EVO_PROV[EvolutionProvider]
            LLM_PROV[LLMProvider]
        end
        
        WS[WebSocket<br/>Socket.IO]
    end

    subgraph "Database"
        PG[(PostgreSQL<br/>Supabase)]
    end

    subgraph "External"
        WHATSAPP[WhatsApp]
        EVOLUTION[Evolution API]
        LLM[LLM Provider]
    end

    REACT -->|HTTP/REST| FASTIFY
    REACT -->|WebSocket| WS
    REACT -->|HTTP| API

    FASTIFY --> AUTH_CTL
    FASTIFY --> MSG_CTL
    FASTIFY --> DASH_CTL
    FASTIFY --> WEBHOOK_CTL
    FASTIFY --> WS

    AUTH_CTL --> AUTH_SVC
    MSG_CTL --> CHAT_SVC
    DASH_CTL --> CHAT_SVC
    WEBHOOK_CTL --> CHAT_SVC
    WEBHOOK_CTL --> AI_SVC

    CHAT_SVC --> USER_REP
    CHAT_SVC --> CONV_REP
    CHAT_SVC --> MSG_REP
    CHAT_SVC --> CONTACT_REP
    CHAT_SVC --> EVO_PROV

    AI_SVC --> TRIAGE
    AI_SVC --> DRAFT
    AI_SVC --> LLM_PROV
    TRIAGE --> CONV_REP
    TRIAGE --> MSG_REP

    USER_REP --> PG
    CONV_REP --> PG
    MSG_REP --> PG
    CONTACT_REP --> PG
    DEPT_REP --> PG

    EVO_PROV -->|REST| EVOLUTION
    LLM_PROV -->|REST| LLM
    EVOLUTION -->|Webhook| WEBHOOK_CTL
    WHATSAPP -->|Mensagens| EVOLUTION

    style FASTIFY fill:#e3f2fd,stroke:#1565c0
    style PG fill:#e8f5e9,stroke:#2e7d32
    style WHATSAPP fill:#fff3e0,stroke:#e65100
    style EVOLUTION fill:#fff3e0,stroke:#e65100
    style LLM fill:#fce4ec,stroke:#c2185b
```

## Tecnologias por Container

| Container | Tecnologia | Porta | Responsabilidade |
|-----------|-----------|-------|-----------------|
| **Frontend** | React 18 + Vite | 5173 | UI do sistema |
| **Backend API** | Fastify 4.28 | 3001 | API REST |
| **WebSocket** | Socket.IO 4.8 | 3001 | Tempo real |
| **Database** | PostgreSQL + Supabase | - | Dados persistentes |
| **Evolution API** | Evolution API | externa | WhatsApp |
| **LLM Provider** | LLM (genérico) | externa | IA |

## Comunicação entre Containers

| De | Para | Protocolo | Descrição |
|----|------|-----------|-----------|
| Frontend | Backend | HTTP/REST | Operações CRUD |
| Frontend | WebSocket | WS | Tempo real |
| Backend | Database | PostgreSQL | Queries |
| Backend | Evolution | HTTP/REST | Enviar mensagens |
| Backend | LLM | HTTP/REST | Classificação |
| Evolution | Backend | Webhook | Mensagens recebidas |

🟢 CONFIRMADO — Baseado na análise de código