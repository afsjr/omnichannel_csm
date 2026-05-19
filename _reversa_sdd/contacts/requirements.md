# Contatos

> Módulo de gerenciamento de contatos (clientes/alunos) do OmniChat CSM.

## Visão Geral

Responsável pelo cadastro, busca, listagem e atualização de contatos vinculados a cada empresa (multi-tenant). Garante que cada número de telefone seja armazenado e consultado de forma normalizada (apenas dígitos).

## Responsabilidades

- Cadastro de novos contatos (com nome, telefone normalizado e e-mail opcional)
- Busca de contato existente por telefone e ID de empresa
- Criação automática caso o contato não exista ao processar mensagens
- Listagem geral de contatos com filtros de busca (nome/telefone)
- Garantia de unicidade de contatos por empresa através do número de telefone

## Regras de Negócio

- **RN-C01: Unicidade por empresa** — O par `(company_id, phone)` deve ser único. Não podem existir dois contatos com o mesmo número na mesma empresa. 🟢
- **RN-C02: Normalização de telefone** — Todo número de telefone deve ter formatações, espaços e caracteres especiais removidos (apenas dígitos) antes de qualquer operação no banco. 🟢
- **RN-C03: Nome padrão** — Se nenhum nome for fornecido na criação do contato, o nome padrão salvo deve ser o próprio telefone normalizado. 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-C01 | Buscar contato por telefone | Must | Retorna o registro correspondente filtrando por `company_id` e `phone` normalizado |
| RF-C02 | Buscar ou criar contato | Must | Se contato existe, retorna ele. Senão, insere e retorna o novo contato |
| RF-C03 | Criar contato manualmente | Must | Insere novo contato no banco com nome, telefone normalizado e e-mail opcional |
| RF-C04 | Listar contatos de uma empresa | Should | Retorna contatos ordenados por data de criação com suporte a paginação (`limit`) e busca textual (`search`) |
| RF-C05 | Atualizar dados do contato | Should | Atualiza nome, e-mail e telefone (normalizando-o se alterado) |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Índice composto de performance no par (company_id, phone) | `backend/src/db/schema.sql:165` | 🟢 |
| Integridade | Restrição UNIQUE na tabela `contacts` | `backend/src/db/schema.sql:90` | 🟢 |

## Critérios de Aceitação

```gherkin
Dado um telefone formatado como "+55 (11) 98888-7777"
Quando a função normalizePhone executa
Então o valor de retorno deve ser "5511988887777"

Dado que não existe nenhum contato com o telefone "5511988887777" na empresa 1
Quando a função findOrCreate é chamada com nome vazio
Então um novo contato é persistido com nome "5511988887777" e phone "5511988887777"

Dado que já existe um contato com o telefone "5511988887777" na empresa 1
Quando a função findOrCreate é chamada com nome "Maria"
Então a função deve retornar o contato existente sem duplicar nem alterar seu nome original
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| `findByPhone` / `findOrCreate` | Must | Indispensável para o fluxo de recebimento de mensagens e funcionamento do chat |
| Normalização de telefone | Must | Garante integridade referencial e evita duplicações |
| `findAll` com busca | Should | Importante para listagem na tela de contatos do painel |
| `update` | Should | Permite ao atendente enriquecer o perfil do contato (adicionar nome real ou e-mail) |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `backend/src/repositories/ContactRepository.js` | `ContactRepository` | 🟢 |
| `backend/src/db/schema.sql` | Tabela `contacts` | 🟢 |
