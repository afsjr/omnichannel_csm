---
schemaVersion: 1
generatedAt: "2026-05-19T17:25:00Z"
reversa:
  version: "1.2.43"
kind: migration_strategy
producedBy: strategist
---

# Migration Strategy

> Estratégias de migração avaliadas com trade-offs explícitos.

## Estratégias avaliadas

### Estratégia A: Branch by Abstraction
- **Descrição**: Criar abstrações (repositories/services) no backend/ para as funcionalidades ainda no api/ legado (instances, permissions). Uma vez plugadas no DI container, o código legado é desligado.
- **Quando aplica**: Migração interna (mesma stack, mesmo paradigma); apetite conservador.
- **Custo**: baixo. **Risco**: baixo. **Tempo**: curto (~2-3 dias).
- **Adequação ao apetite derivado** (conservative): ✅ Ideal — sem interrupção, sem mudança de paradigma.
- **Trade-offs**:
  - Prós: Zero downtime, risco mínimo, reusa DI existente, testável isoladamente
  - Contras: Requer disciplina para não criar abstrações desnecessárias

### Estratégia B: Strangler Fig
- **Descrição**: Roteador no proxy que redireciona chamadas para o novo backend gradualmente, mantendo o api/ legado vivo até tudo ser substituído.
- **Quando aplica**: Sistema em produção com roteamento disponível.
- **Custo**: médio. **Risco**: baixo. **Tempo**: médio.
- **Adequação ao apetite derivado** (conservative): ✅ Funciona, mas complexo demais para o que resta migrar.
- **Trade-offs**:
  - Prós: Migração invisível para o usuário
  - Contras: Overhead de roteamento, 2 sistemas rodando em paralelo, custo de manter legado vivo

### Estratégia C: Big Bang
- **Descrição**: Migrar tudo de uma vez, desligar api/ e ativar backend/ completo.
- **Custo**: baixo. **Risco**: alto. **Tempo**: curto.
- **Adequação ao apetite derivado** (conservative): ❌ Risco desnecessário.
- **Trade-offs**:
  - Prós: Mais rápido
  - Contras: Rollback complexo, sem validação incremental, risco de regressão

## Comparativo

| Critério | A (Branch by Abstraction) | B (Strangler Fig) | C (Big Bang) |
|---|---|---|---|
| Custo | Baixo | Médio | Baixo |
| Risco | Baixo | Baixo | Alto |
| Tempo | Curto | Médio | Curto |
| Aderência ao apetite | ✅ Excelente | ✅ Boa | ❌ Ruim |
| Compatibilidade com mudança de paradigma | ✅ N/A (sem mudança) | ✅ N/A | ⚠️ Risco |

## Recomendação do Strategist
- **Estratégia recomendada**: A — Branch by Abstraction
- **Justificativa**: O apetite é conservador, o gap de paradigma é zero, e ~90% do backend já está migrado. Criar abstrações para os 2 módulos restantes (instances, permissions) e plugar no DI container existente é a abordagem mais simples, barata e segura.

## Sinais de alerta específicos
- Nenhum. A migração é de baixa complexidade.

## Decisão humana
- **Estratégia escolhida**: A — Branch by Abstraction
- **Quem decidiu**: Adelino
- **Quando**: "2026-05-19T17:25:00Z"
- **Justificativa do decisor**: Concordou com a recomendação.