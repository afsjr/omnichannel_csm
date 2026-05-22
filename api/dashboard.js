const { getSupabase } = require('../lib/db');
const { getAction, getUserFromToken } = require('../lib/route-helper');

const BASE = '/api/dashboard';

module.exports = async (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ ok: false, error: 'Token inválido' });
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  const action = getAction(req, BASE);
  const cid = Number(req.query.companyId || user.companyId || 1);
  const db = getSupabase();

  try {
    if (action === 'full') {
      const [{count:open},{count:pending},{count:resolved},{count:totalContacts},{data:recent}] = await Promise.all([
        db.from('conversations').select('id',{count:'exact',head:true}).eq('company_id',cid).eq('status','in_progress'),
        db.from('conversations').select('id',{count:'exact',head:true}).eq('company_id',cid).eq('status','pending'),
        db.from('conversations').select('id',{count:'exact',head:true}).eq('company_id',cid).eq('status','resolved'),
        db.from('contacts').select('id',{count:'exact',head:true}).eq('company_id',cid),
        db.from('conversations').select('*, contacts(name,phone)').eq('company_id',cid).order('updated_at',{ascending:false}).limit(5)
      ]);
      return res.json({ ok: true, data: { stats: { open, pending, resolved, totalConversations: open+pending+resolved, totalContacts }, recentConversations: recent||[] } });
    }

    const [{count:open},{count:pending},{count:resolved}] = await Promise.all([
      db.from('conversations').select('id',{count:'exact',head:true}).eq('company_id',cid).eq('status','in_progress'),
      db.from('conversations').select('id',{count:'exact',head:true}).eq('company_id',cid).eq('status','pending'),
      db.from('conversations').select('id',{count:'exact',head:true}).eq('company_id',cid).eq('status','resolved')
    ]);
    return res.json({ ok: true, data: { open, pending, resolved } });
  } catch(e) { return res.status(500).json({ ok: false, error: e.message }); }
};
