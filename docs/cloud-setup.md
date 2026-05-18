# Setup 100% Cloud (Vercel) - Guia Completo

## Visão Geral

O projeto OmniChat CSM está configurado para funcionar 100% na cloud usando Vercel como plataforma de deploy. Isso significa que o sistema pode operar sem necessidade de servidor local ligado.

## Arquitetura

```
┌─────────────────┐
│  Evolution API  │ ← Webhook de mensagens
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                     VERCEL                                  │
│  ┌──────────────────┐    ┌────────────────────────────┐  │
│  │   Frontend (Vite) │    │   APIs (Serverless)         │  │
│  │   omnichannel-    │    │   - /api/login              │  │
│  │   csm.vercel.app │    │   - /api/queue              │  │
│  └──────────────────┘    │   - /api/webhook-handler    │  │
│                           └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│    SUPABASE     │ ← Banco de dados PostgreSQL
│ (PostgreSQL)    │
└─────────────────┘
```

## Estrutura de Arquivos para Deploy

```
omnichannel_csm/
├── api/                    ← Funções serverless da Vercel
│   ├── login.js           ← Login
│   ├── register.js        ← Registro
│   ├── queue.js           ← Fila de atendimentos
│   ├── users.js           ← Usuários
│   ├── webhook-handler.js ← Webhook Evolution
│   └── ...
│
├── lib/                    ← Bibliotecas compartilhadas
│   ├── db.js              ← Conexão Supabase
│   ├── messages.js        ← Funções de banco
│   ├── evolution.js       ← Integração Evolution
│   └── security.js        ← API Key validation
│
├── frontend/              ← App React
│   └── dist/             ← Build output (gerado automaticamente)
│
├── vercel.json           ← Configuração do Vercel
└── package.json          ← Dependencies
```

## Configuração na Vercel

### 1. Conectar Repositório
1. Acesse https://vercel.com
2. Crie novo projeto conectando ao GitHub
3. Selecione o repositório `omnichannel_csm`

### 2. Variáveis de Ambiente

Adicione estas variáveis em **Settings → Environment Variables**:

| Variável | Valor | Sensitive |
|----------|-------|-----------|
| `SUPABASE_URL` | `https://rccaiodmgvvudiplbodl.supabase.co` | ✓ |
| `SUPABASE_SERVICE_KEY` | Sua chave do Supabase | ✓ |
| `EVOLUTION_API_URL` | `https://api.ajuda.digital` | ✓ |
| `EVOLUTION_API_KEY` | `02E16307DC4C-46EA-BA84-D0B08D394106` | ✓ |
| `EVOLUTION_INSTANCE` | `omni_channel` | ✓ |
| `JWT_SECRET` | Sua chave secreta | ✓ |
| `NODE_ENV` | `production` | - |

### 3. Configurações de Build

O `vercel.json` já está configurado com:
- Build command: `npm run build`
- Output: `frontend/dist`
- Framework: Vite
- Functions: Todas em `api/*.js` com timeout de 30s

## APIs Disponíveis

### Autenticação
```
POST /api/login
POST /api/register
```

### Mensagens
```
GET /api/queue?company_id=1
GET /api/users
POST /api/assign
POST /api/resolve
```

### Webhook
```
POST /api/webhook-handler
```

### Utilitários
```
GET /api/db-test     # Testa conexão banco
GET /api/check-env   # Verifica variáveis ambiente
GET /api/test        # Teste geral
```

## Configurar Webhook na Evolution API

Execute este comando para configurar o webhook:

```bash
curl -X POST "https://api.ajuda.digital/webhook/set/omni_channel" \
  -H "Content-Type: application/json" \
  -H "apikey: 02E16307DC4C-46EA-BA84-D0B08D394106" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://omnichannel-csm.vercel.app/api/webhook-handler",
      "webhookByEvents": false,
      "events": ["MESSAGES_UPSERT", "SEND_MESSAGE"]
    }
  }'
```

## Testes

### Testar API
```bash
# Verificar variáveis ambiente
curl https://omnichannel-csm.vercel.app/api/check-env

# Testar banco
curl https://omnichannel-csm.vercel.app/api/db-test

# Listar usuários
curl https://omnichannel-csm.vercel.app/api/users

# Login
curl -X POST https://omnichannel-csm.vercel.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@csm.com", "password": "123456"}'
```

### Testar Frontend
Acesse: https://omnichannel-csm.vercel.app

## Problemas Comuns

### 1. NOT_FOUND em APIs
- Verificar se o arquivo está na pasta `api/`
- Nomes de arquivos não podem ter hífen: usar `queue.js` não `queue-api.js`

### 2. FUNCTION_INVOCATION_FAILED
- Verificar se todas variáveis estão configuradas
- Verificar se `@supabase/supabase-js` está nas dependências

### 3. Build falha
- Adicionar `--include=dev` no script de build
- Verificar se vite está em devDependencies

## Ambiente Local

Para desenvolver localmente:

```bash
# Backend local
cd backend
npm install
npm run dev

# Frontend local (outro terminal)
cd frontend
npm install
npm run dev
```

## Segurança

### API Key
As APIs (exceto webhook) requerem header `X-API-Key`:
```bash
curl -H "X-API-Key: sua-chave" https://...
```

### Variáveis Sensíveis
- Todas as variáveis com dados sensíveis devem ser marcadas como "Sensitive" na Vercel
- Nunca commit arquivos `.env` com chaves reais

## Monitoramento

### Ver Logs
Vercel → Deployments → Click no deploy → Runtime Logs

### Verificar Status
- Frontend: https://omnichannel-csm.vercel.app
- API: https://omnichannel-csm.vercel.app/api/test

---

## Conclusão

Este guia cobre a configuração completa para deploy na Vercel. O sistema está pronto para uso em produção com as seguintes funcionalidades:
- ✅ Frontend React
- ✅ APIs serverless
- ✅ Banco Supabase
- ✅ Integração Evolution API
- ✅ Autenticação JWT

Para dúvidas ou problemas, verificar os logs na Vercel ou consultar o PROJECT_STATUS.md.