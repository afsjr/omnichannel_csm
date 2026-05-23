const { getSupabase } = require('../lib/db');
const { getAction, getUserFromToken } = require('../lib/route-helper');

const BASE = '/api/ai';

const LLM_API_KEY = process.env.LLM_API_KEY || process.env.GROQ_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL || process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const LLM_MODEL = process.env.LLM_MODEL || 'llama-3.3-70b-versatile';

async function generateDraftFromHistory(messages, departmentName) {
  if (!LLM_API_KEY) return null;

  const history = (messages || []).map(m =>
    `${m.direction === 'incoming' ? 'Aluno' : 'Atendente'}: ${m.content}`
  ).join('\n');

  const deptCtx = departmentName
    ? `Departamento: ${departmentName}\n`
    : '';

  const systemPrompt = `Você é um assistente de atendimento de uma escola técnica. Gere uma sugestão de resposta profissional, cordial, clara e objetiva baseada no histórico da conversa. Máximo 500 caracteres. Responda APENAS com a sugestão, sem introduções.`;

  try {
    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${deptCtx}Histórico da conversa:\n${history}\n\nGere uma sugestão de resposta profissional:` }
        ],
        temperature: 0.5,
        max_tokens: 300
      })
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    return content?.trim() || null;
  } catch (error) {
    console.error('LLM draft error:', error.message);
    return null;
  }
}

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
      const { data: messages } = await db.from('messages').select('content,direction,created_at').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(15);
      const { data: conv } = await db.from('conversations').select('department_id').eq('id', conversationId).single();
      const deptName = conv?.department_id ? (await db.from('departments').select('name').eq('id', conv.department_id).single()).data?.name : null;

      let draft = null;
      let confidence = 0;

      if (messages?.length > 0) {
        const llmDraft = await generateDraftFromHistory(messages, deptName);
        if (llmDraft) {
          draft = llmDraft;
          confidence = 0.85;
        } else {
          draft = messages.map(m => m.content).join(' ');
          confidence = 0.3;
        }
      }

      if (!draft) draft = 'Inicie com uma saudação';

      await db.from('conversations').update({ ai_draft: draft, ai_confidence: confidence }).eq('id', conversationId);
      return res.json({ ok: true, data: { draft, confidence } });
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
