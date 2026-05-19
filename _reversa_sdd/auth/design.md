# Autenticação e Autorização, Design Técnico

## Interface

### AuthService

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `AuthService.hashPassword` | `(password: string)` | `string` | Hash bcrypt com 10 rounds |
| `AuthService.comparePassword` | `(password: string, hash: string)` | `boolean` | Compara senha com hash |
| `AuthService.generateToken` | `(user: object)` | `string` | JWT em formato header.body.signature com iat/exp |
| `AuthService.verifyToken` | `(token: string)` | `object \| null` | Retorna payload ou null se inválido/expirado |
| `AuthService.generateRefreshToken` | `()` | `string` | Token hexadecimal 96 chars via crypto.randomBytes |
| `AuthService.getRefreshExpiration` | `()` | `Date` | 30 dias a partir de agora |

### Permissions

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `checkPermission` | `(user: object, permission: string)` | `boolean` | Verifica se role tem permissão |
| `filterByPermission` | `(user: object, data: array, field: string)` | `array` | Filtra dados conforme role |
| `canAccessCompany` | `(user: object, targetCompanyId: number)` | `boolean` | Verifica acesso à empresa |
| `requirePermission` | `(permission: string)` | `function` | Middleware Express |

### Roles (constantes)

```javascript
const ROLES = {
  MASTER: 'master',   // Admin global
  ADMIN: 'admin',     // Admin empresa
  LEADER: 'leader',   // Líder equipe
  AGENT: 'agent'      // Atendente
};
```

### Permissões por Role

| Permissão | master | admin | leader | agent |
|-----------|--------|-------|--------|-------|
| users:create | ✅ | ✅ | ❌ | ❌ |
| users:read | ✅ | ✅ | ✅ | ❌ |
| conversations:read | ✅ | ✅ | ✅ | ✅ |
| conversations:read_all | ✅ | ✅ | ✅ | ❌ |
| instances:create | ✅ | ✅ | ❌ | ❌ |
| companies:* | ✅ | ❌ | ❌ | ❌ |

## Fluxo Principal

### Fluxo 1: Login

```
1. Usuário envía POST /auth/login {email, password}
2. authController busca usuário por email
3. AuthService.comparePassword(password, hash)
4. Se válido: AuthService.generateToken(user)
5. Cria sessão: session.create({userId, refreshToken, expiresAt})
6. Retorna {token, refresh_token, expires_at, user}
```

### Fluxo 2: Verificação de Token

```
1. Middleware extrai token do header "Authorization: Bearer <token>"
2. AuthService.verifyToken(token)
3. Se válido: adiciona user ao request
4. Se inválido: retorna 401
```

### Fluxo 3: Verificação de Permissão

```
1. Middleware requirePermission('resource:action')
2. checkPermission(req.user, permission)
3. Se não tem: retorna 403
4. Se tem: next()
```

### Fluxo 4: Refresh Token

```
1. Cliente envia POST /auth/refresh {refresh_token}
2. SessionRepository.findByToken(refresh_token)
3. Se não encontrado → 401
4. Se expirado → deleta sessão → 401
5. Busca user pelo session.user_id
6. Se user não encontrado → deleta sessão → 401
7. Revoga refresh token atual: session.deleteByToken(refresh_token)
8. Gera novo JWT + novo refresh token
9. Cria nova sessão
10. Retorna {token, refresh_token, expires_at, user}
```

### Fluxo 5: Logout

```
1. Cliente envia POST /auth/logout {refresh_token} + Bearer token
2. Se refresh_token: session.deleteByToken(refresh_token)
3. Se Bearer token válido: user.setOnlineStatus(false)
4. Retorna {ok: true}
```

## Fluxos Alternativos

- **Token expirado**: `verifyToken` retorna null → 401
- **Refresh token inválido**: 401 Unauthorized
- **Refresh token expirado**: deletado, retorna 401
- **Usuário não encontrado**: Controller retorna 404
- **Senha incorreta**: Controller retorna 401
- **Master bypass**: Qualquer permissão retorna true para master

## Dependências

- `bcrypt` — Hash de senhas
- `crypto` (built-in) — HMAC para assinatura JWT
- `users` table — Fonte de dados de usuários

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| JWT manual (sem jsonwebtoken) | `AuthService.js:24-32` | 🟢 |
| Salt rounds = 10 | `AuthService.js:4` | 🟢 |
| Master tem bypass total | `permissions.js:102-104` | 🟢 |
| Agent filtrado por assigned_to | `permissions.js:146-148` | 🟢 |

## Estado Interno

O AuthService não mantém estado. O estado do usuário (company_id, role) está no payload do JWT e é verificado a cada request.

## Observabilidade

- Logs de tentativa de login falho
- Warnings quando permissão não definida: `permissions.js:110`
- JWT_SECRET deve ser alterado em produção (warning no código)

## Riscos e Lacunas

- 🟡 Rate limiting ausente
- 🟡 Refresh tokens em memória até expirarem — cleanup periódico recomendado