---
generatedAt: "2026-05-19T17:46:00Z"
feature: "migracao-api-legado"
---

# Regression Watch

> Itens de regressão a verificar quando o Reversa rodar novamente.

## Watch items

| ID | Origem | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|---|---|---|---|---|
| W001 | `api/instances.js` → `InstanceRepository` | CRUD de instâncias opera na mesma tabela `connections` com mesmos campos | presença | Queries do InstanceRepository retornam estrutura diferente do legado |
| W002 | `api/instances.js` → `InstanceService.connect` | Connect chama Evolution API POST /instance/connect/{name} com apikey header e salva qr_code | presença | QR Code não é gerado ou não atualiza na tabela |
| W003 | `api/instances.js` → `InstanceService.disconnect` | Disconnect atualiza status para 'offline' e limpa qr_code | presença | Status não atualiza ou QR permanece |
| W004 | `lib/permissions.js` → `permissions.js` | ROLES, PERMISSIONS, checkPermission mantêm mesmo mapeamento | redação | checkPermission retorna diferente do legado para mesma role + permissão |
| W005 | `lib/permissions.js` → `permissions.js` | `requirePermission` retorna 403 quando role não tem acesso | presença | Rota protegida permite acesso não autorizado |
| W006 | `api/instances.js` → `InstanceService` | Erro 404 é retornado quando instância não existe | presença | GET /instances/:id inexistente retorna diferente de 404 |
| W007 | `api/instances.js` → `InstanceService.create` | Erro 409 quando instance_name duplicado na mesma empresa | presença | POST /instances com nome duplicado não retorna 409 |

## Observações

Regras originalmente 🟡 ou 🔴 (não incluídas no watch principal):
- Implementação do LLMProvider (não alterada pela migração)
- Taxa de expiração de QR Code (depende da Evolution API externa)

## Histórico de re-extrações

*Esta seção será preenchida pelo agente reverso quando rodar `/reversa` novamente.*

## Arquivadas

*Nenhum item arquivado ainda.*
