const { 
  getQueue, 
  getMyConversations, 
  getConversation,
  assignConversation,
  resolveConversation 
} = require('../lib/messages');

async function handleRequest(req, res) {
  const { url } = req;
  
  try {
    if (url.includes('/queue')) {
      return await handleQueue(req, res);
    }
    
    if (url.includes('/my-conversations')) {
      return await handleMyConversations(req, res);
    }

    if (url.match(/\/conversation\/\d+/)) {
      return await handleGetConversation(req, res);
    }

    if (url.includes('/assign')) {
      return await handleAssign(req, res);
    }

    if (url.includes('/resolve')) {
      return await handleResolve(req, res);
    }

    res.status(404).json({ ok: false, error: 'Endpoint não encontrado' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
}

async function handleQueue(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const companyId = Number(req.query.company_id || 1);
  const departmentId = req.query.department_id ? Number(req.query.department_id) : null;
  
  const queue = await getQueue(companyId, departmentId);
  res.status(200).json({ ok: true, data: queue });
}

async function handleMyConversations(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const companyId = Number(req.query.company_id || 1);
  const userId = req.query.user_id ? Number(req.query.user_id) : null;
  
  if (!userId) {
    return res.status(400).json({ ok: false, error: 'user_id é obrigatório' });
  }

  const conversations = await getMyConversations(companyId, userId);
  res.status(200).json({ ok: true, data: conversations });
}

async function handleGetConversation(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const match = req.url.match(/\/conversation\/(\d+)/);
  if (!match) {
    return res.status(400).json({ ok: false, error: 'conversation_id é obrigatório' });
  }

  const conversationId = Number(match[1]);
  const result = await getConversation(conversationId);
  
  res.status(200).json({ ok: true, data: result });
}

async function handleAssign(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { conversation_id, user_id } = req.body || {};
  
  if (!conversation_id || !user_id) {
    return res.status(400).json({ ok: false, error: 'conversation_id e user_id são obrigatórios' });
  }

  const result = await assignConversation(Number(conversation_id), Number(user_id));
  res.status(200).json({ ok: true, data: result });
}

async function handleResolve(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { conversation_id } = req.body || {};
  
  if (!conversation_id) {
    return res.status(400).json({ ok: false, error: 'conversation_id é obrigatório' });
  }

  const result = await resolveConversation(Number(conversation_id));
  res.status(200).json({ ok: true, data: result });
}

module.exports = handleRequest;