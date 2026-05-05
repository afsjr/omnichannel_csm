const db = require('../db');

async function findOrCreateContact(companyId, name, phone) {
  const existing = await db.query(
    'SELECT id FROM contacts WHERE company_id = $1 AND phone = $2 LIMIT 1',
    [companyId, phone]
  );

  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }

  const created = await db.query(
    'INSERT INTO contacts (company_id, name, phone) VALUES ($1, $2, $3) RETURNING id',
    [companyId, name || phone, phone]
  );

  return created.rows[0].id;
}

async function findOrCreateConversation(companyId, contactId, channel = 'whatsapp') {
  const existing = await db.query(
    'SELECT id FROM conversations WHERE company_id = $1 AND contact_id = $2 AND channel = $3 AND status = $4 LIMIT 1',
    [companyId, contactId, channel, 'open']
  );

  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }

  const created = await db.query(
    'INSERT INTO conversations (company_id, contact_id, channel, status) VALUES ($1, $2, $3, $4) RETURNING id',
    [companyId, contactId, channel, 'open']
  );

  return created.rows[0].id;
}

async function saveIncomingMessage(payload) {
  const companyId = Number(payload.company_id || 1);
  const contactName = payload.contact_name || payload.pushName || payload.name;
  const phone = payload.phone || payload.number || payload.from || 'unknown';
  const content = payload.content || payload.message || payload.text || '';
  const sender = payload.sender || 'contact';

  const contactId = await findOrCreateContact(companyId, contactName, phone);
  const conversationId = await findOrCreateConversation(companyId, contactId, payload.channel || 'whatsapp');

  const created = await db.query(
    'INSERT INTO messages (conversation_id, sender, content) VALUES ($1, $2, $3) RETURNING id, conversation_id, sender, content, created_at',
    [conversationId, sender, content]
  );

  return created.rows[0];
}

module.exports = {
  saveIncomingMessage
};
