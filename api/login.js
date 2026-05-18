/**
 * API de Login com suporte a Roles
 * 
 * Retorna dados do usuário incluindo seu nível de acesso.
 * 
 * Roles disponíveis:
 * - master: Acesso total a todas as empresas
 * - admin: Acesso total a uma empresa
 * - leader: Pode gerenciar sua equipe
 * - agent: Acesso apenas às suas próprias conversas
 */

const { getSupabase } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Email e senha são obrigatórios' 
    });
  }

  try {
    const supabase = getSupabase();
    
    // Busca usuário com dados adicionais (department, team leader)
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        departments(name),
        team_leader:users!team_leader_id(name)
      `)
      .eq('email', email)
      .eq('is_active', true)  // Apenas usuários ativos
      .single();

    if (error || !user) {
      return res.status(401).json({ ok: false, error: 'Usuário não encontrado ou inativo' });
    }

    // Valida senha
    const bcrypt = require('bcrypt');
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ ok: false, error: 'Senha incorreta' });
    }

    // Gera token JWT com dados completos do usuário
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: user.id, 
        companyId: user.company_id,
        role: user.role,
        departmentId: user.department_id
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    // Atualiza status online
    await supabase
      .from('users')
      .update({ is_online: true })
      .eq('id', user.id);

    // Retorna dados completos do usuário incluindo permissões
    return res.status(200).json({
      ok: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company_id: user.company_id,
          department_id: user.department_id,
          department_name: user.departments?.name,
          team_leader_id: user.team_leader_id,
          team_leader_name: user.team_leader?.name,
          is_online: true,
          created_at: user.created_at
        },
        permissions: getUserPermissions(user.role),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ ok: false, error: 'Erro ao fazer login' });
  }
};

/**
 * Retorna lista de permissões baseadas no role
 */
function getUserPermissions(role) {
  const permissions = {
    master: [
      'users:create', 'users:read', 'users:update', 'users:delete',
      'team:read', 'team:manage',
      'conversations:read', 'conversations:read_all', 'conversations:assign', 'conversations:transfer', 'conversations:resolve',
      'messages:read', 'messages:send',
      'instances:create', 'instances:read', 'instances:update', 'instances:delete', 'instances:connect',
      'settings:read', 'settings:write',
      'reports:read', 'reports:export',
      'departments:create', 'departments:read', 'departments:update', 'departments:delete',
      'companies:create', 'companies:read', 'companies:update', 'companies:delete'
    ],
    admin: [
      'users:create', 'users:read', 'users:update', 'users:delete',
      'team:read', 'team:manage',
      'conversations:read', 'conversations:read_all', 'conversations:assign', 'conversations:transfer', 'conversations:resolve',
      'messages:read', 'messages:send',
      'instances:create', 'instances:read', 'instances:update', 'instances:delete', 'instances:connect',
      'settings:read', 'settings:write',
      'reports:read', 'reports:export',
      'departments:create', 'departments:read', 'departments:update', 'departments:delete'
    ],
    leader: [
      'users:read',
      'team:read',
      'conversations:read', 'conversations:read_all', 'conversations:assign', 'conversations:transfer', 'conversations:resolve',
      'messages:read', 'messages:send',
      'instances:read',
      'reports:read',
      'departments:read'
    ],
    agent: [
      'conversations:read', 'conversations:resolve',
      'messages:read', 'messages:send',
      'departments:read'
    ]
  };

  return permissions[role] || [];
}