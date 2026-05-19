# Instâncias WhatsApp

> Módulo de gestão de instâncias Evolution API (legado).

## Visão Geral

Responsável por gerenciar múltiplas instâncias/conexões WhatsApp por empresa. Cada instância representa um número de WhatsApp conectado via Evolution API. API legada em `api/instances.js`.

## Responsabilidades

- CRUD de instâncias (tabela connections)
- Conexão (geração QR Code) via Evolution API
- Desconexão de instâncias
- Associação a departamentos

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-IN01 | GET /api/instances | Must | Lista instâncias por company_id |
| RF-IN02 | POST /api/instances | Must | Cria instância |
| RF-IN03 | GET /api/instances/:id | Must | Detalhes |
| RF-IN04 | PUT /api/instances/:id | Must | Atualiza |
| RF-IN05 | DELETE /api/instances/:id | Must | Remove |
| RF-IN06 | POST /api/instances/:id/connect | Must | Gera QR Code |
| RF-IN07 | POST /api/instances/:id/disconnect | Must | Desconecta |

## Regras de Negócio

- RN-IN01: company_id, instance_name, phone_number obrigatórios na criação 🟢
- RN-IN02: Status inicial = offline 🟢
- RN-IN03: Status ao conectar = connecting + qr_code 🟢

## Tabela

`connections` com campos:
- company_id, instance_name, phone_number
- department_id, status, qr_code, qr_code_expires
- settings (JSON), api_url, api_key

## Permissões (lib/permissions.js)

- instances:create — master, admin
- instances:read — master, admin, leader
- instances:update — master, admin
- instances:delete — master, admin
- instances:connect — master, admin

---

## Lacunas

| Item | Confiança | Descrição |
|------|-----------|------------|
| 🔴 | API legada (não migrada para Fastify) | Duplicação de código |
| 🔴 | Sem validação de company_id | Pode haver acesso indevido |
| 🔴 | Sem verificação de permission | Não usa middleware |