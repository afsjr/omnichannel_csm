const LLMProvider = require('../providers/LLMProvider');
const FunnelClassificationService = require('./FunnelClassificationService');

const DEFAULT_DEPARTMENTS = [
  { name: 'Comercial', description: 'dúvidas sobre cursos, matrículas, preços, prazos, informações gerais de vendas' },
  { name: 'Financeiro', description: 'questões sobre pagamentos, boletos, parcelamentos, negociação, valores em atraso' },
  { name: 'Secretaria', description: 'atendimentos administrativos, documentos, declarações, históricos, transferências' },
  { name: 'Acadêmico', description: 'dúvidas sobre aulas, provas, certificados, estágios, convênios hospitalares' }
];

class TriageService {
  constructor({ llmProvider, conversationRepository, messageRepository, departmentRepository }) {
    this.llmProvider = llmProvider || new LLMProvider();
    this.conversationRepository = conversationRepository;
    this.messageRepository = messageRepository;
    this.departmentRepository = departmentRepository;
    this.funnelService = new FunnelClassificationService();
  }

  async loadDepartments(companyId) {
    if (!this.departmentRepository) return DEFAULT_DEPARTMENTS;
    try {
      const result = await this.departmentRepository.findByCompany(companyId);
      if (result.rows.length > 0) {
        return result.rows.map(d => ({
          name: d.name,
          description: d.description || `Setor ${d.name}`
        }));
      }
    } catch {
      // fallback
    }
    return DEFAULT_DEPARTMENTS;
  }

  buildPrompt(departments) {
    const deptLines = departments
      .map(d => `- ${d.name}: ${d.description}`)
      .join('\n');

    return `Você é um assistente de triagem de mensagens. Analise a mensagem e classifique qual setor deve atender.

SETORES DISPONÍVEIS:
${deptLines}

INSTRUÇÕES:
1. Leia atentamente a mensagem
2. Classifique para o setor mais adequado
3. Se a mensagem não couber em nenhum setor específico, classifique como "${departments[0]?.name || 'Comercial'}"
4. Retorne APENAS o nome do setor

Se houver mais de um setor aplicável, escolha o principal baseado na necessidade mais urgente.`;
  }

  async triage(conversationId) {
    const convResult = await this.conversationRepository.findById(conversationId);
    const conversation = convResult.rows[0];
    const companyId = conversation?.company_id || 1;

    const departments = await this.loadDepartments(companyId);
    const departmentNames = departments.map(d => d.name);

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

    const prompt = this.buildPrompt(departments);
    const result = await this.llmProvider.classify(
      conversationHistory,
      departmentNames,
      prompt
    );

    const classifiedDepartment = this.parseDepartment(result.content, departmentNames);
    const departmentResult = await this.findDepartmentByName(classifiedDepartment, companyId);

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

  parseDepartment(response, departmentNames) {
    const cleaned = response.trim();
    for (const dept of departmentNames) {
      if (cleaned.toLowerCase().includes(dept.toLowerCase())) {
        return dept;
      }
    }
    return departmentNames[0] || 'Comercial';
  }

  async findDepartmentByName(name, companyId) {
    if (!this.departmentRepository) return null;
    const result = await this.departmentRepository.findByName(name, companyId);
    return result.rows[0] || null;
  }
}

module.exports = TriageService;