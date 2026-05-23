const { getSupabase } = require('../lib/db');
const { listUsers, setUserActive } = require('../lib/auth');
const { getAction } = require('../lib/route-helper');

const BASE = '/api/users';

async function handleListUsers(req, res) {
  const companyId = Number(req.query.company_id || 1);
  try {
    const supabase = getSupabase();
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, company_id, department_id, is_active, is_online, team_leader_id, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.status(200).json({ ok: true, data: users || [], count: users?.length || 0 });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

async function handleUpdateUser(req, res, userId) {
  const { name, role, department_id } = req.body || {};
  const updateData = { updated_at: new Date().toISOString() };
  if (name) updateData.name = name;
  if (role) updateData.role = role;
  if (department_id !== undefined) updateData.department_id = department_id;
  try {
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users').update(updateData).eq('id', Number(userId)).select('id, name, email, role, department_id').single();
    if (error) throw error;
    return res.status(200).json({ ok: true, data: user });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

async function handleActivateUser(req, res, userId) {
  const { is_active } = req.body || {};
  if (is_active === undefined) return res.status(400).json({ ok: false, error: 'is_active é obrigatório' });
  try {
    const result = await setUserActive(Number(userId), is_active);
    if (!result.ok) return res.status(400).json({ ok: false, error: result.error });
    return res.status(200).json({ ok: true, data: result.user, message: is_active ? 'Usuário ativado' : 'Usuário desativado' });
  } catch (error) {
    console.error('Activate user error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

module.exports = async (req, res) => {
  const action = getAction(req, BASE);

  try {
    if (!action) {
      if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
      return handleListUsers(req, res);
    }

    const parts = action.split('/');
    const id = parts[0];
    const sub = parts[1];

    if (!/^\d+$/.test(id)) return res.status(404).json({ ok: false, error: 'Endpoint não encontrado' });

    if (sub === 'activate' && req.method === 'PUT') return handleActivateUser(req, res, id);
    if (req.method === 'PUT' || req.method === 'PATCH') return handleUpdateUser(req, res, id);

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
