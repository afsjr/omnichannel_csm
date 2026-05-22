const { getSupabase } = require('../lib/db');
const { getAction, requireAuth } = require('../lib/route-helper');

const BASE = '/api/contacts';

async function listContacts(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const { companyId, search } = req.query || {};
  try {
    let q = getSupabase().from('contacts').select('*');
    if (companyId) q = q.eq('company_id', Number(companyId));
    if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    const { data } = await q.order('name', { ascending: true }).limit(100);
    return res.json({ ok: true, data });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function createContact(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const { company_id, name, phone, email } = req.body || {};
  if (!name || !phone) return res.status(400).json({ ok: false, error: 'name e phone obrigatórios' });
  try {
    const { data, error } = await getSupabase().from('contacts').insert({ company_id: company_id||user.companyId||1, name, phone, email: email||null }).select().single();
    if (error) return error.code === '23505' ? res.status(400).json({ ok: false, error: 'Contato já existe' }) : res.status(500).json({ ok: false, error: error.message });
    return res.status(201).json({ ok: true, data });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function getContact(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const id = req.query.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id obrigatório' });
  try {
    const { data } = await getSupabase().from('contacts').select('*').eq('id', id).single();
    if (!data) return res.status(404).json({ ok: false, error: 'Contato não encontrado' });
    return res.json({ ok: true, data });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function updateContact(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const id = req.query.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id obrigatório' });
  const { name, phone, email } = req.body || {};
  const up = {}; if (name) up.name=name; if (phone) up.phone=phone; if (email!==undefined) up.email=email;
  try {
    const { data, error } = await getSupabase().from('contacts').update(up).eq('id', id).select().single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function startConversation(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const { contactId, companyId, content } = req.body || {};
  if (!contactId) return res.status(400).json({ ok: false, error: 'contactId obrigatório' });
  try {
    const db = getSupabase();
    const { data: contact } = await db.from('contacts').select('*').eq('id', contactId).single();
    if (!contact) return res.status(404).json({ ok: false, error: 'Contato não encontrado' });
    const cid = companyId||contact.company_id||user.companyId||1;
    let { data: existing } = await db.from('conversations').select('*').eq('contact_id', contactId).eq('status', 'resolved').limit(1);
    let conversation;
    if (existing&&existing.length>0) {
      await db.from('conversations').update({ status:'pending' }).eq('id', existing[0].id);
      conversation = { ...existing[0], status:'pending' };
      if (content) await db.from('messages').insert({ conversation_id:existing[0].id, content, sender_type:'user', sender_id:user.userId, direction:'outgoing', status:'sent' });
    } else {
      const { data: conv } = await db.from('conversations').insert({ company_id:Number(cid), contact_id:Number(contactId), channel:'whatsapp', status:'pending' }).select().single();
      conversation = conv;
      if (content) await db.from('messages').insert({ conversation_id:conv.id, content, sender_type:'user', sender_id:user.userId, direction:'outgoing', status:'sent' });
    }
    return res.json({ ok: true, data: conversation });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

module.exports = async (req, res) => {
  const action = getAction(req, BASE);

  if (!action) {
    if (req.method === 'GET') return listContacts(req, res);
    if (req.method === 'POST') return createContact(req, res);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  switch (action) {
    case 'start-conversation': return startConversation(req, res);
    default:
      if (/^\d+$/.test(action)) {
        req.query.id = action;
        if (req.method === 'GET') return getContact(req, res);
        if (req.method === 'PUT') return updateContact(req, res);
      }
      return res.status(404).json({ ok: false, error: `Endpoint /api/contacts/${action} não encontrado` });
  }
};
