# Fluxo: Auth — omni-channel

## 1. Fluxo de Login

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant Database

    Client->>AuthController: POST /auth/login {email, password}
    AuthController->>Database: find user by email
    Database-->>AuthController: user record

    alt Usuário não encontrado
        AuthController-->>Client: 401 Unauthorized
    else Usuário encontrado
        AuthController->>AuthService: comparePassword(password, hash)
        
        alt Senha incorreta
            AuthController-->>Client: 401 Unauthorized
        else Senha correta
            AuthController->>AuthService: generateToken(user)
            AuthService-->>AuthController: JWT token
            AuthController-->>Client: 200 OK {token, user}
        end
    end
```

## 2. Fluxo de Geração de Token

```mermaid
sequenceDiagram
    participant AuthService
    participant Crypto

    note over AuthService: JWT Secret: process.env.JWT_SECRET<br/>ou 'omnichat-secret-change-in-production'

    AuthService->>AuthService: criar payload {id, email, company_id, role}
    AuthService->>Crypto: createHmac('sha256', secret)
    Crypto-->>AuthService: header e body base64url
    AuthService->>Crypto: sign(header + "." + body)
    Crypto-->>AuthService: signature base64url
    AuthService-->>AuthService: return "header.body.signature"
```

## 3. Fluxo de Verificação de Token

```mermaid
flowchart TD
    A[Token recebido] --> B{Split por "."}
    B -->|3 partes| C[header, body, signature]
    B -->|não 3 partes| D[Retorna null]

    C --> E[Recalcular signature]
    E --> F{signature === expected?}
    F -->|não| D
    F -->|sim| G[Parse body base64]
    G --> H[Retorna payload]
```

## 4. Hierarquia de Permissões (RBAC)

```mermaid
flowchart TB
    subgraph Master
        M[Admin Global<br/>role: master]
    end

    subgraph Admin
        A[Admin Empresa<br/>role: admin]
    end

    subgraph Leader
        L[Líder Equipe<br/>role: leader]
    end

    subgraph Agent
        AG[Atendente<br/>role: agent]
    end

    M --> A
    A --> L
    L --> AG

    note over M: Acesso total a todas<br/>empresas e funcionalidades

    note over A: Acesso total à<br/>sua empresa

    note over L: Acesso à sua<br/>equipe

    note over AG: Apenas suas<br/>conversas atribuídas
```

## 5. Estrutura de Dados do Usuário

```mermaid
erDiagram
    companies ||--o{ users : has
    departments ||--o{ users : belongs
    users ||--o{ users : "team_leader"

    companies {
        int id PK
        text name
        text plan
    }

    departments {
        int id PK
        int company_id FK
        text name
        bool is_active
    }

    users {
        int id PK
        int company_id FK
        int department_id FK
        text name
        text email UK
        text password
        text role
        bool is_online
        int team_leader_id FK
    }
```