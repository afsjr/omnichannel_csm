# Setup 100% Cloud (Vercel)

## Objetivo
Rodar o projeto com computador desligado, com backend, frontend e webhook em nuvem.

## Arquitetura
- Frontend: Vercel
- API: Vercel Functions (`/api`)
- Banco: Supabase (PostgreSQL gerenciado)
- WhatsApp: Evolution API enviando webhook para URL pública da Vercel
- Realtime: Polling (5s) - Socket.io não funciona bem em serverless

## Variáveis de ambiente (Vercel)

Configure as seguintes variáveis no dashboard da Vercel:

| Variável | Valor |
|----------|-------|
| `SUPABASE_URL` | https://rccaiodmgvvudiplbodl.supabase.co |
| `SUPABASE_SERVICE_KEY` | Sua chave do Supabase |
| `EVOLUTION_API_URL` | https://api.ajuda.digital |
| `EVOLUTION_API_KEY` | 02E16307DC4C-46EA-BA84-D0B08D394106 |
| `EVOLUTION_INSTANCE` | omni_channel |
| `INTERNAL_API_KEY` | Chave secreta para APIs internas |

## Endpoints

- `POST /api/webhook` - Recebe mensagens da Evolution API
- `POST /api/send` - Envia mensagem para WhatsApp
- `GET /api/messages` - Lista conversas (queue, my-conversations, conversation/:id)
- `POST /api/messages/assign` - Atribui conversa a atendente
- `POST /api/messages/resolve` - Encerrar conversa

## Passos de Deploy

### 1. Configurar Supabase
- O banco já está configurado com as tabelas necessárias
- A URL já está no projeto

### 2. Configurar Vercel
1. Criar projeto na Vercel conectando ao GitHub
2. Adicionar as variáveis de ambiente acima
3. Fazer deploy do projeto

### 3. Configurar Webhook na Evolution API
```bash
curl -X POST "https://api.ajuda.digital/webhook/set/omni_channel" \
  -H "Content-Type: application/json" \
  -H "apikey: 02E16307DC4C-46EA-BA84-D0B08D394106" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://SEU_DOMINIO.vercel.app/api/webhook",
      "webhookByEvents": false,
      "events": ["MESSAGES_UPSERT", "SEND_MESSAGE", "CONNECTION_UPDATE"]
    }
  }'
```

Substitua `SEU_DOMINIO.vercel.app` pelo seu domínio real.

### 4. Testar
- Acesse `https://SEU_DOMINIO.vercel.app` para o frontend
- Teste o webhook: `https://SEU_DOMINIO.vercel.app/api/messages?company_id=1`

## Segurança

### API Key Interna
Todas as APIs (exceto webhook) requerem a header `X-API-Key`:
```bash
curl -H "X-API-Key: SUA_CHAVE_SECRETA" \
  "https://SEU_DOMINIO.vercel.app/api/messages/queue?company_id=1"
```

### Evitar Abusos
- Rate limiting implementado no frontend via polling
- API key interna protege endpoints sensíveis
- Webhook validado pela Evolution API (apikey header)

## Realtime na Vercel
Socket.io persistente não funciona bem em serverless. No MVP cloud:
- Usar polling curto no frontend (5s)
- O frontend já está configurado para polling
- Para produção: considerar Supabase Realtime ou WebSocket dedicado

## Deploy do Frontend
O frontend React está na pasta `/frontend`. Configure na Vercel:
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`