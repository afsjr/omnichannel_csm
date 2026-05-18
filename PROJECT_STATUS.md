# OmniChat SaaS - Plano e Andamento

Este arquivo e a fonte oficial de contexto do projeto.
Objetivo: permitir continuidade em qualquer ambiente, sem perda de informacao.

## 1) Visao do Projeto

- Nome: OmniChat SaaS
- Objetivo: centralizar atendimento omnichannel com foco em WhatsApp (Evolution API) e evolucao para chat de site.
- Modelo: multiempresa (SaaS) com suporte a equipe/atendentes.

## 2) Stack Definida

- Backend: Node.js + Fastify
- Banco: PostgreSQL
- Realtime: polling curto no MVP cloud (Socket.io mantido apenas como base local)
- Frontend: React (Vite)
- Infra cloud: Vercel + Postgres gerenciado (Neon/Supabase)
 - Padrao atual: Vercel + Neon (plano free inicial)

## 3) Estrutura Atual

- Backend: [backend/src/app.js](/Users/itouch/Documents/projetos_escola/omnichannel_csm/backend/src/app.js)
- Rotas: [backend/src/routes/index.js](/Users/itouch/Documents/projetos_escola/omnichannel_csm/backend/src/routes/index.js)
- Banco:
  - conexao: [backend/src/db/index.js](/Users/itouch/Documents/projetos_escola/omnichannel_csm/backend/src/db/index.js)
  - schema: [backend/src/db/schema.sql](/Users/itouch/Documents/projetos_escola/omnichannel_csm/backend/src/db/schema.sql)
- Servicos:
  - mensagens: [backend/src/services/messageService.js](/Users/itouch/Documents/projetos_escola/omnichannel_csm/backend/src/services/messageService.js)
  - Evolution: [backend/src/services/evolutionService.js](/Users/itouch/Documents/projetos_escola/omnichannel_csm/backend/src/services/evolutionService.js)
  - Triage (IA): [backend/src/services/TriageService.js](/Users/itouch/Documents/projetos_escola/omnichannel_csm/backend/src/services/TriageService.js)
  - AI Draft (IA): [backend/src/services/AIDraftService.js](/Users/itouch/Documents/projetos_escola/omnichannel_csm/backend/src/services/AIDraftService.js)
  - Funil: [backend/src/services/FunnelClassificationService.js](/Users/itouch/Documents/projetos_escola/omnichannel_csm/backend/src/services/FunnelClassificationService.js)
- Controllers:
  - AI: [backend/src/controllers/aiController.js](/Users/itouch/Documents/projetos_escola/omnichannel_csm/backend/src/controllers/aiController.js)
  - Dashboard: [backend/src/controllers/dashboardController.js](/Users/itouch/Documents/projetos_escola/omnichannel_csm/backend/src/controllers/dashboardController.js)
- Frontend:
  - app realtime: [frontend/src/pages/Dashboard.jsx](/Users/itouch/Documents/projetos_escola/omnichannel_csm/frontend/src/pages/Dashboard.jsx)
  - chat: [frontend/src/components/ChatWindow.jsx](/Users/itouch/Documents/projetos_escola/omnichannel_csm/frontend/src/components/ChatWindow.jsx)
- Infra: [docker-compose.yml](/Users/itouch/Documents/projetos_escola/omnichannel_csm/docker-compose.yml)

## 4) Status Atual (Hoje)

Data de referencia: 2026-05-18

Concluido:
- Estrutura inicial de pastas de backend e frontend criada.
- Endpoint `POST /webhook` implementado.
- Recebimento de payload + persistencia basica no banco implementados.
- Emissao de evento realtime `new_message` via Socket.io implementada.
- Endpoint `POST /send` implementado com integracao Evolution preparada por variaveis de ambiente.
- Frontend minimo para exibir mensagens em tempo real implementado.
- Script SQL com tabelas SaaS base criado.
- Docker Compose com PostgreSQL criado.
- Adaptacao para modo 100% cloud criada com funcoes serverless em `/api`.
- Endpoint cloud `GET /api/messages` criado para painel.
- Frontend adaptado para leitura periodica de mensagens (polling 5s), compativel com Vercel.
- Arquivo de setup cloud criado.
- Framework BMAD documentado no repositorio com checklist de Go/No-Go.
- **SISTEMA DE IA IMPLEMENTADO**: Triagem automatica de setores + geracao de rascunho de resposta.
- **PERSISTENCIA DE ANALISE IA**: Historico de analise IA salvo como mensagem do sistema no chat.
- **CLASSIFICACAO DE FUNIL**: Sistema de identificacao de topo/meio/fundo de funil para setor Comercial.
- **DASHBOARD DE ESTATISTICAS**: View de estatisticas com periodo dia/semana/mes, por setor e por atendente.
- **CONVERSAS ENCERRADAS**: Secao para ver historico de conversas resolvidas com chat em modo somente leitura.
- **REABERTURA DE CONVERSAS**: Sistema permite reabrir conversas pelo botao ou automaticamente quando cliente envia nova mensagem.

Pendente imediato:
- Executar schema no PostgreSQL cloud e validar conexao real.
- Configurar webhook da Evolution apontando para `/api/webhook` em dominio Vercel.
- Ajustar payload real da Evolution no parser de entrada.
- Implementar autenticacao e isolamento forte por empresa (LGPD e seguranca SaaS).
- Executar checklist BMAD para liberar producao com criterio objetivo.
- Concluir setup da conta Neon free e configurar `DATABASE_URL` na Vercel.

## 5) Proximos Passos (Ordem)

1. ~~Integracao real Evolution (entrada e envio com contrato correto).~~
2. ~~Login seguro + autorizacao por empresa (tenant isolation).~~
3. ~~Endpoint de listagem de conversas por empresa.~~
4. ~~Endpoint de listagem de mensagens por conversa + filtros.~~
5. ~~Atribuicao de conversa para atendente.~~
6. ~~Sistema de IA com triagem e rascunho automatico.~~
7. **Testes end-to-end**: Validar fluxo completo (webhook -> triagem IA -> rascunho -> envio).
8. **Melhorar UI do dashboard de estatisticas**: Graficos visuais.
9. **Sistema de notificacoes push**: Alertas para novos atendimentos.
10. **Trilha de auditoria e politicas de retencao (LGPD)**.
11. **Integração com chat de site** (canal adicional).
12. **App mobile basico** (PWA).

## 6) Como Atualizar Este Arquivo

Sempre que houver implementacao/melhoria:

1. Atualizar "Status Atual (Hoje)" com:
   - data
   - o que foi concluido
   - o que ficou pendente
2. Atualizar "Proximos Passos (Ordem)" refletindo nova prioridade.
3. Se houver novos arquivos-chave, incluir em "Estrutura Atual".

Padrao recomendado por entrega:
- Titulo curto da entrega
- Arquivos alterados
- Resultado funcional
- Proximo passo direto

## 7) Registro de Entregas

### 2026-05-05 - Bootstrap MVP tecnico
- Arquivos alterados:
  - backend/package.json
  - backend/src/app.js
  - backend/src/routes/index.js
  - backend/src/controllers/webhookController.js
  - backend/src/controllers/messageController.js
  - backend/src/services/messageService.js
  - backend/src/services/evolutionService.js
  - backend/src/db/index.js
  - backend/src/db/schema.sql
  - backend/src/websocket/index.js
  - backend/.env.example
  - frontend/package.json
  - frontend/index.html
  - frontend/vite.config.js
  - frontend/src/main.jsx
  - frontend/src/pages/App.jsx
  - docker-compose.yml
- Resultado funcional:
  - Base do sistema pronta para receber webhook, emitir realtime e preparar envio.
- Proximo passo direto:
  - Conectar Evolution real e validar fluxo end-to-end.

### 2026-05-05 - Adaptacao 100% cloud (Vercel)
- Arquivos alterados:
  - api/webhook.js
  - api/send.js
  - api/messages.js
  - lib/db.js
  - lib/messages.js
  - lib/evolution.js
  - frontend/src/pages/App.jsx
  - vercel.json
  - docs/cloud-setup.md
  - PROJECT_STATUS.md
- Resultado funcional:
  - Projeto preparado para rodar em nuvem sem depender de maquina local ligada.
- Proximo passo direto:
  - Subir no Vercel, configurar `DATABASE_URL` e apontar webhook da Evolution.

### 2026-05-05 - Governanca BMAD para Go-Live
- Arquivos alterados:
  - docs/bmad/01-business.md
  - docs/bmad/02-market.md
  - docs/bmad/03-architecture.md
  - docs/bmad/04-delivery.md
  - docs/bmad/05-lgpd-security.md
  - docs/bmad/go-live-checklist.md
  - PROJECT_STATUS.md
- Resultado funcional:
  - Projeto passa a ter trilha formal de decisao para producao (Business, Market, Architecture, Delivery e LGPD).
- Proximo passo direto:
  - Fechar os itens pendentes de seguranca e executar gate final Go/No-Go.

### 2026-05-05 - Ajuste de escopo de canais
- Arquivos alterados:
  - PROJECT_STATUS.md
  - docs/bmad/01-business.md
  - docs/cloud-setup.md
- Resultado funcional:
  - Escopo oficial sem Meta/Instagram, com foco em WhatsApp + chat de site.
- Proximo passo direto:
  - Fechar setup Neon free e validar conexao com Vercel.

### 2026-05-18 - Sistema de IA com Triagem e Rascunho
- Arquivos alterados/criados:
  - backend/src/services/FunnelClassificationService.js (NOVO)
  - backend/src/services/TriageService.js
  - backend/src/services/AIDraftService.js
  - backend/src/controllers/aiController.js
  - backend/src/repositories/MessageRepository.js
  - backend/src/repositories/ConversationRepository.js
  - backend/src/db/schema.sql
  - frontend/src/components/ChatWindow.jsx
  - frontend/src/index.css
- Resultado funcional:
  - IA classifica automaticamente o setor e gera rascunho de resposta.
  - Analise IA e salvo no historico do chat como mensagem do sistema.
  - Classificacao de funil (topo/meio/fundo) para setor Comercial.
  - Botao "Estatisticas" no dashboard para ver volume por dia/semana/mes.
- Proximo passo direto:
  - Testar fluxo completo com Evolution conectada.

### 2026-05-18 - Dashboard de Estatisticas
- Arquivos alterados:
  - backend/src/controllers/dashboardController.js
  - backend/src/routes/index.js
  - frontend/src/pages/Dashboard.jsx
  - frontend/src/index.css
- Resultado funcional:
  - View de estatisticas com cards para hoje/semana/mes.
  - Tabela de metricas por setor (ativos, resolvidos por periodo).
  - Tabela de metricas por atendente (em atendimento, resolvidos hoje).
  - Badges visuais para estagio do funil no chat.
- Proximo passo direto:
  - Adicionar graficos visuais e exportar para PDF/Excel.

### 2026-05-18 - Historico de Conversas Encerradas e Reabertura
- Arquivos alterados/criados:
  - backend/src/repositories/ConversationRepository.js
  - backend/src/services/ChatService.js
  - backend/src/controllers/messageController.js
  - backend/src/routes/index.js
  - frontend/src/contexts/ChatContext.jsx
  - frontend/src/pages/Dashboard.jsx
  - frontend/src/components/ChatWindow.jsx
  - frontend/src/index.css
- Resultado funcional:
  - Secao "Encerradas" no sidebar lista conversas resolvidas.
  - Botao ↩️ para reabrir conversas resolvidas.
  - Chat em modo somente leitura para conversas encerradas.
  - Webhook detecta mensagem de cliente em conversa resolvida e reabre automaticamente (status volta para pending).
- Proximo passo direto:
  - Testar reabertura via botao e via mensagem do cliente.

### 2026-05-18 - Correcao Botao Estatisticas
- Arquivos alterados:
  - frontend/src/pages/Dashboard.jsx
- Problema: URL do dashboard nao tinha o prefixo /api
- Solucao: Adicionado API_PREFIX = '/api' na URL de fetch
- Resultado: Botao de estatisticas funciona corretamente
