# Setup 100% Cloud (Vercel)

## Objetivo
Rodar o projeto com computador desligado, com backend, frontend e webhook em nuvem.

## Arquitetura
- Frontend: Vercel
- API: Vercel Functions (`/api`)
- Banco: PostgreSQL gerenciado (Neon free no inicio)
- WhatsApp: Evolution API enviando webhook para URL publica da Vercel

## Variaveis de ambiente (Vercel)
- `DATABASE_URL`
- `EVOLUTION_SEND_URL`
- `EVOLUTION_API_KEY`

## Endpoints
- `POST /api/webhook`: recebe mensagens da Evolution e grava no banco
- `POST /api/send`: envia mensagem para Evolution e grava saida
- `GET /api/messages?company_id=1&limit=50`: lista mensagens

## Passos de deploy
1. Criar projeto no Neon e database Postgres.
2. Executar [backend/src/db/schema.sql](/Users/itouch/Documents/projetos_escola/omnichannel_csm/backend/src/db/schema.sql) no banco.
3. Configurar variaveis no projeto da Vercel.
4. Publicar repositorio na Vercel.
5. Configurar webhook da Evolution para:
   - `https://SEU_DOMINIO.vercel.app/api/webhook`

## Neon free (checklist rapido)
1. Em Neon, criar projeto na regiao mais proxima dos usuarios.
2. Copiar a connection string `DATABASE_URL` (pooled, quando disponivel).
3. Salvar `DATABASE_URL` na Vercel (Production e Preview).
4. Rodar o schema SQL no editor do Neon.
5. Validar endpoint `GET /api/messages?company_id=1`.

Explicacao tecnica:
Usar connection string pooled ajuda em ambiente serverless, pois evita saturar conexoes quando funcoes escalam em paralelo.

## Realtime na Vercel
Socket.io persistente nao e o caminho ideal em serverless. No MVP cloud:
- usar polling curto no frontend (5s)
- evoluir depois para WebSocket dedicado ou Supabase Realtime
