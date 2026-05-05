const { sendMessageToEvolution } = require('../lib/evolution');
const { saveOutgoingMessage } = require('../lib/messages');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const { number, message, company_id } = req.body || {};
    if (!number || !message) {
      res.status(400).json({ ok: false, error: 'number e message sao obrigatorios' });
      return;
    }

    const provider = await sendMessageToEvolution({ number, message });
    const saved = await saveOutgoingMessage({
      companyId: Number(company_id || 1),
      phone: number,
      content: message
    });

    res.status(200).json({ ok: true, provider, message: saved });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Erro ao enviar mensagem' });
  }
};
