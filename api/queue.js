/**
 * API de Fila de Atendimentos
 * 
 * Retorna a lista de conversas pendentes (na fila) para serem atendidas.
 * 
 * Endpoints disponíveis:
 * - GET /api/queue - Lista todas as conversas pendentes
 * - GET /api/queue?company_id=1 - Filtra por empresa
 * - GET /api/queue?company_id=1&department_id=2 - Filtra por departamento
 * 
 * @example
 * // Listar todas as conversas pendentes
 * curl "https://omnichannel-csm.vercel.app/api/queue?company_id=1"
 * 
 * // Response
 * {
 *   "ok": true,
 *   "data": [
 *     {
 *       "id": 10,
 *       "status": "pending",
 *       "contact_id": 10,
 *       "contacts": { "name": "Maria", "phone": "11999999999" },
 *       "departments": { "name": "Comercial" },
 *       "last_message_at": "2026-05-18T22:12:09"
 *     }
 *   ]
 * }
 */

const { getQueue } = require('../lib/messages');

/**
 * Lista conversas na fila de atendimento
 */
module.exports = async (req, res) => {
  const { url } = req.url;
  
  // Rota de fila de atendimentos
  if (url.includes('/queue')) {
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const companyId = Number(req.query.company_id || 1);
    const departmentId = req.query.department_id ? Number(req.query.department_id) : null;
    
    try {
      const queue = await getQueue(companyId, departmentId);
      return res.status(200).json({ ok: true, data: queue });
    } catch (error) {
      console.error('Queue error:', error);
      return res.status(500).json({ ok: false, error: 'Erro ao buscar fila' });
    }
  }

  // Rota de conversas do atendente
  if (url.includes('/my-conversations')) {
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const companyId = Number(req.query.company_id || 1);
    const userId = req.query.user_id ? Number(req.query.user_id) : null;
    
    if (!userId) {
      return res.status(400).json({ ok: false, error: 'user_id é obrigatório' });
    }

    const { getMyConversations } = require('../lib/messages');
    const conversations = await getMyConversations(companyId, userId);
    return res.status(200).json({ ok: true, data: conversations });
  }

  // Rota de detalhes de uma conversa
  if (url.match(/\/conversation\/\d+/)) {
    const { getConversation } = require('../lib/messages');
    const match = url.match(/\/conversation\/(\d+)/);
    const conversationId = Number(match[1]);
    
    const result = await getConversation(conversationId);
    return res.status(200).json({ ok: true, data: result });
  }

  // Rota para atribuir conversa a atendente
  if (url.includes('/assign')) {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const { conversation_id, user_id } = req.body || {};
    const { assignConversation } = require('../lib/messages');
    
    if (!conversation_id || !user_id) {
      return res.status(400).json({ 
        ok: false, 
        error: 'conversation_id e user_id são obrigatórios' 
      });
    }

    const result = await assignConversation(Number(conversation_id), Number(user_id));
    return res.status(200).json({ ok: true, data: result });
  }

  // Rota para encerrar conversa
  if (url.includes('/resolve')) {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const { conversation_id } = req.body || {};
    const { resolveConversation } = require('../lib/messages');
    
    if (!conversation_id) {
      return res.status(400).json({ ok: false, error: 'conversation_id é obrigatório' });
    }

    const result = await resolveConversation(Number(conversation_id));
    return res.status(200).json({ ok: true, data: result });
  }

  // Nenhuma rota correspondeu
  return res.status(404).json({ ok: false, error: 'Endpoint não encontrado' });
};