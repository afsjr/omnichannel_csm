# Design — Módulo Instâncias

## Endpoints (API Legada)

| Método | Path | Função |
|--------|------|--------|
| GET | /api/instances | listInstances |
| POST | /api/instances | createInstance |
| GET | /api/instances/:id | getInstance |
| PUT | /api/instances/:id | updateInstance |
| DELETE | /api/instances/:id | deleteInstance |
| POST | /api/instances/:id/connect | connectInstance |
| POST | /api/instances/:id/disconnect | disconnectInstance |

## Fluxo de Conexão

```
POST /instances/:id/connect
       │
       ▼
Buscar instance + company
       │
       ▼
Chamar Evolution API: POST /instance/connect/{instance_name}
       │
       ▼
Atualizar status = 'connecting'
Salvar qr_code + qr_code_expires
       │
       ▼
Retornar { status, qr_code, qr_code_expires }
```

---

🟢 CONFIRMADO — Extraído de api/instances.js