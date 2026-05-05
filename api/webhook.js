const { saveIncomingMessage } = require('../lib/messages');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const payload = req.body || {};
    const saved = await saveIncomingMessage(payload);
    res.status(200).json({ ok: true, message: saved });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Erro ao processar webhook' });
  }
};
