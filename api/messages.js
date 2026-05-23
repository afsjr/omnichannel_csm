const { getSupabase } = require('../lib/db');
const { getAction, requireAuth } = require('../lib/route-helper');
const { sendMessageToEvolution, sendMediaToEvolution } = require('../lib/evolution');

const BASE = '/api/messages';

async function sendMessage(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const { conversationId, content, senderId } = req.body || {};
  if (!conversationId || !content) return res.status(400).json({ ok: false, error: 'conversationId e content obrigatórios' });
  try {
    const db = getSupabase();
    const { data: conv } = await db.from('conversations').select('*, contacts!inner(phone)').eq('id', conversationId).single();
    if (!conv) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });
    let status = 'sent';
    if (conv.contacts?.phone) try { await sendMessageToEvolution({ number: conv.contacts.phone, message: content }); } catch(e) { console.error('Evolution:',e.message); status='pending'; }
    const { data: msg, error } = await db.from('messages').insert({ conversation_id: conversationId, content, sender_type: 'user', sender_id: senderId || user.userId, direction: 'outgoing', status }).select().single();
    if (error) throw error;
    await db.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
    return res.json({ ok: true, message: msg });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function getConversation(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const id = req.query.id;
  if (!id) return res.status(400).json({ ok: false, error: 'id obrigatório' });
  try {
    const db = getSupabase();
    const { data: conv } = await db.from('conversations').select('*, contacts(*)').eq('id', id).single();
    if (!conv) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });
    const { data: messages } = await db.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true });
    return res.json({ ok: true, data: { conversation: conv, messages } });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function getQueue(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const { companyId, departmentId } = req.query || {};
  try {
    const db = getSupabase();
    let q = db.from('conversations').select('*, contacts(*)').in('status', ['pending', 'queued']).is('assigned_to', null);
    if (companyId) q = q.eq('company_id', Number(companyId));
    if (departmentId) q = q.eq('department_id', Number(departmentId));
    const { data } = await q.order('created_at', { ascending: true });
    return res.json({ ok: true, data: data || [] });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function getMyConversations(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const { companyId, userId } = req.query || {};
  try {
    const db = getSupabase();
    let q = db.from('conversations').select('*, contacts(*)').eq('assigned_to', Number(userId || user.userId));
    if (companyId) q = q.eq('company_id', Number(companyId));
    const { data } = await q.order('last_message_at', { ascending: false });
    return res.json({ ok: true, data: data || [] });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function assignConversation(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const { conversationId, userId } = req.body || {};
  if (!conversationId || !userId) return res.status(400).json({ ok: false, error: 'conversationId e userId obrigatórios' });
  try {
    const db = getSupabase();
    const { data, error } = await db.from('conversations').update({ assigned_to: Number(userId), status: 'in_progress' }).eq('id', Number(conversationId)).select('*, contacts(*)').single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function updateDraft(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const { conversationId, draft } = req.body || {};
  if (!conversationId) return res.status(400).json({ ok: false, error: 'conversationId obrigatório' });
  try {
    const db = getSupabase();
    const { data, error } = await db.from('conversations').update({ ai_draft: draft, ai_confidence: 0.85 }).eq('id', Number(conversationId)).select().single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function resolveConversation(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const { conversationId } = req.body || {};
  if (!conversationId) return res.status(400).json({ ok: false, error: 'conversationId obrigatório' });
  try {
    const db = getSupabase();
    const { data, error } = await db.from('conversations').update({ status: 'resolved' }).eq('id', Number(conversationId)).select('*, contacts(*)').single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function reopenConversation(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const { conversationId } = req.body || {};
  if (!conversationId) return res.status(400).json({ ok: false, error: 'conversationId obrigatório' });
  try {
    const db = getSupabase();
    const { data, error } = await db.from('conversations').update({ status: 'pending', assigned_to: null }).eq('id', Number(conversationId)).select('*, contacts(*)').single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function requeueConversation(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const { conversationId } = req.body || {};
  if (!conversationId) return res.status(400).json({ ok: false, error: 'conversationId obrigatório' });
  try {
    const db = getSupabase();
    const { data, error } = await db.from('conversations').update({ status: 'queued', assigned_to: null }).eq('id', Number(conversationId)).select('*, contacts(*)').single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function getResolved(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const { companyId, limit = 50 } = req.query || {};
  try {
    const db = getSupabase();
    let q = db.from('conversations').select('*, contacts(*)').eq('status', 'resolved');
    if (companyId) q = q.eq('company_id', Number(companyId));
    const { data } = await q.order('last_message_at', { ascending: false }).limit(Number(limit));
    return res.json({ ok: true, data: data || [] });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function sendMedia(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const { conversationId, type, url, caption, senderId } = req.body || {};
  if (!conversationId || !type || !url) return res.status(400).json({ ok: false, error: 'conversationId, type e url obrigatórios' });
  if (!['image','video','audio','document'].includes(type)) return res.status(400).json({ ok: false, error: 'tipo inválido' });
  try {
    const db = getSupabase();
    const { data: conv } = await db.from('conversations').select('*, contacts!inner(phone)').eq('id', Number(conversationId)).single();
    if (!conv) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });
    let status = 'sent';
    if (conv.contacts?.phone) try { await sendMediaToEvolution({ number: conv.contacts.phone, media: url, caption, mediatype: type }); } catch(e) { console.error('Evolution:',e.message); status='pending'; }
    const { data: msg, error } = await db.from('messages').insert({ conversation_id: Number(conversationId), content: caption || `[${type}]`, sender_type: 'user', sender_id: senderId || user.userId, direction: 'outgoing', status, metadata: { media_type: type, media_url: url, caption: caption || '' } }).select().single();
    if (error) throw error;
    await db.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', Number(conversationId));
    return res.json({ ok: true, message: msg });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function deleteMessage(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, error: 'id obrigatório' });
  try {
    const db = getSupabase();
    const { error } = await db.from('messages').delete().eq('id', Number(id));
    if (error) throw error;
    return res.json({ ok: true });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
}

module.exports = async (req, res) => {
  const action = getAction(req, BASE);

  if (!action) return res.status(404).json({ ok: false, error: 'Endpoint não encontrado' });

  const parts = action.split('/');
  const mainAction = parts[0];

  switch (mainAction) {
    case 'send': return sendMessage(req, res);
    case 'conversation': 
      req.query = req.query || {};
      if (parts[1]) req.query.id = parts[1];
      return getConversation(req, res);
    case 'queue': return getQueue(req, res);
    case 'my-conversations': return getMyConversations(req, res);
    case 'assign': return assignConversation(req, res);
    case 'draft': return updateDraft(req, res);
    case 'resolve': return resolveConversation(req, res);
    case 'reopen': return reopenConversation(req, res);
    case 'requeue': return requeueConversation(req, res);
    case 'resolved': return getResolved(req, res);
    case 'send-media': return sendMedia(req, res);
    case 'delete': return deleteMessage(req, res);
    default: return res.status(404).json({ ok: false, error: `Endpoint /api/messages/${action} não encontrado` });
  }
};
