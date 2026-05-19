# ADR-001: Sistema de Múltiplas Instâncias WhatsApp por Empresa

## Status
Aceito

## Contexto
O sistema precisa suportar múltiplos números de WhatsApp por empresa. Cada número (instância) deve ser independente, poder ser conectado/desconectado separadamente e estar associado a um departamento específico.

## Decisão
Utilizar a Evolution API como provedor de WhatsApp Business e implementar a tabela `connections` com os campos:
- `instance_name` (único por empresa)
- `phone_number`
- `status` (offline/connecting/connected)
- `qr_code` e `qr_code_expires` para o processo de conexão

Cada empresa pode ter múltiplas instâncias, cada uma com seu próprio QR Code de conexão.

## Consequências

### Positivas
- ✅ Múltiplos números por empresa (ex: comercial, financeiro)
- ✅ Processo de conexão visual via QR Code
- ✅ Status em tempo real da instância
- ✅ Associação de instância a departamento

### Negativas
- ❌ Dependência externa (Evolution API)
- ❌ Complexidade adicional no gerenciamento de instâncias
- ❌ QR Code expira (precisa reconectar periodicamente)

---

## Alternativas Consideradas

1. **WhatsApp Web API direta** — Rejeitada por violar termos de uso
2. **Multiple providers** — Adiado para futuro (simplicidade primeiro)

---

## Referências
- Commit: `2df2188 feat: add roles system and multi-instance support`
- Arquivos: `api/instances.js`, `schema.sql:97-113`