async function sendMessage(req, reply) {
  const { conversationId, content, senderId } = req.body || {};
  const chatService = req.server.container.services.chat;

  if (!conversationId || !content) {
    return reply.code(400).send({ ok: false, error: 'conversationId e content sao obrigatorios' });
  }

  const message = await chatService.sendMessage(conversationId, content, senderId);

  if (req.server.io) {
    req.server.io.emit('message_sent', {
      conversationId,
      message
    });
  }

  return reply.send({ ok: true, message });
}

async function getConversation(req, reply) {
  const { id } = req.params || {};
  const chatService = req.server.container.services.chat;

  if (!id) {
    return reply.code(400).send({ ok: false, error: 'id e obrigatorio' });
  }

  const result = await chatService.getConversationWithMessages(Number(id));

  if (!result) {
    return reply.code(404).send({ ok: false, error: 'Conversa nao encontrada' });
  }

  return reply.send({ ok: true, data: result });
}

async function getQueue(req, reply) {
  const { companyId, departmentId } = req.query || {};
  const chatService = req.server.container.services.chat;

  const queue = await chatService.getQueueByDepartment(
    Number(companyId) || 1,
    departmentId ? Number(departmentId) : undefined
  );

  return reply.send({ ok: true, data: queue });
}

async function getMyConversations(req, reply) {
  const { companyId, userId } = req.query || {};
  const chatService = req.server.container.services.chat;

  const conversations = await chatService.getMyConversations(
    Number(companyId) || 1,
    Number(userId)
  );

  return reply.send({ ok: true, data: conversations });
}

async function assignConversation(req, reply) {
  const { conversationId, userId } = req.body || {};
  const chatService = req.server.container.services.chat;

  if (!conversationId || !userId) {
    return reply.code(400).send({ ok: false, error: 'conversationId e userId sao obrigatorios' });
  }

  const conversation = await chatService.assignConversation(
    Number(conversationId),
    Number(userId)
  );

  if (req.server.io) {
    req.server.io.to(`user:${userId}`).emit('conversation_assigned', conversation);
  }

  return reply.send({ ok: true, data: conversation });
}

async function updateDraft(req, reply) {
  const { conversationId, draft } = req.body || {};
  const chatService = req.server.container.services.chat;

  if (!conversationId) {
    return reply.code(400).send({ ok: false, error: 'conversationId e obrigatorio' });
  }

  const conversation = await chatService.setAIDraft(
    Number(conversationId),
    draft,
    req.body.confidence
  );

  if (req.server.io) {
    req.server.io.to(`conversation:${conversationId}`)
      .emit('draft_updated', { conversationId, draft, confidence: conversation.ai_confidence });
  }

  return reply.send({ ok: true, data: conversation });
}

async function resolveConversation(req, reply) {
  const { conversationId } = req.body || {};
  const chatService = req.server.container.services.chat;

  if (!conversationId) {
    return reply.code(400).send({ ok: false, error: 'conversationId e obrigatorio' });
  }

  const conversation = await chatService.resolveConversation(Number(conversationId));

  return reply.send({ ok: true, data: conversation });
}

module.exports = {
  sendMessage,
  getConversation,
  getQueue,
  getMyConversations,
  assignConversation,
  updateDraft,
  resolveConversation
};