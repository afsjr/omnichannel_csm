const { getSupabase } = require('../../lib/db');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

function getUserFromToken(h) {
  if (!h?.startsWith('Bearer ')) return null;
  try { const j = require('jsonwebtoken'); return j.verify(h.slice(7), JWT_SECRET); } catch { return null; }
}

function requireAuth(req, res) {
  const u = getUserFromToken(req.headers.authorization);
  if (!u) { res.status(401).json({ ok: false, error: 'Token inválido' }); return null; }
  return u;
}

async function triage(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { conversationId } = req.body || {};
  if (!conversationId) return res.status(400).json({ ok: false, error: 'conversationId obrigatório' });
  try {
    const db = getSupabase();
    const { data: conv } = await db.from('conversations').select('*, contacts(*)').eq('id', conversationId).single();
    if (!conv) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });
    return res.json({
      ok: true,
      data: {
        conversationId: conv.id,
        department: conv.department_id ? 'auto-assigned' : 'unassigned',
        priority: conv.priority || 0,
        contact_name: conv.contacts?.name || 'Unknown'
      }
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function generateDraft(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { conversationId } = req.body || {};
  if (!conversationId) return res.status(400).json({ ok: false, error: 'conversationId obrigatório' });
  try {
    const db = getSupabase();
    const { data: messages } = await db.from('messages').select('content, direction, created_at').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(10);
    const context = (messages || []).map(m => `${m.direction}: ${m.content}`).join('\n');
    const draft = context ? `Sugestão de resposta baseada no histórico:\n${context}` : 'Inicie a conversa com uma saudação';
    const { data: conv } = await db.from('conversations').update({ ai_draft: draft, ai_confidence: 0.7 }).eq('id', conversationId).select().single();
    return res.json({ ok: true, data: { draft, confidence: 0.7, conversation: conv } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

async function processWithAI(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  const { conversationId } = req.body || {};
  if (!conversationId) return res.status(400).json({ ok: false, error: 'conversationId obrigatório' });
  try {
    const db = getSupabase();
    const { data: conv } = await db.from('conversations').select('*, contacts(*)').eq('id', conversationId).single();
    if (!conv) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });
    const { data: messages } = await db.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
    return res.json({
      ok: true,
      data: {
        conversation: conv,
        messages,
        summary: `Conversa #${conv.id} com ${conv.contacts?.name || 'desconhecido'} (${messages?.length || 0} mensagens)`,
        suggested_action: messages?.length > 0 ? 'responder' : 'aguardando'
      }
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = async (req, res) => {
  const slug = req.query.slug;
  const action = Array.isArray(slug) ? (slug[0] || '') : (slug || '');

  switch (action) {
    case 'triage': return triage(req, res);
    case 'draft': return generateDraft(req, res);
    case 'process': return processWithAI(req, res);
    case 'jobs': return res.json({ ok: true, data: { status: 'no_jobs' } });
    default:
      return res.status(404).json({ ok: false, error: `Endpoint /api/ai/${action} não encontrado` });
  }
};
