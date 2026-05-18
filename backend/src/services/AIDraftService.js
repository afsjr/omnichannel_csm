const LLMProvider = require('../providers/LLMProvider');

const DRAFT_PROMPT_BASE = `Você é um assistente de atendimento de uma escola técnica de enfermagem. Com base no histórico da conversa e no contexto do setor, gere uma sugestão de resposta para o atendente enviar ao aluno.

INSTRUÇÕES:
1. Analise o histórico completo da conversa
2. Considere o contexto e especialidade do setor
3. Gere uma resposta NATURAL e PROFISSIONAL
4. A resposta deve ser cordial, clara e objetiva
5. Use linguagem adequada para uma escola técnica (formal mas acessível)
6. Se houver dúvidas que precisem de informações específicas, sugira uma resposta que peça esses dados
7. Mantenha a resposta em até 500 caracteres quando possível

NÃO INCLUA:
- Preços ou valores específicos (sempre diga "entre em contato para mais informações")
- Compromissos que a escola não pode garantir
- Respostas muito longas ou detalhadas excessivamente

RETORNE APENAS A SUGESTÃO DE RESPOSTA, sem textos explicativos.`;

class AIDraftService {
  constructor({ llmProvider, conversationRepository, messageRepository, departmentRepository }) {
    this.llmProvider = llmProvider || new LLMProvider();
    this.conversationRepository = conversationRepository;
    this.messageRepository = messageRepository;
    this.departmentRepository = departmentRepository;
  }

  async generateDraft(conversationId) {
    const messagesResult = await this.messageRepository.getConversationHistory(conversationId, 15);
    const messages = messagesResult.rows;

    if (messages.length === 0) {
      throw new Error('No messages found to generate draft');
    }

    const convResult = await this.conversationRepository.findById(conversationId);
    const conversation = convResult.rows[0];
    const departmentContext = await this.getDepartmentContext(conversation?.department_id);

    const conversationHistory = messages
      .map(m => `${this.formatSender(m)}: ${m.content}`)
      .join('\n');

    const result = await this.llmProvider.generateDraft(
      conversationHistory,
      departmentContext,
      DRAFT_PROMPT_BASE
    );

    const draft = result.content.trim();

    const updatedConv = await this.conversationRepository.updateDraft(
      conversationId,
      draft,
      0.85
    );

    return {
      conversationId,
      draft,
      confidence: 0.85,
      department: departmentContext
    };
  }

  async regenerateDraft(conversationId, customInstruction) {
    const messagesResult = await this.messageRepository.getConversationHistory(conversationId, 15);
    const messages = messagesResult.rows;

    const convResult = await this.conversationRepository.findById(conversationId);
    const conversation = convResult.rows[0];
    const departmentContext = await this.getDepartmentContext(conversation?.department_id);

    const conversationHistory = messages
      .map(m => `${this.formatSender(m)}: ${m.content}`)
      .join('\n');

    const prompt = customInstruction
      ? `Com base na conversa:\n${conversationHistory}\n\n${customInstruction}`
      : conversationHistory;

    const result = await this.llmProvider.generateDraft(
      prompt,
      departmentContext,
      DRAFT_PROMPT_BASE
    );

    const draft = result.content.trim();

    await this.conversationRepository.updateDraft(conversationId, draft, 0.85);

    return { conversationId, draft, confidence: 0.85 };
  }

  async getDepartmentContext(departmentId) {
    if (!departmentId || !this.departmentRepository) {
      return 'Atendimento geral da escola técnica de enfermagem.';
    }

    const result = await this.departmentRepository.findById(departmentId);
    const dept = result.rows[0];

    if (!dept) return 'Atendimento geral da escola técnica de enfermagem.';

    const contextMap = {
      'Comercial': 'Setor Comercial - Vendas de cursos técnicos em enfermagem. Informações sobre grades curriculares, duração, valores, processo seletivo e matrículas.',
      'Financeiro': 'Setor Financeiro - Pagamentos, boletos, parcelamentos, negociação de dívidas e questões relacionadas a valores.',
      'Secretaria': 'Setor de Secretaria - Documentos scolásticos, declarações, histórico escolar, transferências e atendimento administrativo.',
      'Acadêmico': 'Setor Acadêmico - Dúvidas sobre aulas, provas, estágios, certificados, convênios hospitalares e vida acadêmica.'
    };

    return contextMap[dept.name] || `Setor: ${dept.name}. ${dept.description || ''}`;
  }

  formatSender(message) {
    if (message.sender_type === 'user') return 'Atendente';
    if (message.sender_type === 'ai') return 'IA';
    if (message.sender_type === 'system') return 'Sistema';
    return 'Aluno';
  }
}

module.exports = AIDraftService;