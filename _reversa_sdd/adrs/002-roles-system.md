# ADR-002: Sistema de Roles e Permissões (RBAC)

## Status
Aceito

## Contexto
O sistema SaaS multi-tenant precisa garantir isolamento entre empresas e hierarquia de acesso dentro de cada empresa (admin, líderes, atendentes).

## Decisão
Implementar RBAC (Role-Based Access Control) com 4 papéis hierárquicos:

| Papel | Escopo | Permissões |
|-------|--------|------------|
| `master` | Global | Todas |
| `admin` | Empresa | Toda a empresa |
| `leader` | Departamento | Equipe |
| `agent` | Próprias conversas | Atender |

Implementar middleware `checkPermission()` e `filterByPermission()` para:
- Verificar se usuário tem permissão para ação
- Filtrar dados conforme visibilidade (role-based)

## Consequências

### Positivas
- ✅ Isolamento seguro entre empresas
- ✅ Hierarquia clara de acesso
- ✅ Flexibilidade para diferentes tamanhos de equipe
- ✅ Reutilizável em todas as rotas

### Negativas
- ❌ Complexidade adicional em todas as rotas
- ❌ Necessidade de testar permissões exaustivamente

---

## Alternativas Considered

1. **ABAC (Attribute-Based)** — Adiado, RBAC suficiente por agora
2. **Permission bypass via config** — Rejeitado por segurança

---

## Referências
- Commit: `2df2188 feat: add roles system and multi-instance support`
- Arquivo: `lib/permissions.js`