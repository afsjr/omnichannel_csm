---
schemaVersion: 1
generatedAt: "2026-05-19T17:31:00Z"
reversa:
  version: "1.2.43"
kind: target_domain_model
producedBy: designer
hash: "sha256:0"
---

# Target Domain Model

> Modelo de domínio do sistema novo. Idêntico ao modelado em `_reversa_sdd/domain.md`, com acréscimo da entidade Session.

## Aggregates

### AGG-Company
- **Aggregate root**: Company
- **Invariantes**:
  - Nome da empresa é único no sistema
  - Empresa pode ter múltiplos departamentos
  - Empresa pode ter múltiplas instâncias WhatsApp
- **Comandos aceitos**: create, update, list, delete
- **Eventos publicados**: N/A (paradigma OO com DI)
- **Origem no legado**: `domain.md § Empresa (Company)`

### AGG-User
- **Aggregate root**: User
- **Invariantes**:
  - Email único no sistema
  - Role deve ser master, admin, leader ou agent
  - User pertence a uma company (exceto master)
  - User pode pertencer a um department
- **Comandos aceitos**: create, update, delete, list, login, register
- **Eventos publicados**: N/A
- **Origem no legado**: `domain.md § Usuário (User)`

### AGG-Contact
- **Aggregate root**: Contact
- **Invariantes**:
  - Telefone único por company (normalizado, apenas dígitos)
  - Contact pertence a uma company
- **Comandos aceitos**: create, update, findOrCreate
- **Eventos publicados**: N/A
- **Origem no legado**: `domain.md § Contato (Contact)`

### AGG-Instance
- **Aggregate root**: Connection/Instance
- **Invariantes**:
  - Nome único por company
  - Status: offline, connecting, connected
  - QR Code expira após tempo determinado pela Evolution API
  - Instance pertence a uma company (opcionalmente a um department)
- **Comandos aceitos**: create, connect (gera QR), disconnect, delete, list
- **Eventos publicados**: N/A
- **Origem no legado**: `domain.md § Instância (Connection/Instance)`

### AGG-Conversation
- **Aggregate root**: Conversation
- **Invariantes**:
  - Estados: pending, queued, in_progress, resolved, open
  - Conversa pertence a uma company e a um contact
  - Conversa pode ser atribuída a um user
  - Conversa resolvida reabre como pending ao receber nova mensagem
- **Comandos aceitos**: create, assign, resolve, reopen, list
- **Eventos publicados**: N/A
- **Origem no legado**: `domain.md § Conversa (Conversation)`

### AGG-Message
- **Aggregate root**: Message
- **Invariantes**:
  - Direção: incoming ou outgoing
  - Status: received, sent, failed
  - Message pertence a uma conversation
- **Comandos aceitos**: create (incoming/send), list
- **Eventos publicados**: N/A
- **Origem no legado**: `domain.md § Mensagem (Message)`

### AGG-Session
- **Aggregate root**: Session
- **Invariantes**:
  - Session pertence a um user
  - refresh_token é único
  - Session expira (expires_at)
  - Um user pode ter múltiplas sessions ativas
- **Comandos aceitos**: create, refresh, revoke, revokeAll
- **Eventos publicados**: N/A
- **Origem no legado**: novo (não existia no legado)

## Entidades

| Entidade | Aggregate dono | Atributos principais | Origem no legado |
|---|---|---|---|
| Company | AGG-Company | id, name, created_at | domain.md |
| Department | AGG-Company | id, name, company_id | domain.md |
| User | AGG-User | id, name, email, password, role, company_id, department_id | domain.md |
| Contact | AGG-Contact | id, name, phone, company_id, created_at | domain.md |
| Instance | AGG-Instance | id, instance_name, phone, status, company_id, department_id, qrcode | domain.md |
| Conversation | AGG-Conversation | id, status, contact_id, company_id, assigned_to, department_id | domain.md |
| Message | AGG-Message | id, content, direction, status, conversation_id, timestamp | domain.md |
| Session | AGG-Session | id, user_id, refresh_token, expires_at, created_at | novo |

## Value objects

| Value object | Atributos | Validações | Origem |
|---|---|---|---|
| PhoneNumber | number (string) | Apenas dígitos, normalizado | ContactRepository.js:113 |

## Regras de domínio

| Regra (ID) | Local no domínio novo | Origem |
|---|---|---|
| BR-MIGRAR-001 | InstanceService.create | api/instances.js |
| BR-MIGRAR-002 | InstanceService.connect | api/instances.js |
| BR-MIGRAR-003 | InstanceService.disconnect | api/instances.js |
| BR-MIGRAR-004 | Permissions Middleware → can(user, action) | lib/permissions.js |
| BR-MIGRAR-005 | Permissions Middleware → user.company_id filter | lib/permissions.js |
| BR-MIGRAR-006 a 034 | Distribuídas entre services/repositories existentes | target_business_rules.md |

## Rastreabilidade para o legado

| Elemento novo | Origem no legado | Tipo de mapeamento |
|---|---|---|
| AGG-Company | domain.md § Empresa | preservado |
| AGG-User | domain.md § Usuário | preservado |
| AGG-Contact | domain.md § Contato | preservado |
| AGG-Instance | domain.md § Instância | preservado |
| AGG-Conversation | domain.md § Conversa | preservado |
| AGG-Message | domain.md § Mensagem | preservado |
| AGG-Session | novo (não existia) | novo |
| InstanceService | api/instances.js | migrado (1-para-1) |
| InstanceRepository | api/instances.js + schema.sql connections | migrado |
| Permissions Middleware | lib/permissions.js | migrado (1-para-1) |
