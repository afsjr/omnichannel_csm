# Conversas, Tarefas de Implementação

> Tarefas executáveis para reimplementar o módulo de Conversas, com rastreabilidade ao código original.

## Pré-requisitos
- [ ] Conexão com Supabase / PostgreSQL estabelecida
- [ ] Schema da tabela `conversations` no PostgreSQL/Supabase compatível
- [ ] Módulos de `contacts`, `departments`, `users` e `connections` disponíveis (para constraints e relacionamentos de integridade)

## Tarefas

> Cada tarefa referencia o arquivo do legado de onde o comportamento foi extraído.

- [ ] T-CV01: Implementar busca por ID (`findById`)
  - Origem no legado: `backend/src/repositories/ConversationRepository.js:9-23`
  - Critério de pronto: Retorna conversa correspondente por ID. Deve retornar `{ rows: [conv], rowCount: 1 }` ou `{ rows: [], rowCount: 0 }` tratando o erro PostgREST `PGRST116` de "no rows returned".
  - Confiança: 🟢

- [ ] T-CV02: Implementar busca ativa por contato (`findByContactAndStatus`)
  - Origem no legado: `backend/src/repositories/ConversationRepository.js:25-37`
  - Critério de pronto: Busca uma conversa filtrada por `company_id`, `contact_id`, `channel` e `status` limitando a 1.
  - Confiança: 🟢

- [ ] T-CV03: Implementar criação de conversa (`create`)
  - Origem no legado: `backend/src/repositories/ConversationRepository.js:76-96`
  - Critério de pronto: Executa insert na tabela `conversations` populando campos obrigatórios e definindo status padrão (ex: `open` ou `whatsapp`).
  - Confiança: 🟢

- [ ] T-CV04: Implementar atualização geral de conversa (`update`)
  - Origem no legado: `backend/src/repositories/ConversationRepository.js:98-123`
  - Critério de pronto: Atualiza campos específicos e altera `last_message_at` para a data/hora atual por padrão, a menos que `data.updateLastMessage` seja passado como `false`.
  - Confiança: 🟢

- [ ] T-CV05: Implementar atalhos de transição de status (`assignTo`, `resolve`, `requeue`, `reopen`, `updateDraft`)
  - Origem no legado: `backend/src/repositories/ConversationRepository.js:125-155`
  - Critério de pronto: Métodos que reusam a função `update`:
    - `assignTo`: Define `assignedTo` e status `in_progress`.
    - `resolve`: Define status `resolved`.
    - `requeue`: Limpa `assignedTo` e define status `queued`.
    - `reopen`: Limpa `assignedTo` e define status `pending`.
    - `updateDraft`: Define `aiDraft` e `aiConfidence`.
  - Confiança: 🟢

- [ ] T-CV06: Implementar busca de conversas por empresa com paginação e filtros (`findByCompany`)
  - Origem no legado: `backend/src/repositories/ConversationRepository.js:39-74`
  - Critério de pronto: Lista conversas filtrando por status, setor, atendente e não-atribuição. Ordena obrigatoriamente por prioridade desc e em seguida por última mensagem desc. Aplica paginação via `.range(offset, offset + limit - 1)`.
  - Confiança: 🟢

- [ ] T-CV07: Implementar busca de finalizadas com dados relacionados (`findResolved`)
  - Origem no legado: `backend/src/repositories/ConversationRepository.js:157-172`
  - Critério de pronto: Realiza junção de tabelas no Supabase (`contacts`, `departments`, `users`) retornando os nomes das entidades vinculadas.
  - Confiança: 🟢

- [ ] T-CV08: Implementar formatação e achatamento de dados (`formatConversationData`)
  - Origem no legado: `backend/src/repositories/ConversationRepository.js:174-182`
  - Critério de pronto: Achatamento estrutural do retorno complexo do Supabase para simplificar consumo (ex: mapeando `departments.name` para `department_name`).
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-CV01: Teste unitário de atualização condicional de `last_message_at` (quando deve ou não alterar o timestamp).
- [ ] TT-CV02: Teste unitário da lógica de reabertura (`reopen`) e reenfileiramento (`requeue`) limpando o atendente associado.
- [ ] TT-CV03: Teste de integração de paginação e filtros composto no método `findByCompany`.

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-CV01: Migração estrutural da tabela `conversations` e criação dos índices de performance associados.

## Ordem Sugerida
1. Implementar estrutura de criação e atualização da conversa (`create`, `update`).
2. Adicionar as transições de status (`assignTo`, `resolve`, `requeue`, `reopen`).
3. Adicionar listagens estruturadas (`findByCompany`, `findResolved`).

## Lacunas Pendentes (🔴)
Nenhuma lacuna crítica de implementação no repositório de conversas.
