class ChatService {
  constructor({ contactRepository, conversationRepository, messageRepository, departmentRepository }) {
    this.contactRepository = contactRepository;
    this.conversationRepository = conversationRepository;
    this.messageRepository = messageRepository;
    this.departmentRepository = departmentRepository;
  }

  async processIncomingMessage(payload) {
    const companyId = Number(payload.company_id || 1);
    const contactName = payload.contact_name || payload.pushName || payload.name;
    const phone = this.normalizePhone(payload.phone || payload.number || payload.from || 'unknown');
    const content = payload.content || payload.message || payload.text || '';
    const channel = payload.channel || 'whatsapp';

    const contact = await this.contactRepository.findOrCreate(companyId, contactName, phone);

    let conversationResult = await this.conversationRepository.findByContactAndStatus(
      companyId, contact.id, channel, 'open'
    );

    let conversation;
    if (conversationResult.rowCount === 0) {
      conversationResult = await this.conversationRepository.create({
        companyId,
        contactId: contact.id,
        channel,
        status: 'pending'
      });
      conversation = conversationResult.rows[0];
    } else {
      conversation = conversationResult.rows[0];
    }

    const messageResult = await this.messageRepository.createIncoming(
      conversation.id, content, { original_payload: payload }
    );

    await this.conversationRepository.update(conversation.id, {
      updateLastMessage: true
    });

    return {
      conversation,
      message: messageResult.rows[0],
      contact,
      isNewConversation: conversationResult.rowCount === 0
    };
  }

  async getQueueByDepartment(companyId, departmentId) {
    const result = await this.conversationRepository.findByCompany(companyId, {
      departmentId,
      status: 'pending'
    });
    return result.rows;
  }

  async getMyConversations(companyId, userId) {
    const result = await this.conversationRepository.findByCompany(companyId, {
      assignedTo: userId,
      status: 'in_progress'
    });
    return result.rows;
  }

  async assignConversation(conversationId, userId) {
    const result = await this.conversationRepository.assignTo(conversationId, userId);
    return result.rows[0];
  }

  async sendMessage(conversationId, content, senderId) {
    const result = await this.messageRepository.createOutgoing(conversationId, content, senderId);
    await this.conversationRepository.update(conversationId, {
      updateLastMessage: true
    });
    return result.rows[0];
  }

  async setAIDraft(conversationId, draft, confidence = 0.8) {
    const result = await this.conversationRepository.updateDraft(conversationId, draft, confidence);
    return result.rows[0];
  }

  async clearAIDraft(conversationId) {
    return this.conversationRepository.updateDraft(conversationId, null, null);
  }

  async resolveConversation(conversationId) {
    return this.conversationRepository.resolve(conversationId);
  }

  async requeueConversation(conversationId) {
    return this.conversationRepository.requeue(conversationId);
  }

  async getConversationWithMessages(conversationId) {
    const convResult = await this.conversationRepository.findById(conversationId);
    if (convResult.rowCount === 0) return null;

    const messagesResult = await this.messageRepository.getConversationHistory(conversationId);

    return {
      conversation: convResult.rows[0],
      messages: messagesResult.rows
    };
  }

  normalizePhone(phone) {
    return (phone || '').replace(/\D/g, '');
  }
}

module.exports = ChatService;