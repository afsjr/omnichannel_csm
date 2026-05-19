---
schemaVersion: 1
generatedAt: "2026-05-19T17:26:00Z"
reversa:
  version: "1.2.43"
kind: risk_register
producedBy: strategist
---

# Risk Register

> Riscos identificados para a estratégia de migração escolhida (Branch by Abstraction).

## Riscos

| ID | Risco | Probabilidade | Impacto | Mitigação | Contingência | Owner |
|----|-------|--------------|---------|-----------|--------------|-------|
| R-001 | Abstração de permissions quebrar middleware existente | Baixa | Alto | Testar em staging antes; criar testes de paridade para cada permissão | Rollback da abstraction + investigação | Adelino |
| R-002 | Evolution API mudar contrato durante migração | Baixa | Alto | Manter api/ legado funcionando até a abstraction estar validada | Voltar ao api/ legado | Adelino |
| R-003 | Perda de QR Code de instância durante migração | Média | Alto | Migrar connections table como está, sem recriar instâncias | Backup manual dos QR codes antes | Adelino |
| R-004 | Esquecer de remover rota do api/ após migração | Média | Baixo | Checklist de cutover com verificação de tráfego | Monitorar logs por chamadas ao api/ | Adelino |
| R-005 | Regressão em permissões RBAC | Baixa | Alto | Testar todas as combinações role x permissão antes do cutover | Rollback da abstraction de permissions | Adelino |

## Resumo

- Riscos críticos: 0
- Riscos altos: 3 (R-001, R-002, R-005)
- Riscos médios: 2 (R-003, R-004)
- Riscos baixos: 0