class ChatService {
  constructor({ contactRepository, conversationRepository, messageRepository, departmentRepository, evolutionProvider }) {
    this.contactRepository = contactRepository;
    this.conversationRepository = conversationRepository;
    this.messageRepository = messageRepository;
    this.departmentRepository = departmentRepository;
    this.evolutionProvider = evolutionProvider;
  }

  async processIncomingMessage(payload) {
    const companyId = Number(payload.company_id || 1);
    const contactName = payload.contact_name || payload.pushName || payload.name;
    const phone = this.normalizePhone(payload.phone || payload.number || payload.from || 'unknown');
    const content = payload.content || payload.message || payload.text || '';
    const channel = payload.channel || 'whatsapp';

    const contact = await this.contactRepository.findOrCreate(companyId, contactName, phone);

    let conversationResult = await this.conversationRepository.findByContactAndStatus(
      companyId, contact.id, channel, ['pending', 'in_progress']
    );

    let conversation;
    let wasResolved = false;

    if (conversationResult.rowCount === 0) {
      const resolvedConv = await this.conversationRepository.findByContactAndStatus(
        companyId, contact.id, channel, 'resolved'
      );

      if (resolvedConv.rowCount > 0) {
        conversation = resolvedConv.rows[0];
        wasResolved = true;
        await this.conversationRepository.reopen(conversation.id);
      } else {
        conversationResult = await this.conversationRepository.create({
          companyId,
          contactId: contact.id,
          channel,
          status: 'pending'
        });
        conversation = conversationResult.rows[0];
      }
    } else {
      conversation = conversationResult.rows[0];
    }

    const messageResult = await this.messageRepository.createIncoming(
      conversation.id, content, { original_payload: payload, reopened: wasResolved }
    );

    await this.conversationRepository.update(conversation.id, {
      updateLastMessage: true
    });

    return {
      conversation,
      message: messageResult.rows[0],
      contact,
      isNewConversation: conversationResult.rowCount === 0,
      wasReopened: wasResolved
    };
  }

  async getQueueByDepartment(companyId, departmentId) {
    const result = await this.conversationRepository.findByCompany(companyId, {
      departmentId,
      status: 'pending'
    });
    return result.rows;
  }

  async getQueue(companyId, departmentId) {
    const result = await this.conversationRepository.findByCompany(companyId, {
      departmentId: departmentId || undefined,
      status: 'pending',
      unassigned: !departmentId
    });
    return result.rows;
  }

  async getMyConversations(companyId, userId) {
    const result = await this.conversationRepository.findByCompany(companyId, {
      assignedTo: userId || undefined,
      status: 'in_progress'
    });
    return result.rows;
  }

  async simulateIncomingMessage(payload) {
    const companyId = Number(payload.company_id || 1);
    const contactName = payload.contact_name;
    const phone = this.normalizePhone(payload.phone);
    const content = payload.content;
    const channel = payload.channel || 'whatsapp';
    const departmentName = payload.department;

    const contact = await this.contactRepository.findOrCreate(companyId, contactName, phone);

    const existingConv = await this.conversationRepository.findByContactAndStatus(
      companyId, contact.id, channel, ['pending', 'in_progress']
    );

    let conversation;
    let isNewConversation = false;

    if (existingConv.rowCount === 0) {
      let departmentId = null;
      if (departmentName) {
        const depts = await this.departmentRepository.findByCompany(companyId);
        const dept = depts.rows.find(d => d.name.toLowerCase() === departmentName.toLowerCase());
        if (dept) departmentId = dept.id;
      }

      const createResult = await this.conversationRepository.create({
        companyId,
        contactId: contact.id,
        departmentId,
        channel,
        status: 'pending',
        priority: 0
      });
      conversation = createResult.rows[0];
      isNewConversation = true;
    } else {
      conversation = existingConv.rows[0];
    }

    const messageResult = await this.messageRepository.createIncoming(conversation.id, content);
    
    await this.conversationRepository.update(conversation.id, {
      updateLastMessage: true
    });

    return {
      conversation,
      message: messageResult.rows[0],
      contact,
      isNewConversation
    };
  }

  async assignConversation(conversationId, userId) {
    const result = await this.conversationRepository.assignTo(conversationId, userId);
    return result.rows[0];
  }

  async sendMessage(conversationId, content, senderId) {
    const convResult = await this.conversationRepository.findById(conversationId);
    if (convResult.rowCount === 0) {
      throw new Error('Conversa não encontrada');
    }
    const conversation = convResult.rows[0];
    const contactResult = await this.contactRepository.findById(conversation.contact_id);
    const contact = contactResult.rows[0];
    
    let evolutionResult = { simulated: true };
    if (contact?.phone && this.evolutionProvider) {
      try {
        evolutionResult = await this.evolutionProvider.sendText(contact.phone, content);
      } catch (error) {
        console.error('Erro ao enviar via Evolution API:', error.message);
      }
    }
    
    const result = await this.messageRepository.createOutgoing(
      conversationId, 
      content, 
      senderId,
      evolutionResult.id ? 'sent' : 'pending'
    );
    await this.conversationRepository.update(conversationId, {
      updateLastMessage: true
    });
    return result.rows[0];
  }

  async sendMediaMessage(conversationId, mediaType, mediaUrl, caption, senderId, evolutionResult = {}) {
    const convResult = await this.conversationRepository.findById(conversationId);
    if (convResult.rowCount === 0) {
      throw new Error('Conversa não encontrada');
    }
    const conversation = convResult.rows[0];
    const contactResult = await this.contactRepository.findById(conversation.contact_id);
    const contact = contactResult.rows[0];
    
    let evoResult = evolutionResult;
    if (contact?.phone && this.evolutionProvider && !evolutionResult.id) {
      try {
        evoResult = await this.evolutionProvider.sendMedia(contact.phone, mediaUrl, caption || '');
      } catch (error) {
        console.error('Erro ao enviar mídia via Evolution API:', error.message);
      }
    }
    
    const metadata = {
      media_type: mediaType,
      media_url: mediaUrl,
      caption: caption || '',
      evolution_response: evoResult
    };

    const result = await this.messageRepository.create({
      conversationId,
      senderType: 'user',
      senderId,
      content: caption || `[${mediaType}]`,
      direction: 'outgoing',
      status: evoResult.id ? 'sent' : 'pending',
      metadata
    });

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

  async reopenConversation(conversationId) {
    const result = await this.conversationRepository.reopen(conversationId);
    return result.rows[0];
  }

  async getResolvedConversations(companyId, limit = 50) {
    const result = await this.conversationRepository.findResolved(companyId, { limit });
    return result.rows;
  }

  async startOutgoingConversation(companyId, contactId, contactName, phone, content) {
    const existingConv = await this.conversationRepository.findByContactAndStatus(
      companyId, contactId, 'whatsapp', 'resolved'
    );

    if (existingConv.rowCount > 0) {
      await this.conversationRepository.reopen(existingConv.rows[0].id);
      const messageResult = await this.messageRepository.createOutgoing(
        existingConv.rows[0].id, content, null, 'pending'
      );
      return {
        conversation: existingConv.rows[0],
        message: messageResult.rows[0],
        isNew: false,
        wasReopened: true
      };
    }

    const existing = await this.conversationRepository.findByContactAndStatus(
      companyId, contactId, 'whatsapp', 'pending'
    );
    if (existing.rowCount > 0) {
      throw new Error('Conversa ja existe com este contato');
    }

    const convResult = await this.conversationRepository.create({
      companyId,
      contactId,
      channel: 'whatsapp',
      status: 'pending'
    });

    const messageResult = await this.messageRepository.createOutgoing(
      convResult.rows[0].id, content, null, 'pending'
    );

    return {
      conversation: convResult.rows[0],
      message: messageResult.rows[0],
      isNew: true
    };
  }

  async getConversationWithMessages(conversationId) {
    const convResult = await this.conversationRepository.findById(conversationId);
    if (convResult.rowCount === 0) return null;

    const messagesResult = await this.messageRepository.findByConversation(conversationId);

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