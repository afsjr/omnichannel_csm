# Contatos, Design Técnico

> Especificação técnica detalhada de como a unit de Contatos é estruturada e se comporta.

## Interface

### ContactRepository

A classe herda de `SupabaseBaseRepository` e expõe a seguinte interface:

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `findByPhone` | `(companyId: number, phone: string)` | `{ rows: object[], rowCount: number }` | Busca contato correspondente ao telefone normalizado |
| `findOrCreate` | `(companyId: number, name: string, phone: string)` | `object` | Retorna contato existente ou cria novo se não existir. Retorna o objeto contato diretamente. |
| `create` | `(companyId: number, name: string, phone: string, email: string\|null)` | `{ rows: object[], rowCount: number }` | Cria contato manualmente no banco |
| `findAll` | `(companyId: number, options: object)` | `{ rows: object[], rowCount: number }` | Lista contatos com filtros (`search`, `limit`) e ordenação decrescente por criação |
| `findById` | `(id: number)` | `{ rows: object[], rowCount: number }` | Busca contato pelo ID |
| `update` | `(id: number, data: object)` | `{ rows: object[], rowCount: number }` | Atualiza campos do contato (`name`, `email`, `phone`) normalizando o telefone se modificado |
| `normalizePhone` | `(phone: string)` | `string` | Remove todos os caracteres não-dígitos do número de telefone |

## Fluxo Principal

### Fluxo 1: Buscar ou Criar Contato (findOrCreate)
1. `ChatService` ou `WebhookController` invoca `ContactRepository.findOrCreate(companyId, name, phone)`.
2. O repositório chama `this.normalizePhone(phone)` para sanitizar a entrada.
3. Invoca `this.findByPhone(companyId, normalizedPhone)`:
   - Executa query no Supabase filtrando por `company_id` e `phone`.
   - Trata erro `PGRST116` (nenhum registro encontrado) para retornar `rowCount: 0`.
4. Se o contato existe (`rowCount > 0`), retorna o objeto do contato existente diretamente (`rows[0]`).
5. Se não existe, executa `insert` no Supabase com `company_id`, `phone` normalizado e `name` (usa `normalizedPhone` se `name` for nulo/vazio).
6. Retorna o objeto do contato recém-criado.

### Fluxo 2: Listagem de Contatos (findAll)
1. Controller chama `ContactRepository.findAll(companyId, options)`.
2. Prepara query Supabase selecionando todos os campos e ordenando por `created_at` em ordem decrescente.
3. Se `options.search` estiver presente:
   - Adiciona filtro OR: `name.ilike.%search%` ou `phone.ilike.%search%`.
4. Se `options.limit` estiver presente:
   - Limita o número de registros retornados.
5. Executa a query e retorna `{ rows: data, rowCount: data.length }`.

## Dependências

- `SupabaseBaseRepository` (classe pai que fornece acesso à conexão Supabase `this.client` e utilitários genéricos).

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Isolamento Multi-tenant | Uso obrigatório de `companyId` em `findByPhone`, `findOrCreate`, `create` e `findAll` | `ContactRepository.js:13,34,50,66` | 🟢 |
| Tratamento de erro single() | Supressão de erro `PGRST116` (PostgREST sem linhas retornadas) para evitar quebras | `ContactRepository.js:17,89` | 🟢 |
| Normalização Centralizada | Métodos de persistência e consulta invocam obrigatoriamente `normalizePhone` | `ContactRepository.js:9,24,46,99` | 🟢 |

## Estado Interno

O `ContactRepository` é stateless. Mantém apenas referências à conexão do banco herdadas de `SupabaseBaseRepository`:
- `this.db`: Instância de conexão do banco.
- `this.client`: Cliente Supabase.
- `this.tableName`: Nome da tabela mapeada (`contacts`).

## Observabilidade

- Erros críticos do banco (ex: timeout, violação de constraints estruturais) são propagados diretamente como exceções.
- Não há logs ou telemetria adicionais específicos implementados no repositório.

## Riscos e Lacunas

- 🟡 **Ausência de validação de formato:** A função `normalizePhone` apenas remove não-dígitos. Não há verificação se o telefone resultante possui tamanho mínimo/máximo ou se é um número de WhatsApp válido estruturalmente.
