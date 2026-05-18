/**
 * API de Usuários
 * Endpoints:
 * - GET /api/users - Lista usuários
 * - PUT /api/users/:id - Atualiza usuário
 * - PUT /api/users/:id/activate - Ativa/desativa usuário
 */

const { createClient } = require('@supabase/supabase-js');
const { listUsers, setUserActive } = require('../lib/auth');

/**
 * Lista usuários da empresa
 */
async function handleListUsers(req, res) {
  const companyId = Number(req.query.company_id || 1);
  
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ ok: false, error: 'Banco não configurado' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id, name, email, role, company_id, department_id, 
        is_active, is_online, team_leader_id, created_at
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ 
      ok: true, 
      data: users || [],
      count: users?.length || 0
    });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

/**
 * Atualiza usuário
 */
async function handleUpdateUser(req, res) {
  const match = req.url.match(/\/users\/(\d+)/);
  if (!match) {
    return res.status(400).json({ ok: false, error: 'user_id é obrigatório' });
  }

  const userId = Number(match[1]);
  const { name, role, department_id } = req.body || {};

  const updateData = {};
  if (name) updateData.name = name;
  if (role) updateData.role = role;
  if (department_id !== undefined) updateData.department_id = department_id;
  updateData.updated_at = new Date().toISOString();

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, name, email, role, department_id')
      .single();

    if (error) throw error;

    return res.status(200).json({ ok: true, data: user });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

/**
 * Ativa/desativa usuário
 */
async function handleActivateUser(req, res) {
  const match = req.url.match(/\/users\/(\d+)\/activate/);
  if (!match) {
    return res.status(400).json({ ok: false, error: 'user_id é obrigatório' });
  }

  const userId = Number(match[1]);
  const { is_active } = req.body || {};

  if (is_active === undefined) {
    return res.status(400).json({ ok: false, error: 'is_active é obrigatório' });
  }

  try {
    const result = await setUserActive(userId, is_active);
    
    if (!result.ok) {
      return res.status(400).json({ ok: false, error: result.error });
    }

    return res.status(200).json({ 
      ok: true, 
      data: result.user,
      message: is_active ? 'Usuário ativado' : 'Usuário desativado'
    });
  } catch (error) {
    console.error('Activate user error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

/**
 * Dispatcher principal
 */
module.exports = async (req, res) => {
  const { url } = req;

  try {
    if (url === '/users' || url.startsWith('/users?')) {
      if (req.method !== 'GET') {
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
      }
      return handleListUsers(req, res);
    }

    if (url.match(/\/users\/\d+\/activate/) && req.method === 'PUT') {
      return handleActivateUser(req, res);
    }

    if (url.match(/\/users\/\d+/) && (req.method === 'PUT' || req.method === 'PATCH')) {
      return handleUpdateUser(req, res);
    }

    return res.status(404).json({ ok: false, error: 'Endpoint não encontrado' });
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};