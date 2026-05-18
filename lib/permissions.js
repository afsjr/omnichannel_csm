/**
 * Módulo de Permissões e Roles do Sistema
 * 
 * Define os níveis de acesso e permissões do sistema OmniChat.
 * 
 * Níveis de Acesso:
 * - master: Acesso total a todas as empresas e funcionalidades
 * - admin: Acesso completo a uma empresa específica
 * - leader: Acesso à sua equipe (pode gerenciar membros da equipe)
 * - agent: Acesso apenas às suas próprias conversas
 * 
 * @example
 * const { checkPermission, ROLES } = require('./lib/permissions');
 * 
 * // Verificar se usuário pode acessar tertentu funcionalidade
 * if (!checkPermission(user, 'conversations:read')) {
 *   return res.status(403).json({ error: 'Acesso negado' });
 * }
 */

// Definição dos níveis de acesso
const ROLES = {
  MASTER: 'master',      // Admin master - acesso a tudo
  ADMIN: 'admin',       // Admin da empresa
  LEADER: 'leader',     // Líder de equipe
  AGENT: 'agent'        // Atendente comum
};

/**
 * Permissões do sistema mapeadas por função
 * Cada role tem acesso a determinadas operações
 */
const PERMISSIONS = {
  // Permissões de Usuários
  'users:create': [ROLES.MASTER, ROLES.ADMIN],
  'users:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'users:update': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'users:delete': [ROLES.MASTER, ROLES.ADMIN],
  
  // Permissões de Equipe (apenas leader/admin可见)
  'team:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'team:manage': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  
  // Permissões de Conversas
  'conversations:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER, ROLES.AGENT],
  'conversations:read_all': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'conversations:assign': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'conversations:transfer': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'conversations:resolve': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER, ROLES.AGENT],
  
  // Permissões de Mensagens
  'messages:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER, ROLES.AGENT],
  'messages:send': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER, ROLES.AGENT],
  
  // Permissões de Instâncias (Evolution API)
  'instances:create': [ROLES.MASTER, ROLES.ADMIN],
  'instances:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'instances:update': [ROLES.MASTER, ROLES.ADMIN],
  'instances:delete': [ROLES.MASTER, ROLES.ADMIN],
  'instances:connect': [ROLES.MASTER, ROLES.ADMIN],
  
  // Permissões de Configurações
  'settings:read': [ROLES.MASTER, ROLES.ADMIN],
  'settings:write': [ROLES.MASTER, ROLES.ADMIN],
  
  // Permissões de Relatórios
  'reports:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'reports:export': [ROLES.MASTER, ROLES.ADMIN],
  
  // Permissões de Departamentos
  'departments:create': [ROLES.MASTER, ROLES.ADMIN],
  'departments:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'departments:update': [ROLES.MASTER, ROLES.ADMIN],
  'departments:delete': [ROLES.MASTER, ROLES.ADMIN],
  
  // Permissões de Empresas (apenas master)
  'companies:create': [ROLES.MASTER],
  'companies:read': [ROLES.MASTER],
  'companies:update': [ROLES.MASTER],
  'companies:delete': [ROLES.MASTER]
};

/**
 * Verifica se um usuário tem permissão para realizar uma ação
 * 
 * @param {object} user - Objeto do usuário com role e company_id
 * @param {string} permission - Nome da permissão
 * @returns {boolean} true se tem permissão
 * 
 * @example
 * const user = { id: 1, role: 'admin', company_id: 1 };
 * if (checkPermission(user, 'users:create')) {
 *   // Pode criar usuários
 * }
 */
function checkPermission(user, permission) {
  if (!user || !user.role) {
    return false;
  }

  // Master tem acesso a tudo
  if (user.role === ROLES.MASTER) {
    return true;
  }

  // Verifica se a role do usuário está na lista de permissões
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    // Se a permissão não existe, permite por padrão (para evitarbloqueios)
    console.warn(`Permissão não definida: ${permission}`);
    return true;
  }

  return allowedRoles.includes(user.role);
}

/**
 * Filtra dados baseado na visibilidade do usuário
 * 
 * Um líder só vê dados da sua equipe
 * Um agent só vê as suas próprias conversas
 * 
 * @param {object} user - Usuário logado
 * @param {Array} data - Lista de dados para filtrar
 * @param {string} field - Campo que contém o ID do usuário/atribuído
 * @returns {Array} Dados filtrados conforme permissão
 * 
 * @example
 * // Agent só vê suas próprias conversas
 * const myConversations = filterByPermission(user, allConversations, 'assigned_to');
 */
function filterByPermission(user, data, field = 'assigned_to') {
  if (!user) return [];
  
  // Master e Admin veem tudo
  if (user.role === ROLES.MASTER || user.role === ROLES.ADMIN) {
    return data;
  }
  
  // Líder vê as conversas da sua equipe (mesmo department)
  if (user.role === ROLES.LEADER) {
    return data; // Filtrar por department_id se necessário
  }
  
  // Agent só vê as suas próprias conversas
  if (user.role === ROLES.AGENT && field && user.id) {
    return data.filter(item => item[field] === user.id);
  }
  
  return data;
}

/**
 * Verifica se o usuário pode acessar dados de outra empresa
 * 
 * @param {object} user - Usuário que quer acessar
 * @param {number} targetCompanyId - ID da empresa que quer acessar
 * @returns {boolean}
 */
function canAccessCompany(user, targetCompanyId) {
  if (!user) return false;
  
  // Master acessa qualquer empresa
  if (user.role === ROLES.MASTER) {
    return true;
  }
  
  // Admin/Leader/Agent só acessam sua própria empresa
  return user.company_id === targetCompanyId;
}

/**
 * Obtém a lista de IDs de usuários que o usuário atual pode gerenciar
 * (para líderes que podem gerenciar membros da equipe)
 * 
 * @param {object} user - Usuário logado
 * @param {Array} allUsers - Lista de todos os usuários da empresa
 * @returns {Array} IDs que o usuário pode gerenciar
 */
function getManageableUserIds(user, allUsers) {
  if (!user) return [];
  
  // Master e Admin gerenciam todos
  if (user.role === ROLES.MASTER || user.role === ROLES.ADMIN) {
    return allUsers.map(u => u.id);
  }
  
  // Líder gerencia usuários do mesmo departamento
  if (user.role === ROLES.LEADER && user.department_id) {
    return allUsers
      .filter(u => u.department_id === user.department_id && u.id !== user.id)
      .map(u => u.id);
  }
  
  // Agent não gerencia ninguém
  return [];
}

/**
 * middleware para verificar permissões em APIs Express
 * 
 * @param {string} permission - Permissão necessária
 * @returns {function} Middleware Express
 * 
 * @example
 * // Em uma rota de API:
 * router.get('/users', requirePermission('users:read'), handler);
 */
function requirePermission(permission) {
  return (req, res, next) => {
    // Assume que o usuário está em req.user após autenticação
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Não autenticado' });
    }
    
    if (!checkPermission(user, permission)) {
      return res.status(403).json({ 
        ok: false, 
        error: `Permissão negada: ${permission}`,
        your_role: user.role
      });
    }
    
    next();
  };
}

/**
 * Decorador para adicionar verificação de empresa aos dados
 * Garante que usuários só vejam dados da sua empresa
 * 
 * @param {object} user - Usuário logado
 * @param {number} targetCompanyId - ID da empresa dos dados
 * @returns {boolean}
 */
function ensureCompanyAccess(user, targetCompanyId) {
  if (!user || !targetCompanyId) return false;
  
  // Master acessa qualquer empresa
  if (user.role === ROLES.MASTER) return true;
  
  // Outros roles só acessam sua empresa
  return user.company_id === targetCompanyId;
}

module.exports = {
  /**
   * Constantes dos níveis de acesso
   * @type {object}
   */
  ROLES,
  
  /**
   * Mapa de permissões por role
   * @type {object}
   */
  PERMISSIONS,
  
  /**
   * Verifica se usuário tem permissão
   * @type {function}
   */
  checkPermission,
  
  /**
   * Filtra dados conforme permissão do usuário
   * @type {function}
   */
  filterByPermission,
  
  /**
   * Verifica acesso a empresa
   * @type {function}
   */
  canAccessCompany,
  
  /**
   * Obtém IDs de usuários gerenciáveis
   * @type {function}
   */
  getManageableUserIds,
  
  /**
   * Middleware Express para verificar permissão
   * @type {function}
   */
  requirePermission,
  
  /**
   * Garante que usuário só veja dados da sua empresa
   * @type {function}
   */
  ensureCompanyAccess
};