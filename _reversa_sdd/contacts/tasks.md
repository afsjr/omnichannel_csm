# Contatos, Tarefas de Implementação

> Tarefas executáveis para reimplementar o módulo de Contatos, com rastreabilidade ao código original.

## Pré-requisitos
- [ ] Conexão com Supabase / PostgreSQL estabelecida
- [ ] Schema da tabela `contacts` no PostgreSQL/Supabase compatível
- [ ] Repositório base (`SupabaseBaseRepository`) implementado e disponível

## Tarefas

> Cada tarefa referencia o arquivo do legado de onde o comportamento foi extraído.

- [ ] T-C01: Implementar normalização de telefone (`normalizePhone`)
  - Origem no legado: `backend/src/repositories/ContactRepository.js:112-114`
  - Critério de pronto: Retorna apenas os dígitos numéricos de uma string de telefone informada (ex: `+55 (11) 98888-7777` -> `5511988887777`).
  - Confiança: 🟢

- [ ] T-C02: Implementar busca de contato por telefone (`findByPhone`)
  - Origem no legado: `backend/src/repositories/ContactRepository.js:8-21`
  - Critério de pronto: Consulta a tabela `contacts` filtrando por `company_id` e `phone` normalizado. Deve retornar `{ rows: [contact], rowCount: 1 }` se encontrado, ou `{ rows: [], rowCount: 0 }` tratando adequadamente o erro PostgREST `PGRST116` (no rows returned).
  - Confiança: 🟢

- [ ] T-C03: Implementar busca ou criação automática (`findOrCreate`)
  - Origem no legado: `backend/src/repositories/ContactRepository.js:23-43`
  - Critério de pronto: Tenta localizar o contato usando `findByPhone`. Se existir, retorna-o diretamente. Caso contrário, realiza um `insert` com `company_id`, `phone` normalizado e `name` (caso name esteja vazio, preenche com o telefone normalizado).
  - Confiança: 🟢

- [ ] T-C04: Implementar cadastro manual de contato (`create`)
  - Origem no legado: `backend/src/repositories/ContactRepository.js:45-60`
  - Critério de pronto: Insere um novo contato com `company_id`, `name`, `phone` normalizado e `email` opcional.
  - Confiança: 🟢

- [ ] T-C05: Implementar listagem e busca geral (`findAll`)
  - Origem no legado: `backend/src/repositories/ContactRepository.js:62-80`
  - Critério de pronto: Lista os contatos de uma determinada empresa ordenados decrescentemente por data de criação (`created_at`). Suporta filtro parcial `options.search` (usando `ilike` sobre `name` ou `phone`) e limite numérico `options.limit`.
  - Confiança: 🟢

- [ ] T-C06: Implementar busca de contato por ID (`findById`)
  - Origem no legado: `backend/src/repositories/ContactRepository.js:82-93`
  - Critério de pronto: Retorna o contato a partir do `id` do banco. Trata o erro PostgREST `PGRST116` para retornar `rowCount: 0` caso o registro não exista.
  - Confiança: 🟢

- [ ] T-C07: Implementar atualização de dados de contato (`update`)
  - Origem no legado: `backend/src/repositories/ContactRepository.js:95-110`
  - Critério de pronto: Atualiza opcionalmente os campos `name`, `email` e `phone` (se fornecido, deve ser normalizado antes de salvar).
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-C01: Teste unitário da sanitização de strings telefônicas (`normalizePhone`) com espaços, traços, parênteses e símbolos.
- [ ] TT-C02: Teste de integração de `findOrCreate` garantindo o fluxo de não duplicação de contatos e criação com nome padrão se vazio.
- [ ] TT-C03: Teste de listagem (`findAll`) validando a ordenação decrescente e filtragem de busca textual por partes do nome ou telefone.

## Tarefas de Migração de Dados (se aplicável)

- [ ] TM-C01: Migração estrutural da tabela `contacts` e criação do índice composto `idx_contacts_company_phone`.

## Ordem Sugerida
1. Implementar método utilitário `normalizePhone` e as buscas por chave primária/secundária (`findById`, `findByPhone`).
2. Implementar fluxo transacional de criação / garantia de contatos (`create`, `findOrCreate`).
3. Implementar listagem e filtros (`findAll`, `update`).

## Lacunas Pendentes (🔴)
Nenhuma lacuna técnica impeditiva identificada na estrutura do repositório de contatos.
