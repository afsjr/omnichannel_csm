const LLMProvider = require('../providers/LLMProvider');
const FunnelClassificationService = require('./FunnelClassificationService');

const DEPARTMENT_PROMPT = `Você é um assistente de triagem de mensagens de uma escola técnica de enfermagem. Analise a mensagem do aluno e classifique qual setor deve atender.

SETORES DISPONÍVEIS:
- Comercial: dúvidas sobre cursos, matrículas, preços, prazos, informações gerais de vendas
- Financeiro: questões sobre pagamentos, boletos, parcelamentos, renegciação, valores em atraso
- Secretaria: atendimentos administrativos, documentos, declarações, históricos, transfers
- Acadêmico: dúvidas sobre aulas, provas, certificados, estágios, convênios hospitalares

INSTRUÇÕES:
1. Leia atentamente a mensagem
2. Classifique para o setor mais adequado
3. Se a mensagem não couber em nenhum setor específico, classifique como "Comercial"
4. Retorne APENAS o nome do setor (Comercial, Financeiro, Secretaria ou Acadêmico)

Se houver mais de um setor applicable, escolha o principal baseado na necessidade mais urgente.`;

class TriageService {
  constructor({ llmProvider, conversationRepository, messageRepository, departmentRepository }) {
    this.llmProvider = llmProvider || new LLMProvider();
    this.conversationRepository = conversationRepository;
    this.messageRepository = messageRepository;
    this.departmentRepository = departmentRepository;
    this.departments = ['Comercial', 'Financeiro', 'Secretaria', 'Acadêmico'];
    this.funnelService = new FunnelClassificationService();
  }

  async triage(conversationId) {
    const messagesResult = await this.messageRepository.getConversationHistory(conversationId, 10);
    const messages = messagesResult.rows.map(m => ({
      sender: m.sender_type,
      content: m.content,
      time: m.created_at
    }));

    if (messages.length === 0) {
      throw new Error('No messages found for triage');
    }

    const conversationHistory = messages
      .map(m => `${m.sender === 'user' ? 'Atendente' : 'Aluno'} (${m.time}): ${m.content}`)
      .join('\n');

    const lastMessage = messages[messages.length - 1].content;

    const result = await this.llmProvider.classify(
      conversationHistory,
      this.departments,
      DEPARTMENT_PROMPT
    );

    const classifiedDepartment = this.parseDepartment(result.content);
    const departmentResult = await this.findDepartmentByName(classifiedDepartment);

    let confidence = 0.5;
    if (result.usage) {
      const totalTokens = result.usage.total_tokens || 1;
      confidence = Math.min(0.95, 0.3 + (1 - totalTokens / 1000) * 0.3);
    }

    const funnelResult = this.funnelService.classifyFromMessage(lastMessage, classifiedDepartment);

    await this.conversationRepository.update(conversationId, {
      departmentId: departmentResult?.id || null,
      status: departmentResult ? 'queued' : 'pending',
      aiConfidence: confidence,
      funnelStage: funnelResult?.stage || 'unclassified'
    });

    return {
      conversationId,
      department: classifiedDepartment,
      departmentId: departmentResult?.id || null,
      confidence,
      funnel: funnelResult,
      rawResponse: result.content
    };
  }

  parseDepartment(response) {
    const cleaned = response.trim();
    for (const dept of this.departments) {
      if (cleaned.toLowerCase().includes(dept.toLowerCase())) {
        return dept;
      }
    }
    return 'Comercial';
  }

  async findDepartmentByName(name) {
    if (!this.departmentRepository) return null;
    const result = await this.departmentRepository.findByName(name);
    return result.rows[0] || null;
  }
}

module.exports = TriageService;