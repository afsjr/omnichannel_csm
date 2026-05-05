# BMAD - LGPD e Seguranca

## Base legal e finalidade
Definir para cada dado:
- qual dado e coletado
- para qual finalidade
- qual base legal sustenta o tratamento

## Principios tecnicos aplicados
- Minimizacao: coletar somente o necessario.
- Necessidade: evitar retenao excessiva.
- Seguranca: protecao contra acesso nao autorizado.

## Controles obrigatorios antes de producao
1. Autenticacao segura (senha com hash forte, sessao protegida).
2. Autorizacao por tenant (`company_id`) em todas as consultas.
3. Logs de auditoria para acoes sensiveis.
4. Criptografia em transito (TLS) e segredo em ambiente seguro.
5. Processo para atender solicitacoes do titular.
6. Politica de retencao e descarte.

Explicacao tecnica:
LGPD nao e apenas documento juridico. Sem controles implementados no software (auth, autorizacao, auditoria, retencao), ha risco legal e tecnico.

## Incidentes
- Procedimento:
  - detectar
  - conter
  - analisar impacto
  - notificar quando aplicavel
  - registrar acoes corretivas

## Operadores e contratos
Manter relacao de operadores (Vercel, banco, provedores de API) e contratos/DPA atualizados.
