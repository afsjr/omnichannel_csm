# BMAD - Delivery

## Fluxo de entrega
1. Desenvolvimento em branch por feature.
2. Pull Request com checklist tecnico.
3. Validacoes automatizadas minimas.
4. Deploy em ambiente de homologacao.
5. Go/No-Go para producao.

## Padrao minimo de qualidade
- Lint e testes de rota critica.
- Validacao de migracao de banco antes do deploy.
- Revisao de seguranca em endpoints publicos.

Explicacao tecnica:
Grande parte de incidentes em SaaS inicial vem de deploy sem gate: migracao quebrada, variavel faltando, endpoint sem validacao. O gate reduz regressao operacional.

## Pipeline recomendado
- CI:
  - instalar dependencias
  - rodar lint/testes
  - validar build frontend
- CD:
  - deploy automatico em homologacao
  - deploy em producao apos aprovacao

## Rollback
- Aplicacao: rollback de deploy na Vercel.
- Banco: migrations forward-only + plano de contingencia.

Explicacao tecnica:
Rollback de schema nem sempre e seguro. Em banco, e melhor desenhar migration com compatibilidade progressiva e plano de reversao controlada.
