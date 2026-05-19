---
schemaVersion: 1
generatedAt: "2026-05-19T17:33:00Z"
reversa:
  version: "1.2.43"
kind: data_migration_plan
producedBy: designer
hash: "sha256:0"
---

# Data Migration Plan

> Plano de migração de dados. Como o legado e o alvo compartilham o mesmo banco (Supabase PostgreSQL), a migração de dados é mínima — apenas schema evolution.

## Resumo

- **Volume estimado**: Baixo (SaaS multi-tenant em estágio inicial)
- **Janela de migração**: Não se aplica (mesmo banco, sem transferência de dados)
- **Estratégia**: Schema evolution — adicionar tabela `sessions` (já feito), sem migração de dados em massa

## Mapeamento legado → novo

| Origem | Destino | Tipo | Notas |
|---|---|---|---|
| connections (api/ legado) | connections (backend/) | mesmo banco | Nenhuma transformação; ambos usam a mesma tabela |
| (inexistente) | sessions | nova | Já implementada no schema.sql |
| lib/permissions.js | middleware | não-dados | Código, não dados |

## Transformações

Nenhuma transformação de dados é necessária. O backend/ e o api/ legado já compartilham o mesmo schema PostgreSQL. A tabela `connections` é a mesma. A migração é puramente de código.

## Estratégia de ETL

- **Ferramenta**: N/A (mesmo banco)
- **Fluxo**: N/A
- **Idempotência**: N/A

## Backfill e delta

N/A — não há transferência de dados entre bancos.

## Cutover de dados

- **Janela**: Não se aplica (dados já estão no lugar certo)
- **Sequência de corte**:
  1. Criar `InstanceRepository` → opera na mesma tabela `connections`
  2. Criar `InstanceService` → opera na mesma tabela `connections`
  3. Desligar `api/instances.js` → nenhum dado é movido
- **Verificação pós-corte**:
  - **Contagens**: SELECT COUNT(*) FROM connections antes e depois do cutover (deve ser idêntico)
  - **Integridade**: verificar que todas as connections ainda têm seus QR codes e status intactos

## Validação de qualidade

| Métrica | Alvo | Fonte de medição |
|---|---|---|
| Contagem de connections | igual | SELECT COUNT(*) antes/depois |
| QR codes preservados | igual | Amostragem manual |
| Instâncias connected | mesmo status | SELECT status FROM connections antes/depois |

## Riscos específicos de dados

- **R-003** (risk_register.md): Perda de QR Code → backup manual antes do cutover

## Notas

Diferentemente de migrações típicas (banco A → banco B), aqui o legado e o alvo compartilham o mesmo Supabase. A "migração de dados" se resume a garantir que o novo código (InstanceRepository + InstanceService) opere corretamente sobre os dados existentes.
