# Inteligência Artificial

> Módulo de IA do OmniChat CSM para triagem automática e geração de respostas.

## Visão Geral

Responsável por classificar mensagens por departamento usando LLM, gerar drafts de resposta automáticos, classificar estágio do funil de vendas, e processar tudo de forma assíncrona via JobQueue.

## Responsabilidades

- Triagem automática de mensagens por departamento (Comercial, Financeiro, Secretaria, Acadêmico)
- Geração de drafts de resposta com IA
- Classificação de estágio do funil de vendas
- Processamento assíncrono via JobQueue
- Emissão de eventos em tempo real via WebSocket

## Regras de Negócio

- RN-AI01: Classificação de departamento baseada em LLM 🟢
- RN-AI02: Departments fixos: Comercial, Financeiro, Secretaria, Acadêmico 🟢
- RN-AI03: fallback para Comercial se classificação ambígua 🟢
- RN-AI04: Funil aplica apenas para Comercial 🟡
- RN-AI05: Confiança calculada baseada em tokens utilizados 🟡

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-AI01 | Triagem por departamento via LLM | Must | Retorna department + confidence |
| RF-AI02 | Geração de draft de resposta | Must | Gera texto de resposta sugerido |
| RF-AI03 | Classificação de funil | Must | Retorna stage + confidence |
| RF-AI04 | Processamento assíncrono | Must | JobQueue processa em background |
| RF-AI05 | Notificação WebSocket | Must | Emite evento ai_complete |
| RF-AI06 | Persistência de resultado | Must | Salva departmentId na conversation |
| RF-AI07 | Endpoint REST triagem | Must | POST /ai/triage retorna resultado |
| RF-AI08 | Endpoint REST processamento completo | Must | POST /ai/process executa triagem+draft |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Processamento assíncrono | `AIService.js:5-68` JobQueue | 🟢 |
| Performance | Limite de 10 mensagens para contexto | `TriageService.js:31` | 🟢 |
| Escalabilidade | Jobs com retry (max 3) | `AIService.js:50` | 🟢 |
| Confiabilidade | Tratamento de erros com retry | `AIService.js:47-55` | 🟢 |

## Critérios de Aceitação

```gherkin
Dado conversa com mensagens
Quando chama POST /ai/triage
Então retorna department + confidence

Dado conversa classificada como Comercial
Quando chama POST /ai/process
Então retorna triagem + draft + estágio funil

Dado processamento concluído
Quando emite evento WebSocket
Então clients em conversation:X recebem ai_complete
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Triagem LLM | Must | Funcionalidade core |
| Draft geração | Must | Automação principal |
| Funil classificação | Should | Enhances Comercial |
| JobQueue async | Must | Escalabilidade |
| WebSocket emit | Should | UX tempo real |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `backend/src/controllers/aiController.js` | processWithAI, triageOnly, generateDraftOnly | 🟢 |
| `backend/src/services/AIService.js` | JobQueue, AIProcessingService, createAIServiceContainer | 🟢 |
| `backend/src/services/TriageService.js` | triage(), parseDepartment() | 🟢 |
| `backend/src/services/AIDraftService.js` | generateDraft() | 🟢 |
| `backend/src/services/FunnelClassificationService.js` | classifyFromMessage() | 🟢 |
| `backend/src/providers/LLMProvider.js` | classify() | 🟢 |

---

## Lacunas Identificadas

| Item | Confiança | Descrição |
|------|-----------|------------|
| 🔴 | Fallback hardcoded para Comercial | Poderia usar configuração |
| 🔴 | Prompt de triagem hardcoded | Sem dinamismo por tenant |
| 🔴 | Sem rate limiting para chamadas LLM | Custo pode escalar |
| 🔴 | Sem cache de resultados | same mensagem reprocessada |