const { saveIncomingMessage } = require('../services/messageService');

async function receiveWebhook(req, reply) {
  const payload = req.body || {};

  const savedMessage = await saveIncomingMessage(payload);
  req.server.io.emit('new_message', savedMessage);

  return reply.send({ ok: true, message: savedMessage });
}

module.exports = {
  receiveWebhook
};
