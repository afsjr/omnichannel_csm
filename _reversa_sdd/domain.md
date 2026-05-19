# Domínio de Negócio — omni-channel

> Nível: **detalhado**

---

## 1. Glossário de Termos de Domínio

### 1.1 Entidades Principais

| Termo | Definição | Confiança |
|-------|-----------|------------|
| **Empresa (Company)** | Organização cliente do sistema SaaS. Cada empresa tem seus próprios usuários, departamentos, contatos e conversas. | 🟢 |
| **Departamento (Department)** | Setor dentro da empresa que recebe triagem de mensagens. Exemplos: Comercial, Financeiro, Secretaria, Acadêmico. | 🟢 |
| **Usuário (User)** | Atendente ou administrador do sistema. Tem role, pertence a uma empresa e opcionalmente a um departamento. | 🟢 |
| **Contato (Contact)** | Cliente/aluno que conversou via WhatsApp. Identificado primariamente pelo telefone normalizado. | 🟢 |
| **Instância (Connection/Instance)** | Conexão com um número de WhatsApp via Evolution API. Uma empresa pode ter múltiplas instâncias. | 🟢 |
| **Conversa (Conversation)** |thread de comunicação entre um contato e a empresa. Pode estar em diferentes estados (pending, queued, in_progress, resolved). | 🟢 |
| **Mensagem (Message)** | Mensagem individual dentro de uma conversa. Tem direção (incoming/outgoing) e status (received/sent/failed). | 🟢 |

### 1.2 Papéis de Usuário

| Termo | Definição | Confiança |
|-------|-----------|------------|
| **Master** | Administrador global com acesso a todas as empresas e todas as funcionalidades. | 🟢 |
| **Admin** | Administrador de uma empresa específica. Acesso total aos dados da sua empresa. | 🟢 |
| **Leader** | Líder de equipe de atendimento. Pode gerenciar membros do seu departamento e ver conversas da equipe. | 🟢 |
| **Agent** | Atendente comum. Pode ver e atender apenas as conversas que lhe foram atribuídas. | 🟢 |

### 1.3 Estados de Conversa

| Termo | Definição | Confiança |
|-------|-----------|------------|
| **pending** | Conversa nova, ainda não triada pela IA. Não atribuída a ninguém. | 🟢 |
| **queued** | Triada pela IA e aguardando atribuído a um atendente. | 🟢 |
| **in_progress** | Em atendimento (atendente assumiu a conversa). | 🟢 |
| **resolved** | Encerrada pelo atendente. | 🟢 |
| **open** | Estado genérico (pode representar qualquer estado ativo). | 🟢 |

### 1.4 Estágios do Funil (Vendas)

| Termo | Definição | Confiança |
|-------|-----------|------------|
| **unclassified** | Não classificado ainda. | 🟢 |
| **new** | Novo lead (primeiro contato). | 🟡 |
| **interested** | Interessado (perguntou sobre preços). | 🟡 |
| **negotiating** | Em negociação (falou em parcelar/desconto). | 🟡 |
| **closed** | Fechado (vai matricular/assinar). | 🟡 |

### 1.5 Termos Técnicos

| Termo | Definição | Confiança |
|-------|-----------|------------|
| **Multi-tenant** | Arquitetura onde uma única instância do software serve múltiplas empresas, com dados isolados. | 🟢 |
| **Evolution API** | API externa que gerencia conexões com WhatsApp Business. | 🟢 |
| **Triagem (Triage)** | Classificação automática de mensagens para o departamento correto via IA. | 🟡 |
| **AI Draft** | Resposta sugerida pela IA baseada no histórico da conversa. | 🟡 |
| **WebSocket** | Canal de comunicação em tempo real entre backend e frontend. | 🟢 |

---

## 2. Regras de Negócio Implícitas

### 2.1 Regras de Triagem

| Regra | Descrição | Origem |
|-------|-----------|--------|
| RN-01 | Se a mensagem não couber em nenhum setor específico, classificar como "Comercial". | `TriageService.js:15` |
| RN-02 | Se houver mais de um setor aplicável, escolher o baseado na necessidade mais urgente. | `TriageService.js:18` |
| RN-03 | Departamentos disponíveis: Comercial, Financeiro, Secretaria, Acadêmico. | `TriageService.js:26` |
| RN-04 | confiança mínima da triagem = 0.3, máxima = 0.95. | `TriageService.js:57-61` |
| RN-05 | Menos tokens na resposta do LLM = maior confiança (resposta mais precisa). | `TriageService.js:60` |

### 2.2 Regras de Funil de Vendas

| Regra | Descrição | Origem |
|-------|-----------|--------|
| RN-06 | Palavras-chave "matricular", "vou" → estágio "closed". | Inferido |
| RN-07 | Palavras-chave "parcelar", "desconto", "negociar" → estágio "negotiating". | Inferido |
| RN-08 | Palavras-chave "quanto", "preço", "valor" → estágio "interested". | Inferido |
| RN-09 | Palavras-chave "interessado", "quero saber" → estágio "new". | Inferido |
| RN-10 | Classificação de funil aplica-se apenas ao departamento "Comercial". | `dashboardController.js:148-157` |

### 2.3 Regras de Atendimento

| Regra | Descrição | Origem |
|-------|-----------|--------|
| RN-11 | Uma conversa é considerada "resolvida" após 24h sem nova mensagem? | 🔴 LACUNA |
| RN-12 | Quando um contato envia mensagem em conversa resolvida, ela é automaticamente "reaberta" (status = pending). | `ChatService.js:27-34` |
| RN-13 | Um atendente só pode responder conversas que lhe foram atribuídas. | `permissions.js:45-49` |
| RN-14 | Um líder pode transferir conversas entre membros da sua equipe. | `permissions.js:48` |
| RN-15 | Um agente pode resolver a conversa que está atendiendo. | `permissions.js:49` |

### 2.4 Regras de Instâncias WhatsApp

| Regra | Descrição | Origem |
|-------|-----------|--------|
| RN-16 | Cada instância tem um nome único dentro da empresa. | `schema.sql:112` (UNIQUE) |
| RN-17 | Uma instância pode estar associada a um departamento específico. | `schema.sql:100` |
| RN-18 | Uma instância pode estar "offline", "connecting" ou "connected". | `instances.js` |
| RN-19 | O QR Code de conexão expira em tempo determinado pela Evolution API. | `instances.js:289` |

### 2.5 Regras de Dados

| Regra | Descrição | Origem |
|-------|-----------|--------|
| RN-20 | Telefones são normalizados (apenas dígitos) antes de salvar no banco. | `ContactRepository.js:113` |
| RN-21 | Cada contato é único por empresa + telefone (não pode ter dois contatos com mesmo telefone na mesma empresa). | `schema.sql:90` (UNIQUE) |
| RN-22 | O schema.sql usa "CREATE TABLE IF NOT EXISTS" e verifica colunas existentes para upgrades. | `schema.sql:19-30` |

---

## 3. Validações e Restrições

### 3.1 Validações de Criação

| Validação | Regra | Confiança |
|-----------|-------|------------|
| V-01 | Para criar instância: company_id, instance_name e phone_number são obrigatórios. | 🟢 |
| V-02 | Para criar usuário: email único no sistema. | 🟢 |
| V-03 | Para criar departamento: nome único por empresa. | 🟢 |
| V-04 | Para criar contato: telefone único por empresa. | 🟢 |

### 3.2 Restrições de Acesso

| Restrição | Regra | Confiança |
|-----------|-------|------------|
| R-01 | Usuários só veem dados da sua empresa (exceto master). | 🟢 |
| R-02 | Agents só veem conversas atribuídas a eles. | 🟢 |
| R-03 | Líderes veem conversas da equipe (departamento). | 🟡 |
| R-04 | Masters acessam todas as empresas. | 🟢 |

---

## 4. Casos de Uso Principais

### 4.1 Fluxo de Chegada de Mensagem

1. WhatsApp → Evolution API → Webhook → Sistema
2. Sistema normaliza telefone, cria/atualiza contato
3. Sistema cria conversa se não existir (ou reabre se resolvida)
4. Sistema processa mensagem
5. IA classifica departamento e gera resposta sugerida
6. Notificação em tempo real para atendentes

### 4.2 Fluxo de Atendimento

1. Atendente visualiza fila do seu departamento
2. Atendente assume conversa (atribuição)
3. Atendente envia mensagens ao contato
4. Atendente optionally usa AI Draft como base
5. Atendente resolve conversa

### 4.3 Fluxo de Gestão de Instâncias

1. Admin cria instância (nome + telefone)
2. Admin solicita conexão (gera QR Code)
3. Atendente escaneia QR Code com WhatsApp
4. Evolution API conecta → webhook notifica
5. Instância的状态 atualiza para "connected"

---

## 5. Contexto de Domínio: Escola Técnica de Enfermagem

O sistema foi desenvolvido para uma **Escola Técnica de Enfermagem**, conforme evidenciado em `TriageService.js:4`:

```
"Você é um assistente de triagem de mensagens de uma escola técnica de enfermagem.
Analise a mensagem do aluno e classifique qual setor deve atender."
```

### Departamentos e suas responsabilidades:

| Departamento | Responsabilidade | Palavras-chave típicas |
|--------------|-------------------|----------------------|
| **Comercial** | Dúvidas sobre cursos, matrículas, preços, prazos | "curso", "matrícula", "valor" |
| **Financeiro** | Pagamentos, boletos, parcelamentos, renegenciação | "boleto", "parcelar", "pagamento" |
| **Secretaria** | Documentos, declarações, históricos, transfers | "declaração", "histórico", "documento" |
| **Acadêmico** | Aulas, provas, certificados, estágios | "certificado", "aula", "prova" |

🟡 INFERIDO — Baseado apenas no prompt de triagem, não confirmado por documentação de negócio.

---

## 6. Gaps e Lacunas de Conhecimento

| Gap | Descrição | Confiança |
|-----|-----------|------------|
| 🔴 | Regra exata de expiração de conversa resolved → arquivada | - |
| 🔴 | Limitação de planos (free/basic/pro) não implementada | - |
| 🔴 | Como funciona o email confirmation de registro | - |
| 🔴 | Quais são as métricas de sucesso do negócio | - |
| 🔴 | Quais são os SLAs de atendimento esperados | - |