# ADR-003: Sistema de Triagem Automática com IA

## Status
Aceito

## Contexto
Uma escola técnica recebe mensagens de alunos sobre diferentes assuntos (financeiro, comercial, secretaria, acadêmico). Precisa classificar automaticamente para o departamento correto.

## Decisão
Implementar sistema de IA com:
1. **TriageService** — Classifica mensagem para departamento via LLM
2. **FunnelClassificationService** — Classifica lead em estágio do funil (new/interested/negotiating/closed)
3. **AIDraftService** — Gera resposta sugerida baseada no histórico

JobQueue assíncrono para processar múltiplas tarefas de IA em paralelo.

## Consequências

### Positivas
- ✅ Classificação automática reduz tempo de resposta
- ✅ Múltiplos departamentos suportados
- ✅ Funil de vendas para acompanhamento comercial
- ✅ Respostas sugeridas加速am atendimento

### Negativas
- ❌ Dependência de provedor LLM externo
- ❌ Custo por requisição de IA
- ❌ Confiança variável (0.3 a 0.95)
- ❌ Classificação nem sempre precisa

---

## Alternativas Considered

1. **Classificação por palavras-chave** — Rejeitada (muito simples, não escala)
2. **Classificação manual** — Rejeitada (não escala)

---

## Referências
- Arquivos: `backend/src/services/TriageService.js`, `FunnelClassificationService.js`, `AIDraftService.js`
- Prompt de triagem: `TriageService.js:4-18`

---

## Confiança
🟡 INFERIDO — Sistema implementado mas não verificado em produção