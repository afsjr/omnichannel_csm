# BMAD - Architecture

## Arquitetura alvo (MVP cloud)
- Frontend: Vercel
- API: Vercel Functions (`/api`)
- Banco: PostgreSQL gerenciado (Neon ou Supabase)
- Canal inicial: Evolution API (webhook + envio)

## Decisoes tecnicas principais
1. Multi-tenant por `company_id` em tabelas de dominio.
2. Backend stateless em funcoes serverless.
3. Realtime inicial por polling curto (5s) no frontend.

Explicacao tecnica:
Serverless e eficiente para custo inicial e operacao simples. Websocket persistente em serverless costuma exigir servico dedicado; por isso polling curto e um compromisso de MVP.

## Evolucao prevista de realtime
- Fase 1: polling (atual)
- Fase 2: Supabase Realtime ou broker websocket dedicado

## Banco e modelagem
- Tabelas base: companies, users, contacts, conversations, messages.
- Indices necessarios para escala:
  - `messages(conversation_id, created_at desc)`
  - `conversations(company_id, status)`
  - `contacts(company_id, phone)`

Explicacao tecnica:
Sem indices nos campos de filtro e ordenacao, a latencia cresce rapido com volume. Esses indices cobrem as consultas mais frequentes do produto.

## Seguranca de arquitetura (obrigatorio)
- Validacao de payload de entrada.
- Segredo de webhook para autenticar origem.
- Rate limit por IP e por empresa.
- Segregacao de dados por tenant em toda query.
