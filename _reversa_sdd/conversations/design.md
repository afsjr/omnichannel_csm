# Conversas, Design Técnico

> Especificação técnica detalhada de como a unit de Conversas é estruturada e se comporta.

## Interface

### ConversationRepository

A classe herda de `SupabaseBaseRepository` e expõe a seguinte interface:

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `findById` | `(id: number)` | `{ rows: object[], rowCount: number }` | Busca conversa por ID tratando ausência de dados |
| `findByContactAndStatus` | `(companyId: number, contactId: number, channel: string, status: string)` | `{ rows: object[], rowCount: number }` | Busca conversa ativa por contato, canal e status |
| `findByCompany` | `(companyId: number, filters: object)` | `{ rows: object[], rowCount: number }` | Lista conversas aplicando filtros de status, setor, atribuição, limites e paginação |
| `create` | `(data: object)` | `{ rows: object[], rowCount: number }` | Cria nova conversa mapeando chaves |
| `update` | `(id: number, data: object)` | `{ rows: object[], rowCount: number }` | Atualiza propriedades da conversa e renova `last_message_at` por padrão |
| `updateDraft` | `(conversationId: number, draft: string, confidence: number)` | `{ rows: object[], rowCount: number }` | Atalho para salvar rascunho e confiança da IA |
| `assignTo` | `(conversationId: number, userId: number)` | `{ rows: object[], rowCount: number }` | Atalho para atribuir a atendente e definir status `in_progress` |
| `resolve` | `(conversationId: number)` | `{ rows: object[], rowCount: number }` | Atalho para finalizar a conversa (`status = 'resolved'`) |
| `requeue` | `(conversationId: number)` | `{ rows: object[], rowCount: number }` | Atalho para remover atendente e mudar status para `queued` |
| `reopen` | `(conversationId: number)` | `{ rows: object[], rowCount: number }` | Atalho para remover atendente e mudar status para `pending` |
| `findResolved` | `(companyId: number, options: object)` | `{ rows: object[], rowCount: number }` | Lista conversas resolvidas trazendo dados de contatos, setores e usuários relacionados |
| `formatConversationData`| `(conv: object)` | `object` | Achata os objetos relacionados retornados pelo Supabase para simplificar o consumo do frontend |

## Fluxo Principal

### Fluxo 1: Transições de Estado de Conversas (Atalhos)
Os métodos `assignTo`, `resolve`, `requeue` e `reopen` atuam como wrappers em cima da função principal `update(id, data)`:
1. Ao invocar `assignTo(conversationId, userId)`:
   - Faz update na conversa alterando `assigned_to` para `userId` e `status` para `in_progress`.
2. Ao invocar `resolve(conversationId)`:
   - Altera `status` para `resolved`.
3. Ao invocar `requeue(conversationId)`:
   - Altera `assigned_to` para `null` e `status` para `queued`.
4. Ao invocar `reopen(conversationId)`:
   - Altera `assigned_to` para `null` e `status` para `pending`.

### Fluxo 2: Busca Filtrada por Empresa (findByCompany)
1. Controller chama `ConversationRepository.findByCompany(companyId, filters)`.
2. Cria query base no Supabase para a tabela `conversations` filtrando por `company_id`.
3. Aplica filtros condicionais baseados no objeto `filters`:
   - `filters.status`: Filtra por igualdade de status.
   - `filters.departmentId`: Filtra por setor específico.
   - `filters.assignedTo`: Filtra por atendente específico.
   - `filters.unassigned`: Filtra apenas conversas sem atendente atribuído (`assigned_to IS NULL`).
4. Aplica ordenações: primeiro por prioridade decrescente (`priority desc`), depois por data da última mensagem decrescente (`last_message_at desc`).
5. Aplica paginação: se `filters.limit` e `filters.offset` estiverem definidos, mapeia para a cláusula `.range(offset, offset + limit - 1)`.
6. Executa a chamada e retorna os dados encontrados.

### Fluxo 3: Listagem de Resolvidas (findResolved)
1. Controller chama `findResolved(companyId, options)`.
2. Executa uma query no Supabase solicitando a junção de entidades usando sintaxe `.select('*, contacts(name, phone), departments(name), users(name)')`.
3. Aplica filtro de status `resolved` e `company_id`.
4. Ordena por `last_message_at desc`.
5. Retorna a lista aninhada.
6. A camada de serviço/controller costuma usar `formatConversationData` para achatar as chaves retornadas (ex: mapear `departments.name` para `department_name`).

## Dependências

- `SupabaseBaseRepository` (classe pai que fornece acesso à conexão Supabase `this.client`).
- Tabelas do banco de dados referenciadas nas junções: `contacts`, `departments`, `users`.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Timestamp automático de atividade | Atualização do campo `last_message_at` a cada update, a menos que `updateLastMessage` seja passado como `false` | `ConversationRepository.js:110-112` | 🟢 |
| Ordenação de fila prioritária | Ordenação padrão prioritária por `priority desc` e em seguida por `last_message_at desc` | `ConversationRepository.js:58` | 🟢 |
| Achato de relacionamentos (Flattening) | Função `formatConversationData` remapeia objetos complexos do Supabase para formato linear de visualização | `ConversationRepository.js:174-182` | 🟢 |

## Estado Interno

Assim como os demais repositórios, a classe herda as variáveis do cliente de banco e não mantém estados em memória.

## Observabilidade

- Nenhuma telemetria ou log estruturado em tempo de execução além do repasse direto das exceções do PostgREST.

## Riscos e Lacunas

- 🟡 **Potencial estouro de concorrência:** Não há controle transacional (como locks pessimistas) na transição de atribuição de conversas (`assignTo`). Se dois atendentes tentarem puxar a mesma conversa no mesmo instante, o último update simplesmente sobresscreverá o primeiro sem notificação de conflito.
