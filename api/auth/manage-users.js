/**
 * API de Gestão de Usuários
 * Endpoint: /api/auth/manage-users
 * 
 *Funcionalidades:
 * - Listar usuários (filtrado por empresa para admin/master)
 * - Criar novo usuário com role específico
 * - Atualizar role de usuário
 * - Desativar usuário
 * 
 * Requerimentos:
 * - MASTER: pode gerenciar todas as empresas
 * - ADMIN: pode gerenciar usuários da sua empresa
 * - LEADER: pode ver usuários do seu departamento
 */

const { getSupabase } = require('../../lib/db');
const { checkPermission } = require('../../lib/permissions');

function getUserFromToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  try {
    const jwt = require('jsonwebtoken');
    const token = authHeader.slice(7);
    return jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
  } catch (e) {
    return null;
  }
}

function unauthorized(res, message = 'Não autorizado') {
  return res.status(403).json({ ok: false, error: message });
}

function forbidden(res, message = 'Acesso negado') {
  return res.status(403).json({ ok: false, error: message });
}

// GET /api/auth/manage-users - Listar usuários
async function listUsers(req, res) {
  const authHeader = req.headers.authorization;
  const decoded = getUserFromToken(authHeader);
  
  if (!decoded) {
    return unauthorized(res, 'Token inválido');
  }

  const { company_id, role, department_id } = decoded;
  const { companyId, departmentId, page = 1, limit = 50 } = req.query || {};

  const userContext = { 
    id: decoded.userId, 
    role, 
    company_id,
    department_id 
  };

  if (!checkPermission(userContext, 'users:read')) {
    return forbidden(res, 'Sem permissão para listar usuários');
  }

  try {
    const supabase = getSupabase();
    let query = supabase
      .from('users')
      .select('id, name, email, role, company_id, department_id, is_active, created_at')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit);

    // MASTER pode filtrar por qualquer empresa
    if (role === 'master') {
      if (companyId) {
        query = query.eq('company_id', parseInt(companyId));
      }
    } else {
      // ADMIN/LEADER só veem usuários da mesma empresa
      query = query.eq('company_id', company_id);
      
      // LEADER só vê usuários do mesmo departamento
      if (role === 'leader' && department_id) {
        query = query.eq('department_id', department_id);
      }
    }

    const { data: users, error } = await query;

    if (error) throw error;

    // Contagem total
    let countQuery = supabase.from('users').select('id', { count: 'exact', head: true });
    if (role === 'master' && companyId) {
      countQuery = countQuery.eq('company_id', parseInt(companyId));
    } else {
      countQuery = countQuery.eq('company_id', company_id);
    }
    const { count } = await countQuery;

    res.json({
      ok: true,
      data: { users, total: count, page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ ok: false, error: 'Erro ao listar usuários' });
  }
}

// POST /api/auth/manage-users - Criar usuário
async function createUser(req, res) {
  const authHeader = req.headers.authorization;
  const decoded = getUserFromToken(authHeader);
  
  if (!decoded) {
    return unauthorized(res, 'Token inválido');
  }

  const { company_id, role, department_id } = decoded;
  const { name, email, password, role: userRole, departmentId, companyId } = req.body || {};

  const userContext = { 
    id: decoded.userId, 
    role, 
    company_id,
    department_id 
  };

  if (!checkPermission(userContext, 'users:create')) {
    return forbidden(res, 'Sem permissão para criar usuários');
  }

  if (!name || !email || !password || !userRole) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Nome, email, senha e role são obrigatórios' 
    });
  }

  // Validações de role
  const validRoles = ['admin', 'leader', 'agent'];
  if (!validRoles.includes(userRole)) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Role inválida. Use: admin, leader ou agent' 
    });
  }

  // MASTER pode criar para qualquer empresa
  // ADMIN só pode criar para sua empresa
  let targetCompanyId;
  if (role === 'master' && companyId) {
    targetCompanyId = parseInt(companyId);
  } else {
    targetCompanyId = company_id;
  }

  try {
    const supabase = getSupabase();
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        company_id: targetCompanyId,
        name,
        email,
        password: hashedPassword,
        role: userRole,
        department_id: departmentId || null,
        is_active: true
      })
      .select('id, name, email, role, company_id, department_id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ ok: false, error: 'Email já cadastrado' });
      }
      throw error;
    }

    res.status(201).json({
      ok: true,
      message: `Usuário ${userRole} criado com sucesso`,
      data: user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ ok: false, error: 'Erro ao criar usuário' });
  }
}

// PUT /api/auth/manage-users - Atualizar usuário
async function updateUser(req, res) {
  const authHeader = req.headers.authorization;
  const decoded = getUserFromToken(authHeader);
  
  if (!decoded) {
    return unauthorized(res, 'Token inválido');
  }

  const { company_id, role, department_id } = decoded;
  const { userId, name, role: newRole, departmentId, isActive } = req.body || {};

  const userContext = { 
    id: decoded.userId, 
    role, 
    company_id,
    department_id 
  };

  if (!checkPermission(userContext, 'users:update')) {
    return forbidden(res, 'Sem permissão para atualizar usuários');
  }

  if (!userId) {
    return res.status(400).json({ ok: false, error: 'ID do usuário é obrigatório' });
  }

  try {
    const supabase = getSupabase();

    // Primeiro, buscar o usuário para verificar empresa
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('company_id, department_id')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
    }

    // Verificar acesso à empresa do usuário
    if (role !== 'master' && targetUser.company_id !== company_id) {
      return forbidden(res, 'Não pode editar usuário de outra empresa');
    }

    // Verificar se pode alterar role (só master/admin)
    if (newRole && !checkPermission(userContext, 'users:update')) {
      return forbidden(res, 'Sem permissão para alterar role');
    }

    const updates = {};
    if (name) updates.name = name;
    if (newRole) updates.role = newRole;
    if (departmentId !== undefined) updates.department_id = departmentId;
    if (isActive !== undefined) updates.is_active = isActive;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, name, email, role, company_id, department_id, is_active')
      .single();

    if (error) throw error;

    res.json({
      ok: true,
      message: 'Usuário atualizado com sucesso',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ ok: false, error: 'Erro ao atualizar usuário' });
  }
}

// DELETE /api/auth/manage-users - Desativar usuário
async function deleteUser(req, res) {
  const authHeader = req.headers.authorization;
  const decoded = getUserFromToken(authHeader);
  
  if (!decoded) {
    return unauthorized(res, 'Token inválido');
  }

  const { company_id, role } = decoded;
  const { userId } = req.body || {};

  const userContext = { 
    id: decoded.userId, 
    role, 
    company_id 
  };

  if (!checkPermission(userContext, 'users:delete')) {
    return forbidden(res, 'Sem permissão para excluir usuários');
  }

  if (!userId) {
    return res.status(400).json({ ok: false, error: 'ID do usuário é obrigatório' });
  }

  try {
    const supabase = getSupabase();

    // Verificar se o usuário pertence à mesma empresa
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
    }

    if (role !== 'master' && targetUser.company_id !== company_id) {
      return forbidden(res, 'Não pode excluir usuário de outra empresa');
    }

    // Não permite excluir a si mesmo
    if (userId === decoded.userId) {
      return res.status(400).json({ ok: false, error: 'Não pode excluir seu próprio usuário' });
    }

    // Desativar em vez de excluir (soft delete)
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', userId);

    if (error) throw error;

    res.json({ ok: true, message: 'Usuário desativado com sucesso' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ ok: false, error: 'Erro ao desativar usuário' });
  }
}

// Router
module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return listUsers(req, res);
  }
  if (req.method === 'POST') {
    return createUser(req, res);
  }
  if (req.method === 'PUT') {
    return updateUser(req, res);
  }
  if (req.method === 'DELETE') {
    return deleteUser(req, res);
  }
  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
};