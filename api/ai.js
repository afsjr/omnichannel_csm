const { getSupabase } = require('../lib/db');
const { getAction, getUserFromToken } = require('../lib/route-helper');

const BASE = '/api/ai';

module.exports = async (req, res) => {
  const isInternal = req.headers['x-internal-trigger'] === 'true';
  const user = isInternal ? { id: 'system' } : getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ ok: false, error: 'Token inválido' });
  const action = getAction(req, BASE);
  const db = getSupabase();

  if (action === 'triage' && req.method === 'POST') {
    const { conversationId } = req.body||{};
    if (!conversationId) return res.status(400).json({ ok: false, error: 'conversationId obrigatório' });
    try {
      const { data: conv } = await db.from('conversations').select('*, contacts(*), departments(name)').eq('id', conversationId).single();
      if (!conv) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });
      return res.json({ ok: true, data: { conversationId: conv.id, department: conv.departments?.name || conv.department_name || null, departmentId: conv.department_id || null, priority: conv.priority||0, contact_name: conv.contacts?.name||'Desconhecido' } });
    } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
  }

  if (action === 'draft' && req.method === 'POST') {
    const { conversationId } = req.body||{};
    if (!conversationId) return res.status(400).json({ ok: false, error: 'conversationId obrigatório' });
    try {
      const { data: messages } = await db.from('messages').select('content,direction,created_at').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(10);
      const ctx = (messages||[]).map(m=>`${m.direction}: ${m.content}`).join('\n');
      const draft = ctx ? `Sugestão baseada no histórico:\n${ctx}` : 'Inicie com uma saudação';
      await db.from('conversations').update({ ai_draft: draft, ai_confidence: 0.7 }).eq('id', conversationId);
      return res.json({ ok: true, data: { draft, confidence: 0.7 } });
    } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
  }

  if (action === 'process' && req.method === 'POST') {
    const { conversationId } = req.body||{};
    if (!conversationId) return res.status(400).json({ ok: false, error: 'conversationId obrigatório' });
    try {
      const { data: conv } = await db.from('conversations').select('*, contacts(*)').eq('id', conversationId).single();
      if (!conv) return res.status(404).json({ ok: false, error: 'Conversa não encontrada' });
      const { data: messages } = await db.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
      return res.json({ ok: true, data: { conversation: conv, messages, summary: `Conversa #${conv.id} com ${conv.contacts?.name||'desconhecido'} (${messages?.length||0} msgs)`, suggested_action: messages?.length > 0 ? 'responder' : 'aguardando' } });
    } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
  }

  if (action === 'jobs') return res.json({ ok: true, data: { status: 'no_jobs' } });

  return res.status(404).json({ ok: false, error: `Endpoint /api/ai/${action} não encontrado` });
};
