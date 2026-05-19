# ADR-004: Autenticação JWT comSenhas Bcrypt

## Status
Aceito

## Contexto
O sistema precisa de autenticação segura com tokens stateless para API e sessão de usuário.

## Decisão
1. **Armazenamento de senhas**: bcrypt com 10 rounds (`SALT_ROUNDS = 10`)
2. **Tokens**: JWT manual (não usa jsonwebtoken library) com:
   - Header: `{ alg: 'HS256', typ: 'JWT' }`
   - Payload: `{ id, email, company_id, role }`
   - Signature: HMAC-SHA256

JWT_SECRET padrão em produção deve ser alterado via env variable.

## Consequências

### Positivas
- ✅ Tokens stateless (escalável)
- ✅ Senhas hasheadas com salt (seguro)
- ✅ Payload contém informações necessárias (company_id, role)
- ✅ Implementação simples sem dependências pesadas

### Negativas
- ❌ JWT manual pode ter vulnerabilidades se mal implementado
- ❌ Sem refresh tokens implementados
- ❌ Sem logout/blacklist de tokens

---

## Histórico de Mudanças

| Versão | Alteração | Commit |
|--------|-----------|--------|
| 1.0 | Início (crypto para hash) | - |
| 1.1 | Troca por bcrypt | `37054f6` (inicialmente) |
| 1.2 | Retorna para crypto | `b59ca20`, `27d0418` (problemas?) |
| 1.3 | Volta para bcrypt | `37054f6` final |

🟡 INFERIDO — Não analisado o histórico completo.

---

## Referências
- Arquivo: `backend/src/services/AuthService.js`
- Variável: `JWT_SECRET = process.env.JWT_SECRET || 'omnichat-secret-change-in-production'`