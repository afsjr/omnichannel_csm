# ADR-005: Schema SQL com Suporte a Upgrades

## Status
Aceito

## Contexto
O schema.sql precisa funcionar tanto em primeira instalação quanto em upgrades de versões anteriores (sem perder dados).

## Decisão
Usar padrões SQL "upsert-friendly":
- `CREATE TABLE IF NOT EXISTS` — Não falha se tabela existir
- `DO $$` com verificações em `information_schema` — Adiciona colunas apenas se não existirem
- `ON CONFLICT DO NOTHING` em seeds — Não sobrescreve dados existentes
- `UPDATE ... ON CONFLICT` — Atualiza se conflito (upsert)

Exemplo do schema.sql:
```sql
CREATE TABLE IF NOT EXISTS companies (...);

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'document') THEN
    ALTER TABLE companies ADD COLUMN document TEXT;
  END IF;
END $$;

INSERT INTO companies (name) VALUES ('Escola Técnica CSM') 
ON CONFLICT DO NOTHING;
```

## Consequências

### Positivas
- ✅ Pode ser rodado múltiplas vezes sem erros
- ✅ Dados existentes preservados
- ✅ Adiciona colunas automaticamente em upgrades
- ✅ Seeds não duplicam dados

### Negativas
- ❌ Não remove colunas deprecated
- ❌ Não renomeia tabelas/colunas
- ❌ Migrações complexas precisam de script separado

---

## Alternativas Considered

1. **Ferramenta de migração (knex, typeorm)** — Adiado, simplicidade primeiro
2. **Versionamento de schema** — Planejado para futuro

---

## Referências
- Commit: `e5329a1 fix: update schema.sql to handle existing tables gracefully`
- Arquivo: `backend/src/db/schema.sql:19-30`, `172-191`