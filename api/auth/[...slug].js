const { getSupabase } = require('../../lib/db');
const { checkPermission } = require('../../lib/permissions');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

function getUserFromToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.slice(7), JWT_SECRET);
  } catch { return null; }
}

async function login(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email e senha são obrigatórios' });
  }
  try {
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, password, role, company_id, department_id, is_active')
      .eq('email', email)
      .eq('is_active', true)
      .single();
    if (error || !user) {
      return res.status(401).json({ ok: false, error: 'Usuário não encontrado ou inativo' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ ok: false, error: 'Senha incorreta' });
    }
    const token = jwt.sign(
      { userId: user.id, companyId: user.company_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.status(200).json({
      ok: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company_id: user.company_id,
          department_id: user.department_id
        },
        token,
        refresh_token: token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ ok: false, error: 'Erro ao fazer login' });
  }
}

async function register(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, error: 'Nome, email e senha são obrigatórios' });
  }
  try {
    const supabase = getSupabase();
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
      .single();
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        company_id: company?.id || 1,
        name,
        email,
        password: hashedPassword,
        role: 'agent',
        is_active: true
      })
      .select('id, name, email, role')
      .single();
    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ ok: false, error: 'Email já cadastrado' });
      }
      throw error;
    }
    return res.status(201).json({ ok: true, data: user });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

async function me(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  const decoded = getUserFromToken(req.headers.authorization);
  if (!decoded) {
    return res.status(401).json({ ok: false, error: 'Token não fornecido ou inválido' });
  }
  try {
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, department_id, company_id')
      .eq('id', decoded.userId)
      .single();
    if (error || !user) {
      return res.status(401).json({ ok: false, error: 'Usuário não encontrado' });
    }
    return res.status(200).json({ ok: true, data: { user } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Erro ao buscar usuário' });
  }
}

async function refresh(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  const authHeader = req.headers.authorization;
  const decoded = getUserFromToken(authHeader);
  if (!decoded) {
    return res.status(401).json({ ok: false, error: 'Token inválido ou expirado' });
  }
  try {
    const token = jwt.sign(
      { userId: decoded.userId, companyId: decoded.companyId, role: decoded.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.status(200).json({
      ok: true,
      data: { token, refresh_token: token }
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Erro ao renovar token' });
  }
}

async function logout(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  return res.status(200).json({ ok: true, message: 'Logout realizado' });
}

async function manageUsers(req, res) {
  const decoded = getUserFromToken(req.headers.authorization);
  if (!decoded) {
    return res.status(401).json({ ok: false, error: 'Token inválido' });
  }
  const { company_id, role, department_id } = decoded;
  const userContext = { id: decoded.userId, role, company_id, department_id };
  const supabase = getSupabase();

  if (req.method === 'GET') {
    if (!checkPermission(userContext, 'users:read')) {
      return res.status(403).json({ ok: false, error: 'Sem permissão para listar usuários' });
    }
    try {
      const { companyId, departmentId, page = 1, limit = 50 } = req.query || {};
      let query = supabase
        .from('users')
        .select('id, name, email, role, company_id, department_id, is_active, created_at')
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit);
      if (role === 'master') {
        if (companyId) query = query.eq('company_id', parseInt(companyId));
      } else {
        query = query.eq('company_id', company_id);
        if (role === 'leader' && department_id) {
          query = query.eq('department_id', department_id);
        }
      }
      const { data: users } = await query;
      let countQuery = supabase.from('users').select('id', { count: 'exact', head: true });
      if (role === 'master' && companyId) {
        countQuery = countQuery.eq('company_id', parseInt(companyId));
      } else {
        countQuery = countQuery.eq('company_id', company_id);
      }
      const { count } = await countQuery;
      return res.json({ ok: true, data: { users, total: count, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'Erro ao listar usuários' });
    }
  }

  if (req.method === 'POST') {
    if (!checkPermission(userContext, 'users:create')) {
      return res.status(403).json({ ok: false, error: 'Sem permissão para criar usuários' });
    }
    const { name, email, password: pwd, role: userRole, departmentId, companyId } = req.body || {};
    if (!name || !email || !pwd || !userRole) {
      return res.status(400).json({ ok: false, error: 'Nome, email, senha e role são obrigatórios' });
    }
    const validRoles = ['admin', 'leader', 'agent'];
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({ ok: false, error: 'Role inválida. Use: admin, leader ou agent' });
    }
    let targetCompanyId;
    if (role === 'master' && companyId) {
      targetCompanyId = parseInt(companyId);
    } else {
      targetCompanyId = company_id;
    }
    try {
      const hashedPassword = await bcrypt.hash(pwd, 10);
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          company_id: targetCompanyId, name, email,
          password: hashedPassword, role: userRole,
          department_id: departmentId || null, is_active: true
        })
        .select('id, name, email, role, company_id, department_id')
        .single();
      if (error) {
        if (error.code === '23505') return res.status(400).json({ ok: false, error: 'Email já cadastrado' });
        throw error;
      }
      return res.status(201).json({ ok: true, message: `Usuário ${userRole} criado com sucesso`, data: user });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'Erro ao criar usuário' });
    }
  }

  if (req.method === 'PUT') {
    if (!checkPermission(userContext, 'users:update')) {
      return res.status(403).json({ ok: false, error: 'Sem permissão para atualizar usuários' });
    }
    const { userId: updateId, name, role: newRole, departmentId, isActive } = req.body || {};
    if (!updateId) {
      return res.status(400).json({ ok: false, error: 'ID do usuário é obrigatório' });
    }
    try {
      const { data: targetUser, error: fetchError } = await supabase
        .from('users').select('company_id').eq('id', updateId).single();
      if (fetchError || !targetUser) {
        return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
      }
      if (role !== 'master' && targetUser.company_id !== company_id) {
        return res.status(403).json({ ok: false, error: 'Não pode editar usuário de outra empresa' });
      }
      const updates = {};
      if (name) updates.name = name;
      if (newRole) updates.role = newRole;
      if (departmentId !== undefined) updates.department_id = departmentId;
      if (isActive !== undefined) updates.is_active = isActive;
      const { data: user, error } = await supabase
        .from('users').update(updates).eq('id', updateId)
        .select('id, name, email, role, company_id, department_id, is_active').single();
      if (error) throw error;
      return res.json({ ok: true, message: 'Usuário atualizado com sucesso', data: user });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'Erro ao atualizar usuário' });
    }
  }

  if (req.method === 'DELETE') {
    if (!checkPermission(userContext, 'users:delete')) {
      return res.status(403).json({ ok: false, error: 'Sem permissão para excluir usuários' });
    }
    const { userId: delId } = req.body || {};
    if (!delId) {
      return res.status(400).json({ ok: false, error: 'ID do usuário é obrigatório' });
    }
    try {
      const { data: targetUser, error: fetchError } = await supabase
        .from('users').select('company_id').eq('id', delId).single();
      if (fetchError || !targetUser) {
        return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
      }
      if (role !== 'master' && targetUser.company_id !== company_id) {
        return res.status(403).json({ ok: false, error: 'Não pode excluir usuário de outra empresa' });
      }
      if (delId === decoded.userId) {
        return res.status(400).json({ ok: false, error: 'Não pode excluir seu próprio usuário' });
      }
      await supabase.from('users').update({ is_active: false }).eq('id', delId);
      return res.json({ ok: true, message: 'Usuário desativado com sucesso' });
    } catch (error) {
      return res.status(500).json({ ok: false, error: 'Erro ao desativar usuário' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}

module.exports = async (req, res) => {
  const segments = req.query.slug || [];
  const action = segments[0];

  switch (action) {
    case 'login': return login(req, res);
    case 'register': return register(req, res);
    case 'me': return me(req, res);
    case 'refresh': return refresh(req, res);
    case 'logout': return logout(req, res);
    case 'manage-users': return manageUsers(req, res);
    default:
      return res.status(404).json({ ok: false, error: 'Endpoint não encontrado' });
  }
};
