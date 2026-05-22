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
  if (!user) {
    res.status(401).json({ ok: false, error: 'Token inválido' });
    return null;
  }
  return user;
}

const supabase = () => getSupabase();

async function sendMessage(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { conversationId, content, senderId } = req.body || {};
  if (!conversationId || !content) {
    return res.status(400).json({ ok: false, error: 'conversationId e content são obrigatórios' });
  }
  try {
    const db = supabase();
    const { data: conv } = await db.from('conversations').select('*, contacts!inner(phone)').eq('id', conversationId).single();
    if (!conv) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });
    const { data: msg, error } = await db.from('messages').insert({
      conversation_id: conversationId, content,
      sender_type: 'user', sender_id: senderId || user.userId,
      direction: 'outgoing', status: 'sent'
    }).select().single();
    if (error) throw error;
    await db.from('conversations').update({ last_message: content, updated_at: new Date().toISOString() }).eq('id', conversationId);
    return res.json({ ok: true, message: msg });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function getConversation(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const id = req.query.id || (req.url.match(/\/conversation\/(\d+)/) || [])[1];
  if (!id) return res.status(400).json({ ok: false, error: 'id é obrigatório' });
  try {
    const db = supabase();
    const { data: conv } = await db.from('conversations').select('*').eq('id', id).single();
    if (!conv) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });
    const { data: messages } = await db.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true });
    return res.json({ ok: true, data: { conversation: conv, messages } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function getQueue(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { companyId, departmentId } = req.query || {};
  try {
    const db = supabase();
    let query = db.from('conversations').select('*, contacts(*)').eq('status', 'pending').is('assigned_to', null);
    if (companyId) query = query.eq('company_id', Number(companyId));
    if (departmentId) query = query.eq('department_id', Number(departmentId));
    const { data } = await query.order('created_at', { ascending: true });
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function getMyConversations(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { companyId, userId } = req.query || {};
  try {
    const db = supabase();
    let query = db.from('conversations').select('*, contacts(*)').eq('assigned_to', Number(userId || user.userId));
    if (companyId) query = query.eq('company_id', Number(companyId));
    const { data } = await query.order('updated_at', { ascending: false });
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function assignConversation(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { conversationId, userId } = req.body || {};
  if (!conversationId || !userId) return res.status(400).json({ ok: false, error: 'conversationId e userId obrigatórios' });
  try {
    const db = supabase();
    const { data, error } = await db.from('conversations').update({ assigned_to: Number(userId), status: 'in_progress' }).eq('id', Number(conversationId)).select('*, contacts(*)').single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function updateDraft(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { conversationId, draft } = req.body || {};
  if (!conversationId) return res.status(400).json({ ok: false, error: 'conversationId obrigatório' });
  try {
    const db = supabase();
    const { data, error } = await db.from('conversations').update({ ai_draft: draft, ai_confidence: 0.85 }).eq('id', Number(conversationId)).select().single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function resolveConversation(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { conversationId } = req.body || {};
  if (!conversationId) return res.status(400).json({ ok: false, error: 'conversationId obrigatório' });
  try {
    const db = supabase();
    const { data, error } = await db.from('conversations').update({ status: 'resolved' }).eq('id', Number(conversationId)).select('*, contacts(*)').single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function reopenConversation(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { conversationId } = req.body || {};
  if (!conversationId) return res.status(400).json({ ok: false, error: 'conversationId obrigatório' });
  try {
    const db = supabase();
    const { data, error } = await db.from('conversations').update({ status: 'pending', assigned_to: null }).eq('id', Number(conversationId)).select('*, contacts(*)').single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function requeueConversation(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { conversationId } = req.body || {};
  if (!conversationId) return res.status(400).json({ ok: false, error: 'conversationId obrigatório' });
  try {
    const db = supabase();
    const { data, error } = await db.from('conversations').update({ status: 'pending', assigned_to: null }).eq('id', Number(conversationId)).select('*, contacts(*)').single();
    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function getResolved(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { companyId, limit = 50 } = req.query || {};
  try {
    const db = supabase();
    let query = db.from('conversations').select('*, contacts(*)').eq('status', 'resolved');
    if (companyId) query = query.eq('company_id', Number(companyId));
    const { data } = await query.order('updated_at', { ascending: false }).limit(Number(limit));
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function sendMedia(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { conversationId, type, url, caption, senderId } = req.body || {};
  if (!conversationId || !type || !url) return res.status(400).json({ ok: false, error: 'conversationId, type e url obrigatórios' });
  const validTypes = ['image', 'video', 'audio', 'document'];
  if (!validTypes.includes(type)) return res.status(400).json({ ok: false, error: `type deve ser: ${validTypes.join(', ')}` });
  try {
    const db = supabase();
    const { data: msg, error } = await db.from('messages').insert({
      conversation_id: Number(conversationId), content: caption || `[${type}]`,
      sender_type: 'user', sender_id: senderId || user.userId,
      direction: 'outgoing', status: 'sent',
      metadata: { media_type: type, media_url: url, caption: caption || '' }
    }).select().single();
    if (error) throw error;
    await db.from('conversations').update({ last_message: caption || `[${type}]`, updated_at: new Date().toISOString() }).eq('id', Number(conversationId));
    return res.json({ ok: true, message: msg });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = async (req, res) => {
  const segments = req.query.slug || [];
  const action = segments[0] || '';

  switch (action) {
    case 'send': return sendMessage(req, res);
    case 'conversation': return getConversation(req, res);
    case 'queue': return getQueue(req, res);
    case 'my-conversations': return getMyConversations(req, res);
    case 'assign': return assignConversation(req, res);
    case 'draft': return updateDraft(req, res);
    case 'resolve': return resolveConversation(req, res);
    case 'reopen': return reopenConversation(req, res);
    case 'requeue': return requeueConversation(req, res);
    case 'resolved': return getResolved(req, res);
    case 'send-media': return sendMedia(req, res);
    default:
      return res.status(404).json({ ok: false, error: `Endpoint /api/messages/${action} não encontrado` });
  }
};
