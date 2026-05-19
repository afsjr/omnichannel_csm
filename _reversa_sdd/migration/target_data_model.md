---
schemaVersion: 1
generatedAt: "2026-05-19T17:32:00Z"
reversa:
  version: "1.2.43"
kind: target_data_model
producedBy: designer
hash: "sha256:0"
---

# Target Data Model

> Modelo de dados do sistema novo. Mantém o schema.sql atual com adição da tabela `sessions`.

## Visão geral

Banco PostgreSQL 16 (Supabase). Schema único (`public`). Todas as tabelas compartilham o mesmo banco (monolito). O schema atual já atende ao sistema alvo — a única adição é a tabela `sessions` (já implementada) para suporte a refresh tokens.

## Entidades de dados

| Entidade | Tabela | Aggregate dono | PK | Bounded context |
|---|---|---|---|---|
| Company | companies | AGG-Company | id | backend |
| Department | departments | AGG-Company | id | backend |
| User | users | AGG-User | id | backend |
| Contact | contacts | AGG-Contact | id | backend |
| Instance | connections | AGG-Instance | id | backend |
| Conversation | conversations | AGG-Conversation | id | backend |
| Message | messages | AGG-Message | id | backend |
| Session | sessions | AGG-Session | id | backend |

## Schema (DDL)

```sql
-- Já existente: companies, departments, users, contacts, connections, conversations, messages
-- Mantido sem alterações do schema.sql atual.

-- Adicionado: sessions (já implementado)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
```

## Relacionamentos

| Origem | Destino | Cardinalidade | Integridade | Notas |
|---|---|---|---|---|
| users.company_id | companies.id | N:1 | FK | |
| users.department_id | departments.id | N:1 (nullable) | FK | |
| departments.company_id | companies.id | N:1 | FK | |
| contacts.company_id | companies.id | N:1 | FK | |
| connections.company_id | companies.id | N:1 | FK | |
| connections.department_id | departments.id | N:1 (nullable) | FK | |
| conversations.company_id | companies.id | N:1 | FK | |
| conversations.contact_id | contacts.id | N:1 | FK | |
| conversations.assigned_to | users.id | N:1 (nullable) | FK | |
| conversations.department_id | departments.id | N:1 | FK | |
| messages.conversation_id | conversations.id | N:1 | FK | |
| sessions.user_id | users.id | N:1 | FK ON DELETE CASCADE | |

## Restrições

- **Unicidade**: users.email (UNIQUE), contacts (company_id + phone UNIQUE), connections (company_id + instance_name UNIQUE), sessions.refresh_token (UNIQUE)
- **Integridade referencial**: Ativada (FK constraints)
- **Particionamento / sharding**: N/A (volume baixo)
- **Índices críticos**: idx_sessions_user_id, idx_sessions_refresh_token (já existentes no schema.sql para demais tabelas)

## Considerações específicas do paradigma alvo

N/A — paradigma OO com DI sem implicações no modelo de dados.

## Origem no legado

| Tabela nova | Origem no legado | Transformação |
|---|---|---|
| sessions | nova (não existia) | criada para refresh token |
| connections (demais tabelas) | schema.sql existente | mantidas sem alteração |
