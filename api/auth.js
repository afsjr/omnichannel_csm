const { getSupabase } = require('../lib/db');
const { checkPermission } = require('../lib/permissions');
const { getAction, getUserFromToken } = require('../lib/route-helper');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const BASE = '/api/auth';

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, error: 'Email e senha obrigatórios' });
  try {
    const db = getSupabase();
    const { data: user, error } = await db.from('users').select('id, name, email, password, role, company_id, department_id, is_active').eq('email', email).eq('is_active', true).single();
    if (error || !user) return res.status(401).json({ ok: false, error: 'Usuário não encontrado ou inativo' });
    if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ ok: false, error: 'Senha incorreta' });
    const token = jwt.sign({ userId: user.id, companyId: user.company_id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ ok: true, data: { user: { id: user.id, name: user.name, email: user.email, role: user.role, company_id: user.company_id, department_id: user.department_id }, token, refresh_token: token } });
  } catch (e) { return res.status(500).json({ ok: false, error: 'Erro ao fazer login' }); }
}

async function register(req, res) {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ ok: false, error: 'Nome, email e senha obrigatórios' });
  try {
    const db = getSupabase();
    const hashed = await bcrypt.hash(password, 10);
    const { data: company } = await db.from('companies').select('id').limit(1).single();
    const { data: user, error } = await db.from('users').insert({ company_id: company?.id || 1, name, email, password: hashed, role: 'agent', is_active: true }).select('id, name, email, role').single();
    if (error) return error.code === '23505' ? res.status(400).json({ ok: false, error: 'Email já cadastrado' }) : res.status(500).json({ ok: false, error: error.message });
    return res.status(201).json({ ok: true, data: user });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
}

async function me(req, res) {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ ok: false, error: 'Token inválido' });
  try {
    const { data: u, error } = await getSupabase().from('users').select('id, name, email, role, department_id, company_id').eq('id', user.userId).single();
    if (error || !u) return res.status(401).json({ ok: false, error: 'Usuário não encontrado' });
    return res.json({ ok: true, data: { user: u } });
  } catch (e) { return res.status(500).json({ ok: false, error: 'Erro ao buscar usuário' }); }
}

async function refresh(req, res) {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ ok: false, error: 'Token inválido' });
  const token = jwt.sign({ userId: user.userId, companyId: user.companyId, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ ok: true, data: { token, refresh_token: token } });
}

async function logout(req, res) {
  return res.json({ ok: true, message: 'Logout realizado' });
}

async function manageUsers(req, res) {
  const decoded = getUserFromToken(req.headers.authorization);
  if (!decoded) return res.status(401).json({ ok: false, error: 'Token inválido' });
  const { company_id, role, department_id } = decoded;
  const ctx = { id: decoded.userId, role, company_id, department_id };
  const db = getSupabase();

  if (req.method === 'GET') {
    if (!checkPermission(ctx, 'users:read')) return res.status(403).json({ ok: false, error: 'Sem permissão' });
    try {
      const { companyId, page = 1, limit = 50 } = req.query || {};
      let q = db.from('users').select('id, name, email, role, company_id, department_id, is_active, created_at').order('created_at', { ascending: false }).range((page - 1) * limit, page * limit);
      if (role === 'master' && companyId) q = q.eq('company_id', parseInt(companyId));
      else if (role !== 'master') q = q.eq('company_id', company_id);
      const { data: users } = await q;
      let cq = db.from('users').select('id', { count: 'exact', head: true });
      if (role === 'master' && companyId) cq = cq.eq('company_id', parseInt(companyId));
      else cq = cq.eq('company_id', company_id);
      const { count } = await cq;
      return res.json({ ok: true, data: { users, total: count, page: parseInt(page), limit: parseInt(limit) } });
    } catch (e) { return res.status(500).json({ ok: false, error: 'Erro ao listar usuários' }); }
  }

  if (req.method === 'POST') {
    if (!checkPermission(ctx, 'users:create')) return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const { name, email, password: pwd, role: userRole, departmentId, companyId } = req.body || {};
    if (!name || !email || !pwd || !userRole) return res.status(400).json({ ok: false, error: 'Campos obrigatórios' });
    const target = (role === 'master' && companyId) ? parseInt(companyId) : company_id;
    try {
      const hashed = await bcrypt.hash(pwd, 10);
      const { data: user, error } = await db.from('users').insert({ company_id: target, name, email, password: hashed, role: userRole, department_id: departmentId || null, is_active: true }).select('id, name, email, role, company_id, department_id').single();
      if (error) return error.code === '23505' ? res.status(400).json({ ok: false, error: 'Email já cadastrado' }) : res.status(500).json({ ok: false, error: error.message });
      return res.status(201).json({ ok: true, message: `Usuário ${userRole} criado`, data: user });
    } catch (e) { return res.status(500).json({ ok: false, error: 'Erro ao criar' }); }
  }

  if (req.method === 'PUT') {
    if (!checkPermission(ctx, 'users:update')) return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const { userId, name, role: newRole, departmentId, isActive } = req.body || {};
    if (!userId) return res.status(400).json({ ok: false, error: 'ID obrigatório' });
    try {
      const { data: target } = await db.from('users').select('company_id').eq('id', userId).single();
      if (!target) return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
      if (role !== 'master' && target.company_id !== company_id) return res.status(403).json({ ok: false, error: 'Não pode editar de outra empresa' });
      const up = {}; if (name) up.name = name; if (newRole) up.role = newRole; if (departmentId !== undefined) up.department_id = departmentId; if (isActive !== undefined) up.is_active = isActive;
      const { data: user } = await db.from('users').update(up).eq('id', userId).select('id, name, email, role, company_id, department_id, is_active').single();
      return res.json({ ok: true, message: 'Atualizado', data: user });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  }

  if (req.method === 'DELETE') {
    if (!checkPermission(ctx, 'users:delete')) return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ ok: false, error: 'ID obrigatório' });
    try {
      const { data: target } = await db.from('users').select('company_id').eq('id', userId).single();
      if (!target) return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
      if (role !== 'master' && target.company_id !== company_id) return res.status(403).json({ ok: false, error: 'Não pode excluir de outra empresa' });
      if (userId === decoded.userId) return res.status(400).json({ ok: false, error: 'Não pode excluir a si mesmo' });
      await db.from('users').update({ is_active: false }).eq('id', userId);
      return res.json({ ok: true, message: 'Usuário desativado' });
    } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  }

  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}

module.exports = async (req, res) => {
  const action = getAction(req, BASE);

  switch (action) {
    case 'login': return login(req, res);
    case 'register': return register(req, res);
    case 'me': return me(req, res);
    case 'refresh': return refresh(req, res);
    case 'logout': return logout(req, res);
    case 'manage-users': return manageUsers(req, res);
    default:
      return res.status(404).json({ ok: false, error: `Endpoint /api/auth/${action} não encontrado` });
  }
};
