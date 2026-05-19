# C4 — Diagrama de Componentes

## Backend — Componentes Principais

```mermaid
graph TD
    subgraph "Backend API"
        SERVER[Fastify Server]
        
        subgraph "Web Controllers"
            WC1[authController]
            WC2[messageController]
            WC3[contactController]
            WC4[dashboardController]
            WC5[aiController]
            WC6[webhookController]
        end
        
        subgraph "Business Services"
            BS1[AuthService]
            BS2[ChatService]
            BS3[TriageService]
            BS4[AIDraftService]
            BS5[FunnelClassificationService]
        end
        
        subgraph "Job Queue"
            JQ1[JobQueue]
            JQ2[AIProcessingService]
        end
        
        subgraph "Repositories"
            R1[UserRepository]
            R2[ContactRepository]
            R3[ConversationRepository]
            R4[MessageRepository]
            R5[DepartmentRepository]
            R6[BaseRepository]
        end
        
        subgraph "Providers"
            P1[EvolutionProvider]
            P2[LLMProvider]
        end
        
        subgraph "Database"
            DB[(Supabase<br/>PostgreSQL)]
        end
    end

    SERVER --> WC1
    SERVER --> WC2
    SERVER --> WC3
    SERVER --> WC4
    SERVER --> WC5
    SERVER --> WC6

    WC1 --> BS1
    WC2 --> BS2
    WC3 --> BS2
    WC4 --> BS2
    WC5 --> BS3
    WC5 --> BS4
    WC6 --> BS2
    WC6 --> JQ2

    BS1 --> R1
    BS2 --> R2
    BS2 --> R3
    BS2 --> R4
    BS2 --> P1
    BS3 --> R3
    BS3 --> R4
    BS3 --> R5
    BS3 --> P2
    BS3 --> BS5
    BS4 --> R3
    BS4 --> R4
    BS4 --> R5
    BS4 --> P2
    BS5 --> R3

    R1 --> R6
    R2 --> R6
    R3 --> R6
    R4 --> R6
    R5 --> R6

    R6 --> DB
    P1 --> DB
    P2 --> DB

    style SERVER fill:#e3f2fd,stroke:#1565c0
    style DB fill:#e8f5e9,stroke:#2e7d32
    style BS2 fill:#fff3e0,stroke:#e65100
    style JQ2 fill:#fce4ec,stroke:#c2185b
```

## ChatService — Componente Central

```mermaid
graph TD
    subgraph "ChatService"
        CS[ChatService]
        
        sub1[processIncomingMessage]
        sub2[sendMessage]
        sub3[sendMediaMessage]
        sub4[assignConversation]
        sub5[resolveConversation]
        sub6[reopenConversation]
        sub7[setAIDraft]
    end
    
    CR[ContactRepository]
    CXR[ConversationRepository]
    MR[MessageRepository]
    EP[EvolutionProvider]

    CS --> sub1
    CS --> sub2
    CS --> sub3
    CS --> sub4
    CS --> sub5
    CS --> sub6
    CS --> sub7

    sub1 --> CR
    sub1 --> CXR
    sub1 --> MR
    
    sub2 --> CXR
    sub2 --> CR
    sub2 --> EP
    sub2 --> MR
    
    sub3 --> CXR
    sub3 --> CR
    sub3 --> EP
    sub3 --> MR
    
    sub4 --> CXR
    sub5 --> CXR
    sub6 --> CXR
    sub7 --> CXR
```

## AI Processing Service

```mermaid
graph TD
    subgraph "AIProcessingService"
        AIPS[AIProcessingService]
        
        jq[JobQueue]
        enq[enqueueTriage<br/>enqueueDraft]
        proc[processAll]
    end
    
    TS[TriageService]
    ADS[AIDraftService]
    CR[ConversationRepository]

    AIPS --> jq
    AIPS --> enq
    AIPS --> proc
    
    proc --> TS
    proc --> ADS
    
    TS --> CR
    ADS --> CR
```

## Repositories — Padrão Repository

```mermaid
graph TD
    subgraph "SupabaseBaseRepository"
        BR[BaseRepository<br/>find, insert, update, delete]
    end
    
    subgraph "Repositories"
        UR[UserRepository]
        CR[ContactRepository]
        CXR[ConversationRepository]
        MR[MessageRepository]
        DR[DepartmentRepository]
    end
    
    SUPABASE[(Supabase<br/>PostgreSQL)]

    UR --> BR
    CR --> BR
    CXR --> BR
    MR --> BR
    DR --> BR
    
    BR --> SUPABASE
```

---

## Responsabilidades por Componente

| Componente | Responsabilidade |
|------------|-----------------|
| **AuthService** | Hash de senhas, geração e verificação de JWT |
| **ChatService** | Processamento de mensagens, criação de conversas, envio |
| **TriageService** | Classificação de mensagens para departamentos via LLM |
| **AIDraftService** | Geração de respostas sugeridas |
| **FunnelClassificationService** | Classificação de lead no funil de vendas |
| **JobQueue** | Fila de jobs para processamento assíncrono |
| **EvolutionProvider** | Abstração de chamadas para Evolution API |
| **LLMProvider** | Abstração de chamadas para provedores de IA |

🟢 CONFIRMADO — Baseado na análise de código