const authController = require('../controllers/authController');
const messageController = require('../controllers/messageController');
const webhookController = require('../controllers/webhookController');
const aiController = require('../controllers/aiController');
const dashboardController = require('../controllers/dashboardController');
const contactController = require('../controllers/contactController');
const instanceController = require('../controllers/instanceController');
const { requirePermission } = require('../middlewares/permissions');

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

  // Simulation endpoints (for testing without WhatsApp)
  fastify.post('/simulate/message', messageController.simulateWebhook);
  fastify.post('/simulate/batch', messageController.simulateBatch);

  // Webhook (Evolution API)
  fastify.post('/webhook', webhookController.receiveWebhook);

  // Auth
  fastify.post('/auth/login', authController.login);
  fastify.post('/auth/register', authController.register);
  fastify.get('/auth/me', { preHandler: [authController.authMiddleware] }, authController.me);
  fastify.post('/auth/logout', authController.logout);
  fastify.post('/auth/refresh', authController.refreshToken);

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
}

module.exports = routes;