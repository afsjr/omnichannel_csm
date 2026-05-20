---
generatedAt: "2026-05-19T17:45:00Z"
feature: "migracao-api-legado"
---

# Legacy Impact

> Impacto da migração do api/ legado e lib/permissions.js no projeto.

## Arquivos afetados

| Arquivo | Componente | Tipo | Severidade | Justificativa |
|---|---|---|---|---|
| `api/instances.js` | Instances | componente-extinto | LOW | Substituído por InstanceService + InstanceRepository + InstanceController |
| `lib/permissions.js` | Permissions | componente-extinto | LOW | Substituído por middleware permissions.js |
| `backend/src/repositories/InstanceRepository.js` | Instances | componente-novo | MEDIUM | Novo repositório estendendo SupabaseBaseRepository, tabela connections |
| `backend/src/services/InstanceService.js` | Instances | componente-novo | MEDIUM | Novo service com lógica de connect/disconnect e CRUD |
| `backend/src/controllers/instanceController.js` | Instances | componente-novo | MEDIUM | Novo controller Fastify para rotas de instâncias |
| `backend/src/middlewares/permissions.js` | Permissions | componente-novo | MEDIUM | Novo middleware de permissões RBAC adaptado do legado |
| `backend/src/dependencyInjection.js` | Core | regra-alterada | HIGH | InstanceRepository, InstanceService e AuthService adicionados ao container |
| `backend/src/routes/index.js` | Core | regra-alterada | HIGH | 7 rotas de instâncias adicionadas com proteção de permissões |

## Diff conceitual por componente

### Instances
- **Antes**: Código flat em `api/instances.js` com chamadas diretas a `getSupabase()` e tratamento de erros inline, sem DI, sem padrão de repositório.
- **Depois**: InstanceRepository (padrão SupabaseBaseRepository, tabela `connections`), InstanceService (lógica de negócio com validação e tratamento de erros via statusCode), InstanceController (handlers Fastify). Tudo registrado no DI container.

### Permissions
- **Antes**: `lib/permissions.js` como módulo utilitário com funções puras, middleware Express (`requirePermission` retornando middleware Express).
- **Depois**: `backend/src/middlewares/permissions.js` com mesma API (`checkPermission`, `canAccessCompany`, `requirePermission`), adaptado para Fastify (req, reply, done). Usa AuthService do container para verificação de JWT.

## Preservadas

Todas as regras de negócio 🟢 de `_reversa_sdd/domain.md` permanecem intactas:
- RN-01 a RN-22 (triagem, funil, atendimento, instâncias, dados)
- Estrutura da tabela `connections` (mesmos campos, mesma tabela)
- Comportamento da Evolution API (mesma chamada, mesmo formato QR Code)
- Hierarquia RBAC (mesmas roles, mesmas permissões, mesmo mapeamento)

## Modificadas

Nenhuma regra de negócio 🟢 foi alterada ou removida. Apenas a implementação (código) foi migrada de `api/` e `lib/` para `backend/` seguindo o padrão package-by-layer com DI.

### Regras novas (implícitas)
| Regra | Descrição | Origem |
|---|---|---|
| RN-23 | refresh_token é único por sessão | SessionRepository |
| RN-24 | logout revoga refresh token e marca usuário offline | authController.logout |
