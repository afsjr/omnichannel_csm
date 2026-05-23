# Deploy do OmniChat CSM

## Opção 1: Docker (recomendado)

Container único que serve backend API + frontend estático.

```bash
# Build da imagem
docker build -t omnichat-csm .

# Rodar local
docker run -d -p 3000:3000 \
  -e SUPABASE_URL=... \
  -e SUPABASE_SERVICE_KEY=... \
  -e JWT_SECRET=... \
  -e EVOLUTION_API_URL=... \
  -e EVOLUTION_API_KEY=... \
  -e EVOLUTION_INSTANCE=... \
  -e GROQ_API_KEY=... \
  -e LLM_MODEL=llama3-70b-8192 \
  -e INTERNAL_API_KEY=... \
  --name omnichat omnichat-csm
```

### Deploy em cloud

**Railway** (recomendado):
1. Conecte o repositório GitHub
2. Railway detecta o `Dockerfile` automaticamente
3. Adicione as env vars no painel
4. Deploy automático em cada push

**Render**:
1. Novo Web Service → `Docker`
2. Aponte para o repositório
3. Adicione as env vars
4. Deploy

**Fly.io**:
```bash
fly launch --dockerfile Dockerfile
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_KEY=...
fly deploy
```

## Opção 2: Vercel + Backend separado (atual)

Se quiser manter o frontend no Vercel e backend num serviço separado:

1. Faça deploy do backend via Docker (Opção 1) num serviço como Railway
2. Obtenha a URL do backend (ex: `https://omnichat-api.up.railway.app`)
3. Configure as env vars no Vercel:
   ```
   VITE_API_URL=https://omnichat-api.up.railway.app
   ```
4. Refaça o deploy do frontend no Vercel

## Variáveis de ambiente obrigatórias

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key do Supabase |
| `JWT_SECRET` | Chave para assinar tokens JWT |
| `EVOLUTION_API_URL` | URL da Evolution API |
| `EVOLUTION_API_KEY` | API Key da Evolution |
| `EVOLUTION_INSTANCE` | Nome da instância Evolution |

## Variáveis opcionais

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta do servidor |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Origens CORS permitidas |
| `INTERNAL_API_KEY` | `omnichat-secret-key-change-me` | Chave da API externa (`/api/send-message`) |
| `GROQ_API_KEY` | - | Chave da Groq para sugestão de IA |
| `LLM_MODEL` | `llama3-70b-8192` | Modelo LLM |
| `FRONTEND_DIST` | `./frontend/dist` | Caminho para o build do frontend |
