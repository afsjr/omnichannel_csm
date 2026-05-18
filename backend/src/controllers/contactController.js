async function listContacts(req, reply) {
  const { companyId, search, limit } = req.query || {};
  const { contact } = req.server.container.repositories;

  const result = await contact.findAll(Number(companyId) || 1, {
    search,
    limit: Number(limit) || 50
  });

  return reply.send({ ok: true, data: result.rows });
}

async function createContact(req, reply) {
  const { companyId, name, phone, email } = req.body || {};
  const { contact } = req.server.container.repositories;

  if (!phone) {
    return reply.code(400).send({ ok: false, error: 'phone e obrigatorio' });
  }

  try {
    const result = await contact.create(
      Number(companyId) || 1,
      name,
      phone,
      email
    );

    return reply.send({ ok: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return reply.code(400).send({ ok: false, error: 'Contato com este telefone ja existe' });
    }
    throw error;
  }
}

async function getContact(req, reply) {
  const { id } = req.params || {};
  const { contact } = req.server.container.repositories;

  const result = await contact.findById(Number(id));

  if (result.rowCount === 0) {
    return reply.code(404).send({ ok: false, error: 'Contato nao encontrado' });
  }

  return reply.send({ ok: true, data: result.rows[0] });
}

async function updateContact(req, reply) {
  const { id } = req.params || {};
  const { name, email, phone } = req.body || {};
  const { contact } = req.server.container.repositories;

  const result = await contact.update(Number(id), { name, email, phone });

  return reply.send({ ok: true, data: result.rows[0] });
}

async function startConversation(req, reply) {
  const { contactId, content } = req.body || {};
  const { chat, contact } = req.server.container.services;

  if (!contactId) {
    return reply.code(400).send({ ok: false, error: 'contactId e obrigatorio' });
  }

  const contactResult = await contact.findById(Number(contactId));
  if (contactResult.rowCount === 0) {
    return reply.code(404).send({ ok: false, error: 'Contato nao encontrado' });
  }

  const contactData = contactResult.rows[0];

  const result = await chat.startOutgoingConversation(
    contactData.company_id,
    contactData.id,
    contactData.name,
    contactData.phone,
    content || 'Iniciando conversa...'
  );

  if (req.server.io) {
    req.server.io.to(`user:${req.body.userId || 'global'}`)
      .emit('conversation_started', result);
  }

  return reply.send({ ok: true, data: result });
}

module.exports = {
  listContacts,
  createContact,
  getContact,
  updateContact,
  startConversation
};