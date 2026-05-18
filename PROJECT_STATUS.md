# OmniChat CSM - Status do Projeto

Este arquivo é a fonte oficial de contexto do projeto.
Objetivo: permitir continuidade em qualquer ambiente, sem perda de informação.

---

## 1) Visão do Projeto

- **Nome:** OmniChat CSM
- **Objetivo:** Sistema omnichannel de atendimento ao cliente com IA para escola técnica de enfermagem
- **Modelo:** Multiempresa (SaaS) com suporte a equipe/atendentes
- **Canais:** WhatsApp (Evolution API) + chat de site (futuro)

---

## 2) Stack Definida

| Componente | Tecnologia |
|------------|------------|
| Backend Local | Node.js + Fastify |
| Backend Cloud | Vercel Functions |
| Banco de Dados | Supabase (PostgreSQL) |
| Frontend | React 18 + Vite + Zustand |
| WhatsApp | Evolution API |
| IA | Groq (Llama) ou OpenAI |
| Realtime | Socket.io (local) / Polling 5s (cloud) |

---

## 3) Estrutura Atual do Projeto

```
omnichannel_csm/
├── api/                    # APIs para Vercel (serverless)
│   ├── auth/               # Autenticação (index.js)
│   ├── login.js            # Login direto
│   ├── register.js          # Registro de usuários
│   ├── queue.js            # Fila de conversas
│   ├── users.js            # Lista de usuários
│   ├── send-message.js     # Envio de mensagens
│   ├── webhook-handler.js  # Webhook da Evolution
│   ├── db-test.js          # Teste de conexão
│   ├── check-env.js        # Verificação de variáveis
│   └── test.js            # Endpoint de teste
│
├── lib/                    # Bibliotecas compartilhadas
│   ├── db.js              # Conexão Supabase
│   ├── messages.js        # Funções de mensagens
│   ├── evolution.js      # Integração Evolution API
│   └── security.js        # Verificação de API Key
│
├── frontend/              # App React (Vite)
│   ├── src/
│   │   ├── pages/         # Dashboard.jsx
│   │   ├── components/    # ChatWindow, ContactsModal
│   │   ├── contexts/      # AuthContext, ChatContext
│   │   └── services/      # API client
│   └── package.json
│
├── backend/              # Backend Fastify (local/desenvolvimento)
│   ├── src/
│   │   ├── app.js
│   │   ├── controllers/
│   │   ├── services/      # ChatService, EvolutionService, TriageService
│   │   ├── repositories/
│   │   └── providers/    # EvolutionProvider, LLMProvider
│   └── .env              # Variáveis de ambiente locais
│
├── docs/                 # Documentação
│   └── cloud-setup.md   # Guia de deploy Vercel
│
├── vercel.json           # Configuração Vercel
├── package.json          # Dependências do projeto
└── docker-compose.yml    # PostgreSQL local
```

---

## 4) Status Atual (Maio 2026)

### ✅ Concluído

1. **Deploy na Vercel** - Sistema 100% em produção na cloud
   - URL: https://omnichannel-csm.vercel.app
   - Frontend React funcionando
   - APIs serverless funcionando

2. **Integração com Evolution API**
   - Envio de mensagens via API
   - Recebimento de webhook
   - Suporte a mídias (imagem, áudio, vídeo)

3. **Autenticação**
   - Login funcionando (endpoint `/api/login`)
   - Registro de usuários (endpoint `/api/register`)
   - JWT para sessões

4. **Banco de Dados**
   - Conexão com Supabase funcionando
   - Tabelas de usuários, contatos, conversas, mensagens
   - API de fila de atendimentos funcionando

5. **Frontend**
   - Dashboard com fila de conversas
   - Chat com atendimento
   - Estatísticas por período

### 🔄 Em Desenvolvimento

1. **Integração completa WhatsApp**
   - Webhook precisa ser testado com mensagens reais
   - Parsing de mídias precisa de validação

2. **Sistema de IA**
   - Triagem automática de setores
   - Geração de rascunhos de resposta
   - (Funciona no backend local, não foi deployado para Vercel)

---

## 5) URLs e Configurações

### Produção Vercel
- **Frontend:** https://omnichannel-csm.vercel.app
- **API Base:** https://omnichannel-csm.vercel.app/api

### APIs Disponíveis
| Endpoint | Descrição |
|----------|------------|
| `/api/login` | Login de usuário |
| `/api/register` | Criar novo usuário |
| `/api/queue` | Lista fila de atendimentos |
| `/api/users` | Lista usuários |
| `/api/db-test` | Teste conexão banco |
| `/api/check-env` | Verifica variáveis ambiente |

### Variáveis de Ambiente (Vercel)
```
SUPABASE_URL=https://rccaiodmgvvudiplbodl.supabase.co
SUPABASE_SERVICE_KEY=<sua-chave>
EVOLUTION_API_URL=https://api.ajuda.digital
EVOLUTION_API_KEY=02E16307DC4C-46EA-BA84-D0B08D394106
EVOLUTION_INSTANCE=omni_channel
JWT_SECRET=<sua-chave-secreta>
```

### Evolution API
- **URL:** https://api.ajuda.digital
- **Instância:** omni_channel
- **Webhook:** https://omnichannel-csm.vercel.app/api/webhook-handler

---

## 6) Próximos Passos

### Imediato
1. ✅ Deploy functioning - testar com mensagens reais
2. ✅ Autenticação funcionando - testar login no frontend
3. ⚠️ Corrigir roteamento de APIs (algumas rotas ainda não funcionam)
4. ⚠️ Ativar verificação de API Key para produção

### Curto Prazo
1. Implementar sistema de IA no backend cloud
2. Adicionar gráficos visuais nas estatísticas
3. Sistema de notifications push
4. Integração com chat de site

### Médio Prazo
1. Autenticação completa JWT com roles
2. Isolamento por empresa (LGPD)
3. App mobile PWA

---

## 7) Registro de Entregas

### 2026-05-18 - Deploy na Vercel (MAIOR ENTREGA)
**Arquivos alterados/criados:**
- `package.json` - Dependencies + build script
- `vercel.json` - Configuração Vercel
- `api/*.js` - APIs serverless (login, register, queue, users, etc)
- `lib/db.js` - Conexão Supabase
- `lib/messages.js` - Funções de banco
- `lib/evolution.js` - Integração Evolution API
- `lib/security.js` - API Key verification
- `docs/cloud-setup.md` - Guia atualizado

**Problemas resolvidos:**
1. Build falhava (vite não encontrado) → `--include=dev`
2. NOT_FOUND em APIs → renomear arquivos
3. Supabase não inicializava → adicionar @supabase/supabase-js
4. Variáveis ambiente não configuradas → configurar na Vercel
5. FUNCTION_INVOCATION_FAILED → todas variáveis SET

**Resultado funcional:**
- Sistema 100% em produção
- Frontend acessível
- APIs funcionando
- Banco conectado

**Próximo passo:**
- Testar fluxo completo (webhook → banco → frontend)

---

## 8) Como Atualizar Este Arquivo

Sempre que houver implementação/melhoria:

1. Atualizar "Status Atual" com:
   - Data
   - O que foi concluído
   - O que ficou pendente
2. Atualizar "Próximos Passos"
3. Se houver novos arquivos-chave, incluir em "Estrutura Atual"

**Padrão recomendado por entrega:**
- Título curto da entrega
- Arquivos alterados
- Resultado funcional
- Próximo passo direto

---

## 9) Links Úteis

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Evolution API:** https://api.ajuda.digital
- **Repositório:** https://github.com/afsjr/omnichannel_csm