const { getSupabase } = require('../../lib/db');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

function getUserFromToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const jwt = require('jsonwebtoken');
    return jwt.verify(authHeader.slice(7), JWT_SECRET);
  } catch { return null; }
}

function requireAuth(req, res) {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ ok: false, error: 'Token inválido' }); return null; }
  return user;
}

const db = () => getSupabase();

async function listContacts(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { companyId, search } = req.query || {};
  try {
    let query = db().from('contacts').select('*');
    if (companyId) query = query.eq('company_id', Number(companyId));
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    const { data } = await query.order('name', { ascending: true }).limit(100);
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function createContact(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { company_id, name, phone, email } = req.body || {};
  if (!name || !phone) return res.status(400).json({ ok: false, error: 'name e phone obrigatórios' });
  try {
    const { data, error } = await db().from('contacts').insert({
      company_id: company_id || user.companyId || 1, name, phone, email: email || null
    }).select().single();
    if (error) throw error;
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ ok: false, error: 'Contato já existe' });
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function getContact(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const id = (req.url.match(/\/contacts\/(\d+)/) || [])[1];
  if (!id) return res.status(400).json({ ok: false, error: 'id obrigatório' });
  try {
    const { data } = await db().from('contacts').select('*').eq('id', id).single();
    if (!data) return res.status(404).json({ ok: false, error: 'Contato não encontrado' });
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function updateContact(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const id = (req.url.match(/\/contacts\/(\d+)/) || [])[1];
  if (!id) return res.status(400).json({ ok: false, error: 'id obrigatório' });
  const { name, phone, email } = req.body || {};
  try {
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    const { data, error } = await db().from('contacts').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function startConversation(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { contactId, companyId, content } = req.body || {};
  if (!contactId) return res.status(400).json({ ok: false, error: 'contactId obrigatório' });
  try {
    const sdb = db();
    const { data: contact } = await sdb.from('contacts').select('*').eq('id', contactId).single();
    if (!contact) return res.status(404).json({ ok: false, error: 'Contato não encontrado' });
    const cid = companyId || contact.company_id || user.companyId || 1;
    let { data: existing } = await sdb.from('conversations').select('*').eq('contact_id', contactId).eq('status', 'resolved').limit(1);
    let conversation;
    if (existing && existing.length > 0) {
      await sdb.from('conversations').update({ status: 'pending' }).eq('id', existing[0].id);
      conversation = { ...existing[0], status: 'pending' };
      if (content) {
        await sdb.from('messages').insert({
          conversation_id: existing[0].id, content,
          sender_type: 'user', sender_id: user.userId,
          direction: 'outgoing', status: 'sent'
        });
      }
    } else {
      const { data: conv } = await sdb.from('conversations').insert({
        company_id: Number(cid), contact_id: Number(contactId),
        channel: 'whatsapp', status: 'pending'
      }).select().single();
      conversation = conv;
      if (content) {
        await sdb.from('messages').insert({
          conversation_id: conv.id, content,
          sender_type: 'user', sender_id: user.userId,
          direction: 'outgoing', status: 'sent'
        });
      }
    }
    return res.json({ ok: true, data: conversation });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = async (req, res) => {
  const segments = req.query.slug || [];
  const action = segments[0] || '';

  if (!action) {
    if (req.method === 'GET') return listContacts(req, res);
    if (req.method === 'POST') return createContact(req, res);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  if (action === 'start-conversation') return startConversation(req, res);
  if (/^\d+$/.test(action)) {
    if (req.method === 'GET') return getContact(req, res);
    if (req.method === 'PUT') return updateContact(req, res);
  }

  return res.status(404).json({ ok: false, error: `Endpoint /api/contacts/${action} não encontrado` });
};
