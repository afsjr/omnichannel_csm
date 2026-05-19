# Mensagens, Tarefas de Implementação

> Tarefas executáveis para reimplementar o módulo de Mensagens, com rastreabilidade ao código original.

## Pré-requisitos
- [ ] Dependências da unit (`ContactRepository`, `ConversationRepository`, `MessageRepository`, `EvolutionProvider`) estão disponíveis
- [ ] Schema da tabela `messages` no PostgreSQL/Supabase compatível
- [ ] Variáveis de ambiente configuradas para a Evolution API

## Tarefas

> Cada tarefa referencia o arquivo do legado de onde o comportamento foi extraído.

- [ ] T-M01: Implementar normalização de telefone (`normalizePhone`)
  - Origem no legado: `backend/src/services/ChatService.js:293-295`
  - Critério de pronto: Retorna apenas dígitos numéricos, removendo máscaras e caracteres especiais (ex: `normalizePhone("+55 (11) 99999-9999")` retorna `"5511999999999"`).
  - Confiança: 🟢

- [ ] T-M02: Implementar criação de mensagem genérica (`MessageRepository.create`)
  - Origem no legado: `backend/src/repositories/MessageRepository.js:47-66`
  - Critério de pronto: Insere um registro na tabela `messages` mapeando os campos camelCase para snake_case no banco de dados e serializando metadados se necessário.
  - Confiança: 🟢

- [ ] T-M03: Implementar criação de mensagem recebida (`MessageRepository.createIncoming`)
  - Origem no legado: `backend/src/repositories/MessageRepository.js:68-89`
  - Critério de pronto: Cria mensagem com `sender_type = 'contact'`, `direction = 'incoming'` e `status = 'received'`, parseando metadados de mídia se existirem.
  - Confiança: 🟢

- [ ] T-M04: Implementar criação de mensagem enviada (`MessageRepository.createOutgoing`)
  - Origem no legado: `backend/src/repositories/MessageRepository.js:91-101`
  - Critério de pronto: Cria mensagem com `sender_type = 'user'`, `direction = 'outgoing'`, associando o `sender_id` (atendente) correspondente.
  - Confiança: 🟢

- [ ] T-M05: Processar mensagem recebida via webhook (`ChatService.processIncomingMessage`)
  - Origem no legado: `backend/src/services/ChatService.js:10-63`
  - Critério de pronto: Executa o fluxo: normaliza o telefone, busca/cria o contato, busca uma conversa ativa aberta (ou reabre/cria se necessário), persiste a mensagem e atualiza o timestamp `last_message_at` da conversa.
  - Confiança: 🟢

- [ ] T-M06: Enviar mensagem de texto (`ChatService.sendMessage`)
  - Origem no legado: `backend/src/services/ChatService.js:148-176`
  - Critério de pronto: Valida a conversa e contato, envia o texto via `EvolutionProvider.sendText` se configurado, persiste a mensagem como `outgoing` no banco e atualiza `last_message_at` da conversa.
  - Confiança: 🟢

- [ ] T-M07: Enviar mensagem de mídia (`ChatService.sendMediaMessage`)
  - Origem no legado: `backend/src/services/ChatService.js:178-218`
  - Critério de pronto: Valida conversa e contato, dispara `EvolutionProvider.sendMedia` se configurado, persiste a mensagem com metadados de mídia (tipo, url, legenda) no banco.
  - Confiança: 🟢

- [ ] T-M08: Implementar início de conversa externa (`ChatService.startOutgoingConversation`)
  - Origem no legado: `backend/src/services/ChatService.js:247-279`
  - Critério de pronto: Verifica se há conversa ativa para o contato. Se não houver, cria uma nova conversa `pending` e insere a mensagem `outgoing` inicial com status `pending`.
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-M01: Teste unitário do processamento de mensagens de webhook (`processIncomingMessage`) com contatos novos e existentes.
- [ ] TT-M02: Teste unitário de reabertura automática de conversas resolvidas ao receber mensagem.
- [ ] TT-M03: Teste unitário de envio de texto e mídia simulando sucesso e falha na Evolution API.

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-M01: Migrar a tabela `messages` e seus índices associados (`idx_messages_conversation`, `idx_messages_created`).

## Ordem Sugerida
1. Reimplementar `MessageRepository` com as funções de criação (`create`, `createIncoming`, `createOutgoing`, `createSystem`).
2. Implementar `normalizePhone` e as integrações do `ChatService` com os repositórios correspondentes.
3. Desenvolver `processIncomingMessage` e as ações de envio (`sendMessage`, `sendMediaMessage`).

## Lacunas Pendentes (🔴)
- **Fidelidade de status:** Implementar o método `getConversationHistory` na classe `MessageRepository` (evidenciado no código chamador `ChatService.js:285` mas ausente na definição do repositório).
- **Retry e Status WhatsApp:** Tratar o fluxo de retry em falhas de envio e recepção de status de entrega (`delivered`, `read`) do WhatsApp.
