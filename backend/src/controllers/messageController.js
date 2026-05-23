const ws = require('../lib/websocket');

async function simulateWebhook(req, reply) {
  const { chat } = req.server.container.services;
  const { contact, message } = req.body || {};

  if (!contact?.name || !contact?.phone || !message?.content) {
    return reply.code(400).send({ ok: false, error: 'contact.name, contact.phone, message.content sao obrigatorios' });
  }

  try {
    const result = await chat.simulateIncomingMessage({
      contact_name: contact.name,
      phone: contact.phone,
      content: message.content,
      channel: 'whatsapp'
    });

    ws.broadcast(req, 'new_message', {
      conversationId: result.conversation.id,
      message: result.message
    });
    ws.toDepartmentQueue(req, 'new_conversation', result.conversation);

    return reply.send({
      ok: true,
      data: result
    });
  } catch (error) {
    return reply.code(500).send({ ok: false, error: error.message });
  }
}

async function simulateBatch(req, reply) {
  const { conversations } = req.body || {};

  if (!conversations || !Array.isArray(conversations)) {
    return reply.code(400).send({ ok: false, error: 'conversations array e obrigatorio' });
  }

  const { chat } = req.server.container.services;
  const results = [];

  for (const conv of conversations) {
    try {
      const result = await chat.simulateIncomingMessage({
        contact_name: conv.contact.name,
        phone: conv.contact.phone,
        content: conv.message.content,
        department: conv.department
      });
      results.push({ ok: true, data: result });
    } catch (error) {
      results.push({ ok: false, error: error.message });
    }
  }

  ws.broadcast(req, 'batch_complete', { count: results.length });

  return reply.send({ ok: true, data: results });
}

async function sendMessage(req, reply) {
  const { conversationId, content, senderId } = req.body || {};
  const { chat } = req.server.container.services;

  if (!conversationId || !content) {
    return reply.code(400).send({ ok: false, error: 'conversationId e content sao obrigatorios' });
  }

  try {
    const message = await chat.sendMessage(conversationId, content, senderId);

    ws.toConversation(req, conversationId, 'message_sent', { conversationId, message });

    return reply.send({ ok: true, message });
  } catch (error) {
    return reply.code(500).send({ ok: false, error: error.message });
  }
}

async function getConversation(req, reply) {
  const { id } = req.params || {};
  const { chat } = req.server.container.services;

  const result = await chat.getConversationWithMessages(Number(id));

  if (!result) {
    return reply.code(404).send({ ok: false, error: 'Conversa nao encontrada' });
  }

  return reply.send({ ok: true, data: result });
}

async function getQueue(req, reply) {
  const { companyId, departmentId } = req.query || {};
  const { chat } = req.server.container.services;

  const queue = await chat.getQueue(
    Number(companyId) || 1,
    departmentId ? Number(departmentId) : null
  );

  return reply.send({ ok: true, data: queue });
}

async function getMyConversations(req, reply) {
  const { companyId, userId } = req.query || {};
  const { chat } = req.server.container.services;

  const conversations = await chat.getMyConversations(
    Number(companyId) || 1,
    userId ? Number(userId) : null
  );

  return reply.send({ ok: true, data: conversations });
}

async function assignConversation(req, reply) {
  const { conversationId, userId } = req.body || {};
  const { chat } = req.server.container.services;

  if (!conversationId || !userId) {
    return reply.code(400).send({ ok: false, error: 'conversationId e userId sao obrigatorios' });
  }

  const conversation = await chat.assignConversation(
    Number(conversationId),
    Number(userId)
  );

  ws.toUser(req, userId, 'conversation_assigned', conversation);
  ws.toDepartmentQueue(req, 'conversation_updated', conversation);

  return reply.send({ ok: true, data: conversation });
}

async function updateDraft(req, reply) {
  const { conversationId, draft } = req.body || {};
  const { chat } = req.server.container.services;

  if (!conversationId) {
    return reply.code(400).send({ ok: false, error: 'conversationId e obrigatorio' });
  }

  const conversation = await chat.setAIDraft(
    Number(conversationId),
    draft,
    0.85
  );

  ws.toConversation(req, conversationId, 'draft_updated', { conversationId, draft, confidence: 0.85 });

  return reply.send({ ok: true, data: conversation });
}

async function resolveConversation(req, reply) {
  const { conversationId } = req.body || {};
  const { chat } = req.server.container.services;

  if (!conversationId) {
    return reply.code(400).send({ ok: false, error: 'conversationId e obrigatorio' });
  }

  const conversation = await chat.resolveConversation(Number(conversationId));

  ws.toUser(req, conversation.assigned_to, 'conversation_resolved', { conversationId });
  ws.toDepartmentQueue(req, 'conversation_updated', conversation);

  return reply.send({ ok: true, data: conversation });
}

async function reopenConversation(req, reply) {
  const { conversationId } = req.body || {};
  const { chat } = req.server.container.services;

  if (!conversationId) {
    return reply.code(400).send({ ok: false, error: 'conversationId e obrigatorio' });
  }

  const conversation = await chat.reopenConversation(Number(conversationId));

  ws.toDepartmentQueue(req, 'conversation_updated', conversation);
  ws.toDepartmentQueue(req, 'new_conversation', conversation);

  return reply.send({ ok: true, data: conversation });
}

async function requeueConversation(req, reply) {
  const { conversationId } = req.body || {};
  const { chat } = req.server.container.services;

  if (!conversationId) {
    return reply.code(400).send({ ok: false, error: 'conversationId e obrigatorio' });
  }

  const conversation = await chat.requeueConversation(Number(conversationId));

  ws.toDepartmentQueue(req, 'conversation_updated', conversation);

  return reply.send({ ok: true, data: conversation });
}

async function getResolved(req, reply) {
  const { companyId, limit } = req.query || {};
  const { chat } = req.server.container.services;

  const conversations = await chat.getResolvedConversations(
    Number(companyId) || 1,
    Number(limit) || 50
  );

  return reply.send({ ok: true, data: conversations });
}

async function deleteMessage(req, reply) {
  const { id } = req.params || {};
  if (!id) return reply.code(400).send({ ok: false, error: 'id obrigatório' });

  try {
    const { message } = req.server.container.repositories;
    await message.delete(Number(id));
    return reply.send({ ok: true });
  } catch (error) {
    return reply.code(500).send({ ok: false, error: error.message });
  }
}

async function sendMedia(req, reply) {
  const { conversationId, type, url, caption, senderId } = req.body || {};
  const { chat } = req.server.container.services;

  if (!conversationId || !type || !url) {
    return reply.code(400).send({ ok: false, error: 'conversationId, type e url sao obrigatorios' });
  }

  const validTypes = ['image', 'video', 'audio', 'document'];
  if (!validTypes.includes(type)) {
    return reply.code(400).send({ ok: false, error: `type deve ser um de: ${validTypes.join(', ')}` });
  }

  try {
    const message = await chat.sendMediaMessage(
      Number(conversationId),
      type,
      url,
      caption,
      senderId ? Number(senderId) : null
    );

    ws.toConversation(req, conversationId, 'message_sent', { conversationId, message });

    return reply.send({ ok: true, message });
  } catch (error) {
    return reply.code(500).send({ ok: false, error: error.message });
  }
}

module.exports = {
  simulateWebhook,
  simulateBatch,
  sendMessage,
  sendMedia,
  getConversation,
  getQueue,
  getMyConversations,
  assignConversation,
  updateDraft,
  resolveConversation,
  reopenConversation,
  requeueConversation,
  getResolved,
  deleteMessage
};
