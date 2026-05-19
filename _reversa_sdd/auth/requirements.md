# Autenticação e Autorização

> Módulo de autenticação e controle de acesso do OmniChat CSM.

## Visão Geral

Responsável por hash de senhas, geração/validação de tokens JWT e verificação de permissões RBAC. Define quem pode acessar o sistema e quais operações cada role pode executar.

## Responsabilidades

- Hash de senhas com bcrypt (10 rounds)
- Geração de tokens JWT stateless
- Validação de tokens em requests
- Verificação de permissões por role
- Filtragem de dados conforme visibilidade
- Middleware de proteção de rotas

## Regras de Negócio

- RN-A01: Master tem acesso a todas as empresas 🟢
- RN-A02: Admin/Leader/Agent só acessam sua própria empresa 🟢
- RN-A03: Agent só vê suas próprias conversas atribuídas 🟢
- RN-A04: Leader vê conversas do seu departamento 🟡
- RN-A05: Roles: master > admin > leader > agent (hierárquico) 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-A01 | Hash de senha com bcrypt 10 rounds | Must | `bcrypt.hash(password, 10)` retorna hash válido |
| RF-A02 | Comparação de senha com hash | Must | `bcrypt.compare()` retorna true/false corretamente |
| RF-A03 | Geração de JWT com payload {id, email, company_id, role} | Must | Token gerado em formato header.body.signature |
| RF-A04 | Validação de JWT | Must | Retorna payload ou null se inválido |
| RF-A05 | Verificação de permissão por role | Must | `checkPermission(user, 'resource:action')` retorna boolean |
| RF-A06 | Filtragem de dados por visibilidade | Must | Agent só vê dados com assigned_to = user.id |
| RF-A07 | Middleware de permissão em rotas | Must | Rota retorna 403 se sem permissão |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | Senhas hasheadas com salt | `AuthService.js:4` (SALT_ROUNDS=10) | 🟢 |
| Segurança | JWT usa HMAC-SHA256 | `AuthService.js:28` | 🟢 |
| Segurança | Master bypass todas permissões | `permissions.js:102-104` | 🟢 |
| Performance | Busca de usuário por email indexada | schema: UNIQUE(email) | 🟡 |
| Escalabilidade | Tokens stateless (sem sessão) | JWT não requer DB lookup | 🟢 |

## Critérios de Aceitação

```gherkin
Dado usuário com email e senha válidos
Quando faz login
Então retorna token JWT válido com payload {id, email, company_id, role}

Dado token JWT inválido
Quando tenta acessar rota protegida
Then retorna 401 Unauthorized

Dado usuário com role "agent"
Quando tenta acessar "users:create"
Então retorna 403 Forbidden

Dado usuário "agent" com conversas atribuídas
Quando busca conversas
Then retorna apenas conversas onde assigned_to = user.id
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Hash e comparação de senha | Must | Segurança fundamental |
| Geração e validação JWT | Must | Autenticação inteira depende |
| Verificação de permissões | Must | RBAC depende |
| Middleware de proteção | Must | Todas rotas seguras |
| Filtragem por visibilidade | Must | Isolamento entre usuários |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `backend/src/services/AuthService.js` | `hashPassword`, `comparePassword`, `generateToken`, `verifyToken` | 🟢 |
| `lib/permissions.js` | `checkPermission`, `filterByPermission`, `requirePermission` | 🟢 |
| `backend/src/controllers/authController.js` | Controller HTTP | 🟢 |
| `backend/src/db/schema.sql` | Tabela users com role | 🟢 |

---

## Lacunas Identificadas

| Item | Confiança | Descrição |
|------|-----------|------------|
| 🔴 | Refresh tokens não implementados | Sessão expira sem refresh |
| 🔴 | Logout não invalida tokens | Token permanece válido após logout |
| 🔴 | Rate limiting por role | Não há limitação de requests |