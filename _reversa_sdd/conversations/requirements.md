# Conversas

> Módulo de ciclo de vida e estado das conversas do OmniChat CSM.

## Visão Geral

Responsável por gerenciar os estados, atribuições a atendentes, rascunhos de IA, triagens por setor e prioridades de cada atendimento/conversa vinculada a um contato e a uma empresa (multi-tenant).

## Responsabilidades

- Registro de conversas e atualização de estado/status (pending, queued, in_progress, resolved)
- Atribuição de atendentes (usuários) a conversas específicas
- Armazenamento de rascunhos e confiança gerados por Inteligência Artificial
- Reabertura automática de conversas finalizadas
- Reenfileiramento de atendimentos
- Listagem filtrada por empresa, setor, status e atendente

## Regras de Negócio

- **RN-CV01: Ciclo de vida da conversa** — As conversas transitam entre os seguintes estados: `pending` (aguardando triagem), `queued` (na fila de espera), `in_progress` (atendimento em andamento), `resolved` (atendimento finalizado). 🟢
- **RN-CV02: Reabertura automática** — Ao reabrir uma conversa (`reopen`), o atendente associado é limpo (`assigned_to = null`) e o status retorna para `pending`. 🟢
- **RN-CV03: Reenfileiramento** — Ao reenfileirar uma conversa (`requeue`), o atendente associado é removido e o status torna-se `queued`. 🟢
- **RN-CV04: Atribuição de atendimento** — Quando uma conversa é atribuída a um atendente, o status obrigatoriamente muda para `in_progress`. 🟢
- **RN-CV05: Registro de última atividade** — Qualquer atualização de dados da conversa (exceto quando desativado explicitamente) altera o campo `last_message_at` para a data/hora atual. 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-CV01 | Buscar conversa por ID | Must | Retorna os dados detalhados da conversa |
| RF-CV02 | Buscar conversa por contato e status | Must | Localiza conversas correspondentes filtrando por empresa, contato, canal e status |
| RF-CV03 | Criar conversa | Must | Insere nova conversa com status padrão (`open` ou fornecido) |
| RF-CV04 | Atualizar dados da conversa | Must | Permite alterar setor, atendente, conexão, prioridade, status e dados de IA |
| RF-CV05 | Atribuir conversa a atendente | Must | Atualiza `assigned_to` e define status como `in_progress` |
| RF-CV06 | Resolver conversa | Must | Define status como `resolved` |
| RF-CV07 | Reenfileirar conversa | Must | Define status como `queued` e limpa `assigned_to` |
| RF-CV08 | Reabrir conversa | Must | Define status como `pending` e limpa `assigned_to` |
| RF-CV09 | Listar conversas resolvidas com dados relacionados | Should | Retorna histórico de conversas resolvidas incluindo nome/telefone do contato, nome do setor e do atendente |
| RF-CV10 | Atualizar rascunho de IA | Should | Atualiza `ai_draft` e `ai_confidence` da conversa |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Índices para consultas compostas no par (company_id, status) | `backend/src/db/schema.sql:157` | 🟢 |
| Performance | Índices sobre chaves estrangeiras (`department_id`, `assigned_to`, `connection_id`) | `backend/src/db/schema.sql:158-160` | 🟢 |

## Critérios de Aceitação

```gherkin
Dado que uma conversa está associada ao atendente ID 10 e possui status "in_progress"
Quando a função resolve é chamada para esta conversa
Então o status da conversa deve ser atualizado para "resolved" no banco de dados

Dado que uma conversa possui status "resolved"
Quando a função reopen é executada
Então o status da conversa deve mudar para "pending" e o campo assigned_to deve ficar nulo (NULL)

Dado que uma conversa está ativa
Quando a função updateDraft é executada com o rascunho "Olá, como posso ajudar?" e confiança 0.95
Então os campos ai_draft e ai_confidence são atualizados correspondendo aos novos valores informados
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| `create`, `update`, `findById`, `findByContactAndStatus` | Must | Operações cruciais para o fluxo operacional básico do sistema |
| Mutações de status (`assignTo`, `resolve`, `reopen`, `requeue`) | Must | Definem a dinâmica das transições de atendimento e regras de negócios centrais |
| `findResolved` com dados de relacionamentos | Should | Necessário para renderização do histórico de chats finalizados no frontend |
| `updateDraft` | Should | Central para a integração com IA de triagem e sugestão de respostas |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `backend/src/repositories/ConversationRepository.js` | `ConversationRepository` | 🟢 |
| `backend/src/db/schema.sql` | Tabela `conversations` | 🟢 |
