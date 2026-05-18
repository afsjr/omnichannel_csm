const { verifyApiKey } = require('../lib/security');
const { sendMessageToEvolution } = require('../lib/evolution');
const { sendMessageByPhone } = require('../lib/messages');

module.exports = async (req, res) => {
  if (!verifyApiKey(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const { phone, message, company_id } = req.body || {};
    
    if (!phone || !message) {
      res.status(400).json({ ok: false, error: 'phone e message são obrigatórios' });
      return;
    }

    const evolutionResult = await sendMessageToEvolution({ number: phone, message });
    
    const saved = await sendMessageByPhone({
      companyId: Number(company_id || 1),
      phone,
      content: message,
      senderId: null
    });

    res.status(200).json({ 
      ok: true, 
      evolution: evolutionResult.simulated ? { simulated: true } : { id: evolutionResult.id },
      message: saved
    });
  } catch (error) {
    console.error('Send error:', error);
    res.status(500).json({ ok: false, error: 'Erro ao enviar mensagem' });
  }
};