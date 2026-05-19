# Design — Módulo Dashboard

## Arquitetura

O dashboard é um Controller com três endpoints que executam queries SQL diretas no banco de dados.

## Endpoints

### GET /dashboard/stats
Retorna métricas gerais:
- `total`: total de conversas
- `open`: conversas abertas (status IN 'open','pending','in_progress','queued')
- `queued`: conversas na fila (status = 'pending')
- `resolvedToday`: resolvidas hoje
- `onlineAgents`: usuários com is_online = true
- `avgResponseSeconds`: média de tempo entre mensagens
- `byDepartment`: contagem por departamento
- `byStatus`: contagem por status

### GET /dashboard/activity
Retorna atividade recente de mensagens com info de contato.

### GET /dashboard/full
Retorna dashboard completo com:
- `period.today`: { active, resolved }
- `period.week`: { active, resolved }
- `period.month`: { active, resolved }
- `byDepartment`: estatísticas por dept
- `byAgent`: estatísticas por agente (exceto admin)
- `funnel`: contagem por estágio funil (apenas Comercial)

## Queries SQL

Todas as queries usam:
- `company_id` como filtro principal
- `CURRENT_DATE` para comparações de dia
- `DATE_TRUNC()` para semana/mês
- `FILTER (WHERE ...)` para agregação condicional

## Dependências

- ConversationRepository
- MessageRepository
- UserRepository
- Database (db)

---

🟢 CONFIRMADO — Extraído do código fonte