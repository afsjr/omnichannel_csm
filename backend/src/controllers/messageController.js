const { sendMessageToEvolution } = require('../services/evolutionService');

async function sendMessage(req, reply) {
  const { number, message } = req.body || {};

  if (!number || !message) {
    return reply.code(400).send({ ok: false, error: 'number e message sao obrigatorios' });
  }

  const result = await sendMessageToEvolution({ number, message });
  return reply.send({ ok: true, sent: true, provider: result });
}

module.exports = {
  sendMessage
};
