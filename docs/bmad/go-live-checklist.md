# BMAD - Go Live Checklist (Producao)

Status:
- [ ] Pendente
- [~] Em andamento
- [x] Concluido

## B - Business
- [ ] ICP definido e documentado
- [ ] Modelo de preco e limites free definidos
- [ ] Metas de 90 dias definidas

## M - Market
- [ ] Posicionamento e proposta de valor final
- [ ] Canal principal de aquisicao validado
- [ ] Riscos de dependencia de canal mapeados

## A - Architecture
- [x] Arquitetura cloud definida (Vercel + Postgres gerenciado)
- [x] Endpoints serverless implementados
- [~] Realtime MVP por polling
- [ ] Indices de banco aplicados para consultas principais
- [ ] Segredo de webhook validando origem
- [ ] Rate limit aplicado em endpoints publicos

## D - Delivery
- [ ] Pipeline CI com lint/testes/build
- [ ] Ambiente de homologacao funcional
- [ ] Procedimento de rollback definido
- [ ] Checklist de deploy operacional documentado

## LGPD + Seguranca
- [ ] Base legal e finalidade por dado documentadas
- [ ] Politica de privacidade e termos publicados
- [ ] Isolamento por empresa validado em todas as rotas
- [ ] Logs de auditoria ativos
- [ ] Politica de retencao/descarte definida
- [ ] Processo de direitos do titular definido
- [ ] Plano de resposta a incidente validado

## Gate final (Go/No-Go)
Liberar producao apenas quando:
1. Todos os itens de seguranca/LGPD obrigatorios estiverem `[x]`.
2. Itens criticos de arquitetura e entrega estiverem `[x]`.
3. Riscos residuais estiverem registrados com mitigacao e responsavel.
