const webhookController = require('../controllers/webhookController');
const messageController = require('../controllers/messageController');

async function routes(fastify) {
  fastify.get('/health', async () => ({ ok: true }));
  fastify.post('/webhook', webhookController.receiveWebhook);
  fastify.post('/send', messageController.sendMessage);
}

module.exports = routes;
