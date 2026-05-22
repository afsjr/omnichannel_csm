const { getSupabase } = require('../../lib/db');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

function getUserFromToken(h) {
  if (!h?.startsWith('Bearer ')) return null;
  try { const j = require('jsonwebtoken'); return j.verify(h.slice(7), JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ ok: false, error: 'Token inválido' });

  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  const { companyId } = req.query || {};
  try {
    const db = getSupabase();
    let q = db.from('departments').select('*').eq('is_active', true);
    if (companyId) q = q.eq('company_id', Number(companyId));
    const { data } = await q.order('name');
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
