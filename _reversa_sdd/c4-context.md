# C4 — Diagrama de Contexto

## Visão Geral

```mermaid
graph TD
    subgraph "OmniChat CSM"
        SYS[OmniChannel CSM<br/>SaaS Multi-tenant]
    end

    subgraph "Usuários"
        ADMIN[Admin da Empresa]
        LEADER[Líder de Equipe]
        AGENT[Atendente]
        MASTER[Admin Master]
    end

    subgraph "Sistemas Externos"
        WHATSAPP[WhatsApp<br/>Business]
        EVOLUTION[Evolution API]
        LLM[Provedor LLM<br/>OpenAI/Anthropic]
        SUPABASE[Supabase<br/>Database & Auth]
    end

    ADMIN -->|Gerencia| SYS
    LEADER -->|Atende| SYS
    AGENT -->|Atende| SYS
    MASTER -->|Administra| SYS

    WHATSAPP -->|Mensagens| EVOLUTION
    EVOLUTION -->|Webhook| SYS
    SYS -->|Requisições| EVOLUTION
    SYS -->|Auth/DB| SUPABASE
    SYS -->|Classificação| LLM
    LLM -->|Resposta| SYS

    style SYS fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style WHATSAPP fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px
    style EVOLUTION fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px
    style LLM fill:#fff3e0,stroke:#e65100,stroke-width:1px
    style SUPABASE fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1px
```

## Descrição dos Elementos

### Usuários

| Persona | Descrição | Acesso |
|---------|-----------|--------|
| **Master** | Administrador global do sistema | Todas as empresas |
| **Admin** | Administrador de uma empresa | Sua empresa completa |
| **Leader** | Líder de equipe de atendimento | Seu departamento |
| **Agent** | Atendente que responde conversas | Suas conversas atribuídas |

### Sistemas Externos

| Sistema | Função | Protocolo |
|---------|--------|-----------|
| **WhatsApp Business** | Canal de comunicação com clientes | WhatsApp Protocol |
| **Evolution API** | API que gerencia instâncias WhatsApp | REST HTTP |
| **Supabase** | Backend-as-a-Service (DB + Auth) | REST/PostgreSQL |
| **Provedor LLM** | IA para triagem e drafts | REST API |

### Fluxos Principais

1. **Mensagem Recebida**: WhatsApp → Evolution API → Webhook → OmniChat
2. **Mensagem Enviada**: OmniChat → Evolution API → WhatsApp
3. **Triagem IA**: OmniChat → LLM → Classificação
4. **Dados/Auth**: OmniChat ↔ Supabase

---

## Diagrama Expandido com Dados

```mermaid
graph TD
    subgraph "Usuários"
        U1[Admin]
        U2[Leader]
        U3[Agent]
    end

    subgraph "OmniChat CSM"
        B[Backend<br/>Fastify]
        F[Frontend<br/>React]
        DB[(PostgreSQL)]
        WS[WebSocket]
    end

    subgraph "Externos"
        EVO[Evolution API]
        WHATSAPP[WhatsApp]
        LLM[LLM Provider]
        SUPABASE[Supabase]
    end

    U1 -->|HTTP| B
    U2 -->|HTTP| B
    U3 -->|HTTP| B
    U3 -->|WebSocket| WS

    F -->|HTTP| B
    F -->|WebSocket| WS

    B -->|Database| DB
    B -->|REST| EVO
    B -->|REST| LLM
    B -->|REST| SUPABASE

    WHATSAPP -->|Mensagens| EVO
    EVO -->|Webhook| B
```

🟢 CONFIRMADO — Baseado na análise de código