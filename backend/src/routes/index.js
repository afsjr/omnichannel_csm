const authController = require('../controllers/authController');
const messageController = require('../controllers/messageController');
const webhookController = require('../controllers/webhookController');
const aiController = require('../controllers/aiController');
const dashboardController = require('../controllers/dashboardController');

async function routes(fastify) {
  fastify.get('/health', async () => ({ ok: true }));

  fastify.post('/webhook', webhookController.receiveWebhook);

  fastify.post('/auth/login', authController.login);
  fastify.post('/auth/register', authController.register);
  fastify.get('/auth/me', { preHandler: [authController.authMiddleware] }, authController.me);
  fastify.post('/auth/logout', authController.logout);

  fastify.post('/messages/send', messageController.sendMessage);
  fastify.get('/messages/conversation/:id', messageController.getConversation);
  fastify.get('/messages/queue', messageController.getQueue);
  fastify.get('/messages/my-conversations', messageController.getMyConversations);
  fastify.post('/messages/assign', messageController.assignConversation);
  fastify.post('/messages/draft', messageController.updateDraft);
  fastify.post('/messages/resolve', messageController.resolveConversation);

  fastify.post('/ai/triage', aiController.processTriage);
  fastify.post('/ai/draft', aiController.generateDraft);
  fastify.post('/ai/process-queue', aiController.processQueue);
  fastify.get('/ai/jobs/:jobId', aiController.getJobStatus);
  fastify.get('/ai/jobs', aiController.getPendingJobs);

  fastify.get('/departments', async (req, reply) => {
    const { companyId } = req.query || {};
    const { departmentRepository } = req.server.container.repositories;
    const result = await departmentRepository.findActiveByCompany(Number(companyId) || 1);
    return reply.send({ ok: true, data: result.rows });
  });

  fastify.get('/dashboard/stats', dashboardController.getStats);
  fastify.get('/dashboard/activity', dashboardController.getRecentActivity);
}

module.exports = routes;