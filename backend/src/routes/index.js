const authController = require('../controllers/authController');
const messageController = require('../controllers/messageController');
const webhookController = require('../controllers/webhookController');
const aiController = require('../controllers/aiController');
const dashboardController = require('../controllers/dashboardController');
const contactController = require('../controllers/contactController');
const instanceController = require('../controllers/instanceController');
const { requirePermission } = require('../middlewares/permissions');
const AuthService = require('../services/AuthService');

async function routes(fastify) {
  fastify.get('/health', async () => ({ ok: true }));

  fastify.get('/debug/db-test', async (req, reply) => {
    try {
      const { contact } = req.server.container.repositories;
      const result = await contact.findAll(1, { limit: 5 });
      return { ok: true, contacts: result.rows, count: result.rowCount };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  fastify.get('/debug/tables', async (req, reply) => {
    try {
      const { contact } = req.server.container.repositories;
      const contacts = await contact.findAll(1, { limit: 1 });
      const { conversation } = req.server.container.repositories;
      const conversations = await conversation.findByCompany(1, { limit: 1 });
      const { message } = req.server.container.repositories;
      const messages = await message.findByConversation(1, { limit: 1 });
      const { department } = req.server.container.repositories;
      const departments = await department.findByCompany(1);
      return { 
        ok: true, 
        tables: {
          contacts: contacts.rowCount >= 0 ? 'OK' : 'ERROR',
          conversations: conversations.rowCount >= 0 ? 'OK' : 'ERROR',
          messages: messages.rowCount >= 0 ? 'OK' : 'ERROR',
          departments: departments.rowCount >= 0 ? 'OK' : 'ERROR'
        }
      };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  fastify.post('/debug/test-webhook', async (req, reply) => {
    const webhook = require('../controllers/webhookController');
    return webhook.receiveWebhook(req, reply);
  });

  fastify.get('/debug/evolution-status', async (req, reply) => {
    try {
      const evolutionProvider = req.server.container.providers.evolution;
      if (!evolutionProvider.baseUrl || !evolutionProvider.apiKey) {
        return { ok: false, error: 'Evolution API não configurada' };
      }
      const status = await evolutionProvider.getInstanceStatus();
      return { ok: true, status };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  fastify.get('/debug/webhook-url', async (req, reply) => {
    return {
      webhookUrl: `${req.protocol}://${req.hostname}/api/webhook`,
      instructions: 'Configure este URL no painel da Evolution API ou use ngrok'
    };
  });

  fastify.put('/debug/update-webhook', async (req, reply) => {
    const { url } = req.body || {};
    if (!url) {
      return reply.code(400).send({ ok: false, error: 'URL é obrigatória' });
    }
    try {
      const evolutionProvider = req.server.container.providers.evolution;
      const response = await fetch(`${evolutionProvider.baseUrl}/webhook/set/${evolutionProvider.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionProvider.apiKey
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: url,
            webhookByEvents: false,
            events: ['MESSAGES_UPSERT', 'SEND_MESSAGE', 'CONNECTION_UPDATE']
          }
        })
      });
      const data = await response.json();
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  fastify.post('/debug/simulate-message', async (req, reply) => {
    const { phone, name, message, type } = req.body || {};
    if (!phone || !message) {
      return reply.code(400).send({ ok: false, error: 'phone e message são obrigatórios' });
    }
    
    const chatService = req.server.container.services.chat;
    const simulatedPayload = {
      phone,
      contact_name: name || 'Contato',
      content: message,
      media_type: type || null,
      channel: 'whatsapp'
    };

    try {
      const result = await chatService.processIncomingMessage(simulatedPayload);
      
      if (req.server.io) {
        req.server.io.emit('new_message', {
          conversationId: result.conversation.id,
          message: result.message
        });
      }

      return { ok: true, data: result };
    } catch (error) {
      return reply.code(500).send({ ok: false, error: error.message });
    }
  });

  // Auth
  fastify.post('/auth/login', authController.login);
  fastify.post('/auth/register', authController.register);
  fastify.get('/auth/me', { preHandler: [authController.authMiddleware] }, authController.me);
  fastify.post('/auth/logout', authController.logout);
  fastify.post('/auth/refresh', authController.refreshToken);

  // Auth - User Management (admin/master)
  fastify.get('/auth/manage-users', { preHandler: [authController.authMiddleware] }, async (req, reply) => {
    const { companyId, page = 1, limit = 50 } = req.query || {};
    const { user: userRepo } = req.server.container.repositories;
    const offset = (Number(page) - 1) * Number(limit);

    let q = req.server.container.db.client.from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (req.user.role === 'master' && companyId) q = q.eq('company_id', Number(companyId));
    else if (req.user.role !== 'master') q = q.eq('company_id', req.user.company_id);

    const { data: users, count, error } = await q;
    if (error) return reply.code(500).send({ ok: false, error: error.message });

    return reply.send({ ok: true, data: { users: users || [], total: count || 0, page: Number(page), limit: Number(limit) } });
  });

  fastify.post('/auth/manage-users', { preHandler: [requirePermission('users:create')] }, async (req, reply) => {
    const { name, email, password, role, departmentId, companyId } = req.body || {};
    if (!name || !email || !password || !role) {
      return reply.code(400).send({ ok: false, error: 'name, email, password e role sao obrigatorios' });
    }
    const targetCompanyId = (req.user.role === 'master' && companyId) ? Number(companyId) : req.user.company_id;
    const authService = new AuthService();
    const hashed = authService.hashPassword(password);
    const { user: userRepo } = req.server.container.repositories;

    const insertData = {
      company_id: targetCompanyId,
      name, email, password: hashed,
      role, department_id: departmentId || null,
      is_active: true
    };

    try {
      const { data: user, error } = await req.server.container.db.client.from('users').insert(insertData).select('id, name, email, role, company_id, department_id').single();
      if (error) return error.code === '23505'
        ? reply.code(400).send({ ok: false, error: 'Email ja cadastrado' })
        : reply.code(500).send({ ok: false, error: error.message });
      return reply.code(201).send({ ok: true, message: `Usuario ${role} criado`, data: user });
    } catch (e) {
      return reply.code(500).send({ ok: false, error: e.message });
    }
  });

  fastify.put('/auth/manage-users', { preHandler: [requirePermission('users:update')] }, async (req, reply) => {
    const { userId, name, role, departmentId, isActive } = req.body || {};
    if (!userId) return reply.code(400).send({ ok: false, error: 'userId obrigatorio' });

    const { user: userRepo } = req.server.container.repositories;
    const target = await userRepo.findById(Number(userId));
    if (target.rowCount === 0) return reply.code(404).send({ ok: false, error: 'Usuario nao encontrado' });
    if (req.user.role !== 'master' && target.rows[0].company_id !== req.user.company_id) {
      return reply.code(403).send({ ok: false, error: 'Nao pode editar usuario de outra empresa' });
    }

    const result = await userRepo.update(Number(userId), { name, role, departmentId, isActive });
    return reply.send({ ok: true, message: 'Atualizado', data: result.rows[0] });
  });

  fastify.delete('/auth/manage-users', { preHandler: [requirePermission('users:delete')] }, async (req, reply) => {
    const { userId } = req.body || {};
    if (!userId) return reply.code(400).send({ ok: false, error: 'userId obrigatorio' });
    if (Number(userId) === req.user.id) return reply.code(400).send({ ok: false, error: 'Nao pode excluir a si mesmo' });

    const { user: userRepo } = req.server.container.repositories;
    const target = await userRepo.findById(Number(userId));
    if (target.rowCount === 0) return reply.code(404).send({ ok: false, error: 'Usuario nao encontrado' });
    if (req.user.role !== 'master' && target.rows[0].company_id !== req.user.company_id) {
      return reply.code(403).send({ ok: false, error: 'Nao pode excluir usuario de outra empresa' });
    }

    await userRepo.setActiveStatus(Number(userId), false);
    return reply.send({ ok: true, message: 'Usuario desativado' });
  });

  // Users
  fastify.get('/users', { preHandler: [authController.authMiddleware] }, async (req, reply) => {
    const companyId = Number(req.query.companyId) || (req.user.company_id || 1);
    const { user: userRepo } = req.server.container.repositories;
    const result = await userRepo.findByCompany(companyId);
    return reply.send({ ok: true, data: result.rows, count: result.rowCount });
  });

  fastify.put('/users/:id', { preHandler: [requirePermission('users:update')] }, async (req, reply) => {
    const { name, role, department_id } = req.body || {};
    const { user: userRepo } = req.server.container.repositories;
    const target = await userRepo.findById(Number(req.params.id));
    if (target.rowCount === 0) return reply.code(404).send({ ok: false, error: 'Usuario nao encontrado' });
    if (req.user.role !== 'master' && target.rows[0].company_id !== req.user.company_id) {
      return reply.code(403).send({ ok: false, error: 'Nao pode editar usuario de outra empresa' });
    }
    const result = await userRepo.update(Number(req.params.id), { name, role, departmentId: department_id });
    return reply.send({ ok: true, data: result.rows[0] });
  });

  fastify.put('/users/:id/activate', { preHandler: [requirePermission('users:update')] }, async (req, reply) => {
    const { is_active } = req.body || {};
    if (is_active === undefined) return reply.code(400).send({ ok: false, error: 'is_active obrigatorio' });
    const { user: userRepo } = req.server.container.repositories;
    await userRepo.setActiveStatus(Number(req.params.id), Boolean(is_active));
    return reply.send({ ok: true, message: is_active ? 'Usuario ativado' : 'Usuario desativado' });
  });

  // Messages
  fastify.post('/messages/send', { preHandler: [authController.authMiddleware] }, messageController.sendMessage);
  fastify.get('/messages/conversation/:id', { preHandler: [authController.authMiddleware] }, messageController.getConversation);
  fastify.get('/messages/queue', { preHandler: [authController.authMiddleware] }, messageController.getQueue);
  fastify.get('/messages/my-conversations', { preHandler: [authController.authMiddleware] }, messageController.getMyConversations);
  fastify.post('/messages/assign', { preHandler: [authController.authMiddleware] }, messageController.assignConversation);
  fastify.post('/messages/draft', { preHandler: [authController.authMiddleware] }, messageController.updateDraft);
  fastify.post('/messages/resolve', { preHandler: [authController.authMiddleware] }, messageController.resolveConversation);
  fastify.post('/messages/reopen', { preHandler: [authController.authMiddleware] }, messageController.reopenConversation);
  fastify.post('/messages/requeue', { preHandler: [authController.authMiddleware] }, messageController.requeueConversation);
  fastify.get('/messages/resolved', { preHandler: [authController.authMiddleware] }, messageController.getResolved);
  fastify.post('/messages/send-media', { preHandler: [authController.authMiddleware] }, messageController.sendMedia);
  fastify.delete('/messages/:id', { preHandler: [authController.authMiddleware] }, messageController.deleteMessage);

  // AI
  fastify.post('/ai/process', { preHandler: [authController.authMiddleware] }, aiController.processWithAI);
  fastify.post('/ai/triage', { preHandler: [authController.authMiddleware] }, aiController.triageOnly);
  fastify.post('/ai/draft', { preHandler: [authController.authMiddleware] }, aiController.generateDraftOnly);

  // Departments
  fastify.get('/departments', { preHandler: [authController.authMiddleware] }, async (req, reply) => {
    const { companyId } = req.query || {};
    const { department } = req.server.container.repositories;
    const result = await department.findActiveByCompany(Number(companyId) || 1);
    return reply.send({ ok: true, data: result.rows });
  });

  // Dashboard
  fastify.get('/dashboard/stats', { preHandler: [authController.authMiddleware] }, dashboardController.getStats);
  fastify.get('/dashboard/activity', { preHandler: [authController.authMiddleware] }, dashboardController.getRecentActivity);
  fastify.get('/dashboard/full', { preHandler: [authController.authMiddleware] }, dashboardController.getDashboardStats);

  // Contacts
  fastify.get('/contacts', { preHandler: [authController.authMiddleware] }, contactController.listContacts);
  fastify.post('/contacts', { preHandler: [authController.authMiddleware] }, contactController.createContact);
  fastify.get('/contacts/:id', { preHandler: [authController.authMiddleware] }, contactController.getContact);
  fastify.put('/contacts/:id', { preHandler: [authController.authMiddleware] }, contactController.updateContact);
  fastify.post('/contacts/start-conversation', { preHandler: [authController.authMiddleware] }, contactController.startConversation);

  // Instances
  fastify.get('/instances', { preHandler: [requirePermission('instances:read')] }, instanceController.listInstances);
  fastify.post('/instances', { preHandler: [requirePermission('instances:create')] }, instanceController.createInstance);
  fastify.get('/instances/:id', { preHandler: [requirePermission('instances:read')] }, instanceController.getInstance);
  fastify.put('/instances/:id', { preHandler: [requirePermission('instances:update')] }, instanceController.updateInstance);
  fastify.delete('/instances/:id', { preHandler: [requirePermission('instances:delete')] }, instanceController.deleteInstance);
  fastify.post('/instances/:id/connect', { preHandler: [requirePermission('instances:connect')] }, instanceController.connectInstance);
  fastify.post('/instances/:id/disconnect', { preHandler: [requirePermission('instances:connect')] }, instanceController.disconnectInstance);

  // Instances - setup webhook
  fastify.post('/instances/setup-webhook', { preHandler: [requirePermission('instances:update')] }, async (req, reply) => {
    const { url, instanceName } = req.body || {};
    if (!url) return reply.code(400).send({ ok: false, error: 'url obrigatoria' });
    const evolutionProvider = req.server.container.providers.evolution;
    const name = instanceName || evolutionProvider.instanceName;
    try {
      const response = await fetch(`${evolutionProvider.baseUrl}/webhook/set/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionProvider.apiKey },
        body: JSON.stringify({
          webhook: { enabled: true, url, webhookByEvents: false, events: ['MESSAGES_UPSERT', 'SEND_MESSAGE', 'CONNECTION_UPDATE'] }
        })
      });
      const data = await response.json();
      return reply.send({ ok: true, data });
    } catch (error) {
      return reply.code(502).send({ ok: false, error: error.message });
    }
  });

  // External send-message (API key auth)
  const { verifyApiKey } = require('../../../lib/security');
  fastify.post('/send-message', async (req, reply) => {
    const providedKey = req.headers['x-api-key'] || req.query.api_key;
    const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'omnichat-secret-key-change-me';
    if (!providedKey) return reply.code(401).send({ ok: false, error: 'API key nao fornecida' });
    if (providedKey !== INTERNAL_API_KEY) return reply.code(403).send({ ok: false, error: 'API key invalida' });

    const { phone, message, company_id } = req.body || {};
    if (!phone || !message) return reply.code(400).send({ ok: false, error: 'phone e message obrigatorios' });

    try {
      const { contact: contactRepo, conversation: conversationRepo } = req.server.container.repositories;
      const chatService = req.server.container.services.chat;
      const companyId = Number(company_id) || 1;

      let contactResult = await contactRepo.findByPhone(companyId, phone);
      let contact;
      if (contactResult.rowCount === 0) {
        contactResult = await contactRepo.create({ companyId, name: phone, phone });
        contact = contactResult.rows[0];
      } else {
        contact = contactResult.rows[0];
      }

      let convResult = await conversationRepo.findByContactAndStatus(companyId, contact.id, 'whatsapp', ['pending', 'queued', 'in_progress']);
      let conversationId;
      if (convResult.rowCount > 0) {
        conversationId = convResult.rows[0].id;
      } else {
        convResult = await conversationRepo.create({ companyId, contactId: contact.id, channel: 'whatsapp', status: 'pending' });
        conversationId = convResult.rows[0].id;
      }

      const sentMessage = await chatService.sendMessage(conversationId, message, null);

      return reply.send({ ok: true, message: sentMessage });
    } catch (error) {
      return reply.code(500).send({ ok: false, error: error.message });
    }
  });

  // Simulation endpoints (for testing without WhatsApp)
  fastify.post('/simulate/message', messageController.simulateWebhook);
  fastify.post('/simulate/batch', messageController.simulateBatch);

  // Webhook (Evolution API)
  fastify.post('/webhook', webhookController.receiveWebhook);
}

module.exports = routes;