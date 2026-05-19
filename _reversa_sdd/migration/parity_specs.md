---
schemaVersion: 1
generatedAt: "2026-05-19T17:35:00Z"
reversa:
  version: "1.2.43"
kind: parity_specs
producedBy: inspector
hash: "sha256:0"
---

# Parity Specs

> Estratégia de validação de equivalência comportamental entre legado (`api/instances.js`, `lib/permissions.js`) e sistema novo (`backend/` — InstanceService, InstanceRepository, Permissions Middleware).

## Estratégia geral
- **Modos de validação aplicáveis**:
  - [ ] Shadow mode
  - [x] Characterization tests (suíte derivada do comportamento atual do legado)
  - [x] Contract tests (interfaces externas: Evolution API)
  - [x] Data parity (snapshots da tabela `connections`)
- **Justificativa**: Paradigma idêntico (OO com DI), mesmo banco, mesmo framework. A validação é puramente funcional — garantir que os novos endpoints retornam os mesmos dados que o api/ legado retornava.

## Critérios de "paridade aceita"
- **Métrica primária**: 100% dos cenários de characterization passam com mesma saída para mesma entrada
- **Janela de observação**: Validação pré-cutover (antes de desligar api/)
- **Critério de bloqueio**: Qualquer cenário @critico falhando bloqueia o cutover

## Cobertura adaptada ao paradigma

### Sem mudança de paradigma
Equivalência funcional padrão: mesma entrada → mesma saída → mesmo efeito colateral observável (tabela `connections`). Não há dimensões adicionais de paridade porque não há mudança de paradigma (OO com DI → OO com DI).

## Tipos de teste a aplicar
- **Funcionais**: Teste de API (mesma request → mesma response + mesmo estado no DB)
- **Contrato**: Teste de integração com Evolution API (connect/disconnect)
- **Carga / performance**: N/A (sem mudança de banco ou framework)
- **Resiliência**: N/A (sem mudança de arquitetura)

## Reuso de characterization_specs do time de descoberta
- **Origem**: `_reversa_sdd/code-analysis.md` § 2.9 (Instances) + `lib/permissions.js`
- **Adaptações necessárias**: Os endpoints do api/ legado são substituídos por controllers Fastify no backend/. As rotas e assinaturas mudam, mas a lógica de negócio e os dados são idênticos.

## Saídas
- `parity_tests/01-instances-crud.feature` — CRUD de instâncias
- `parity_tests/02-instances-connect.feature` — Conexão/desconexão WhatsApp
- `parity_tests/03-permissions-rbac.feature` — Permissões RBAC

## Notas
- O Screen Translator está em modo `skipped` (legado sem UI). Nenhuma paridade visual é necessária.
- Ambos os sistemas (legado e novo) usam o mesmo banco Supabase. A data parity é simples: comparar a tabela `connections` antes e depois do cutover.
