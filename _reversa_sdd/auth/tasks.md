# Autenticação e Autorização, Tarefas de Implementação

## Pré-requisitos

- [ ] Dependências: bcrypt instalado
- [ ] Schema users com campo role
- [ ] Variável de ambiente JWT_SECRET definida

## Tarefas

- [ ] T-A01, Implementar AuthService com métodos de hash e token
  - Origem no legado: `backend/src/services/AuthService.js:1-54`
  - Critério de pronto: bcrypt.hash e compare funcionam, JWT gerado/validado
  - Confiança: 🟢

- [ ] T-A02, Implementar sistema de permissões (permissions.js)
  - Origem no legado: `lib/permissions.js:96-228`
  - Critério de pronto: checkPermission, filterByPermission, requirePermission funcionam
  - Confiança: 🟢

- [ ] T-A03, Criar middleware de autenticação JWT
  - Origem no legado: Inference de authController
  - Critério de pronto: Rota protegida retorna 401 sem token válido
  - Confiança: 🟢

- [ ] T-A04, Criar middleware de permissão
  - Origem no legado: `lib/permissions.js:209-228` (requirePermission)
  - Critério de pronto: Rota retorna 403 se sem permissão
  - Confiança: 🟢

- [ ] T-A05, Aplicar middleware em todas as rotas sensíveis
  - Origem no legado: Inference
  - Critério de pronto: Todas rotas de usuário, conversas, instâncias protegidas
  - Confiança: 🟡

- [ ] T-A06, Implementar фильтраção de dados por visibilidade
  - Origem no legado: `lib/permissions.js:132-151`
  - Critério de pronto: Agent só vê suas conversas
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-A01, Teste de login com credenciais válidas (retorna token)
- [ ] TT-A02, Teste de login com senha incorreta (retorna 401)
- [ ] TT-A03, Teste de acesso a rota protegida sem token (retorna 401)
- [ ] TT-A04, Teste de agent tentando criar usuário (retorna 403)
- [ ] TT-A05, Teste de filtragem de conversas (agent só vê suas)

## Tarefas de Migração de Dados

- [ ] TM-A01, Garantir que todos usuários existentes tenham role (default 'agent')
  - Origem no legado: `backend/src/db/schema.sql:67-68`

## Ordem Sugerida

1. Primeiro AuthService (base)
2. Segundo permissions.js (lógica)
3. Terceiro middlewares (aplicação)
4. Quarto aplicar em rotas (proteção completa)

## Lacunas Pendentes (🔴)

- Refresh tokens: Requer decisão de arquitetura (session vs stateless)
- Logout: Requer blacklist de tokens ou shorter TTL
- Rate limiting: Depende de configuração de infraestrutura