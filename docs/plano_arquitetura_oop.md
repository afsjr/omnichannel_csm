# Documento de Arquitetura e Plano de Ação - OmniChat CSM

Este documento serve como **guia definitivo** para a reestruturação e implementação do sistema omnichannel da Escola Técnica de Enfermagem (CSM). Ele foi desenhado para ser entregue a uma LLM como contexto primário para execução de código.

---

## 1. Visão Geral dos Requisitos
*   **Cenário**: Múltiplos setores (Comercial, Financeiro, Secretaria, Acadêmica) usando WhatsApp via Evolution API (vários números).
*   **Modelo de Operação**: Kanban-style (estilo Chatwoot), onde atendentes "puxam" atendimentos ou o sistema roteia automaticamente.
*   **Inteligência Artificial (Human-in-the-loop)**: O sistema não responde sozinho. A IA atua como um "co-piloto" invisível, lendo a mensagem, classificando o setor e **escrevendo um rascunho de resposta**. O humano revisa o rascunho e aperta "Enviar".

---

## 2. Padrão Arquitetural: Orientação a Objetos (OOP) e SOLID

O backend atual (Node.js + Fastify) tem uma abordagem funcional simples. Vamos migrá-lo para uma arquitetura orientada a objetos (DDD-lite) com **Injeção de Dependência** para garantir baixo acoplamento e alta testabilidade.

### 2.1. Estrutura de Camadas
1.  **Controllers**: Recebem a requisição HTTP (Fastify), validam o payload e chamam os Services. (Sem lógica de negócio).
2.  **Services**: Contêm as regras de negócio puras e orquestração.
3.  **Repositories**: Abstraem o acesso ao banco de dados (PostgreSQL/pg). Os Services não escrevem SQL diretamente.
4.  **Providers / Integrations**: Classes exclusivas para lidar com APIs externas (EvolutionAPIClient, OpenAIClient/GroqClient).

### 2.2. Nova Estrutura de Diretórios Recomendada
```text
backend/src/
├── app.js                 # Inicialização do Fastify e Injeção de Dependência
├── domain/                # (Opcional) Entidades core
├── controllers/           
│   ├── WebhookController.js
│   └── MessageController.js
├── services/
│   ├── TriageService.js   # Classifica o departamento
│   ├── AIDraftService.js  # Gera a sugestão de resposta
│   └── ChatService.js     # Regras de negócio de chat
├── repositories/
│   ├── ConversationRepository.js
│   ├── MessageRepository.js
│   └── UserRepository.js
├── providers/
│   ├── EvolutionProvider.js
│   └── LLMProvider.js
└── db/
    └── schema.sql
```

---

## 3. Evolução do Banco de Dados (PostgreSQL)

Para suportar múltiplos setores, IA e diferentes números de WhatsApp, o `schema.sql` precisa ser atualizado:

1.  **Criar tabela `departments`**:
    *   `id`, `name` (Comercial, Financeiro, etc), `company_id`.
2.  **Criar tabela `connections` (Instâncias da Evolution)**:
    *   `id`, `instance_name`, `phone_number`, `department_id` (opcional, caso um número seja de um setor específico).
3.  **Atualizar `users`**:
    *   Adicionar `department_id` (ou criar uma tabela de relacionamento N:N se um atendente atuar em vários setores).
4.  **Atualizar `conversations`**:
    *   Adicionar `department_id` (setor atual do atendimento).
    *   Adicionar `assigned_to` (ID do atendente que "puxou" a conversa).
5.  **Atualizar/Criar para Rascunhos da IA**:
    *   Podemos adicionar um campo `draft_content` na tabela `conversations` (já que a IA gera uma resposta sugerida para a conversa ativa). Alternativamente, podemos inserir na tabela `messages` com uma flag `status = 'draft'`.

---

## 4. Estratégia Técnica de IA e Roteamento

Como o sistema vai rodar na **Vercel** (funções Serverless), existe um limite estrito de tempo de execução (timeout de 10 a 60 segundos). O processamento da IA não pode bloquear o webhook da Evolution.

### 4.1. Fluxo de Recebimento Assíncrono (Obrigatório para Vercel)
1.  **Webhook Recebe Mensagem**: O `WebhookController` salva a mensagem do aluno no banco via `MessageRepository`.
2.  **Libera o Webhook**: Responde `HTTP 200 OK` imediatamente para a Evolution API.
3.  **Dispara Job Assíncrono**: Faz uma requisição para outro endpoint próprio ou usa um serviço de fila (Inngest, Upstash QStash, ou Edge Functions).
4.  **Processamento da IA (Job)**:
    *   **Passo A (Triagem):** Se a conversa for nova, o `TriageService` chama a IA ("Lendo esta mensagem, qual setor deve atender?"). Atualiza o `department_id` da conversa.
    *   **Passo B (Drafting):** O `AIDraftService` acessa a base de conhecimento do setor e gera uma sugestão de resposta. Salva no banco como Rascunho.
5.  **Atualização Realtime**: O backend emite um evento de Socket.io (ou via polling do front) avisando que o rascunho está pronto.

---

## 5. Frontend: Interface de Atendimento (Kanban)

O painel deve refletir o ciclo de vida da conversa:

1.  **Visão de Fila (Aguardando Atendimento):** Conversas novas, já triadas pela IA para o setor do atendente logado, mas com `assigned_to = null`.
2.  **Meus Atendimentos (Em Andamento):** Onde o atendente clicou em "Puxar".
3.  **Área de Chat (O grande diferencial):**
    *   Histórico de mensagens.
    *   **Caixa de Sugestão da IA**: Um bloco destacado mostrando o rascunho gerado pela IA.
    *   Botões: `[Editar Rascunho]`, `[Aprovar e Enviar]`, `[Descartar IA e Digitar Manualmente]`.

---

## 6. Instruções para a Próxima LLM (Prompt de Início)

Quando for iniciar a codificação, forneça à LLM o seguinte comando:

> "Baseado no **Plano de Ação - OmniChat CSM**, vamos começar a reestruturação. Nosso objetivo agora é a Fase 1: Recriar o `schema.sql` e a estrutura de pastas do backend usando o padrão de Repositories e Services com Injeção de Dependência. Gere as classes base para `MessageRepository`, `ConversationRepository`, e as entidades principais garantindo que a comunicação com o banco seja isolada."
