# Dashboard

> Módulo de métricas e estatísticas do OmniChat CSM.

## Visão Geral

Responsável por fornecer métricas de desempenho, estatísticas de conversas, análise por departamento, agentes e funil de vendas. Agrega dados para painéis de gestão.

## Responsabilidades

- Métricas gerais: total, abertas, na fila, resolvidas hoje, agentes online
- Tempo médio de resposta
- Estatísticas por departamento
- Estatísticas por status
- Estatísticas por período (dia, semana, mês)
- Estatísticas por agente
- Funil de vendas (Comercial)

## Regras de Negócio

- RN-D01: Métricas isoladas por company_id 🟢
- RN-D02: Status counting inclui open, pending, in_progress, queued 🟢
- RN-D03: Resolvedtoday usa DATE(last_message_at) = CURRENT_DATE 🟢
- RN-D04: Funil aplica apenas para departamento Comercial 🟡

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-D01 | GET /dashboard/stats | Must | Retorna métricas gerais |
| RF-D02 | GET /dashboard/activity | Must | Retorna atividade recente |
| RF-D03 | GET /dashboard/full | Must | Retorna stats completos por período |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Queries agregadas no DB | `dashboardController.js:8` Promise.all | 🟢 |
| Performance | Limite default 20 para activity | `dashboardController.js:86` | 🟢 |
| Segurança | company_id do token JWT | `req.query.companyId` sem validação? | 🔴 |

## Critérios de Aceitação

```gherkin
Dado company_id válido
Quando chama GET /dashboard/stats
Então retorna { total, open, queued, resolvedToday, onlineAgents, avgResponseSeconds, byDepartment, byStatus }

Dado company_id e limit
Quando chama GET /dashboard/activity
Then retorna últimas N mensagens com contact info

Dado company_id
Quando chama GET /dashboard/full
Then retorna { period: { today, week, month }, byDepartment, byAgent, funnel }
```

## Rastreabilidade de Código

| Arquivo | Função | Cobertura |
|---------|--------|-----------|
| `backend/src/controllers/dashboardController.js` | getStats, getRecentActivity, getDashboardStats | 🟢 |

---

## Lacunas Identificadas

| Item | Confiança | Descrição |
|------|-----------|------------|
| 🔴 | company_id não validado via JWT | Pode haver acesso indevido |
| 🔴 | Sem paginação em byDepartment/byAgent | Pode ficar grande |
| 🔴 | avgResponseTime calcula incorretamente | JOIN incremental pode falhar |