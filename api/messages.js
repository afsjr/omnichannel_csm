const { listMessagesByCompany } = require('../lib/messages');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const companyId = Number(req.query.company_id || 1);
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const data = await listMessagesByCompany(companyId, limit);
    res.status(200).json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Erro ao listar mensagens' });
  }
};
