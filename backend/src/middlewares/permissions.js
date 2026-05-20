const ROLES = {
  MASTER: 'master',
  ADMIN: 'admin',
  LEADER: 'leader',
  AGENT: 'agent'
};

const PERMISSIONS = {
  'users:create': [ROLES.MASTER, ROLES.ADMIN],
  'users:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'users:update': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'users:delete': [ROLES.MASTER, ROLES.ADMIN],

  'team:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'team:manage': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],

  'conversations:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER, ROLES.AGENT],
  'conversations:read_all': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'conversations:assign': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'conversations:transfer': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'conversations:resolve': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER, ROLES.AGENT],

  'messages:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER, ROLES.AGENT],
  'messages:send': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER, ROLES.AGENT],

  'instances:create': [ROLES.MASTER, ROLES.ADMIN],
  'instances:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'instances:update': [ROLES.MASTER, ROLES.ADMIN],
  'instances:delete': [ROLES.MASTER, ROLES.ADMIN],
  'instances:connect': [ROLES.MASTER, ROLES.ADMIN],

  'settings:read': [ROLES.MASTER, ROLES.ADMIN],
  'settings:write': [ROLES.MASTER, ROLES.ADMIN],

  'reports:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'reports:export': [ROLES.MASTER, ROLES.ADMIN],

  'departments:create': [ROLES.MASTER, ROLES.ADMIN],
  'departments:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'departments:update': [ROLES.MASTER, ROLES.ADMIN],
  'departments:delete': [ROLES.MASTER, ROLES.ADMIN],

  'companies:create': [ROLES.MASTER],
  'companies:read': [ROLES.MASTER],
  'companies:update': [ROLES.MASTER],
  'companies:delete': [ROLES.MASTER]
};

function checkPermission(user, permission) {
  if (!user || !user.role) {
    return false;
  }

  if (user.role === ROLES.MASTER) {
    return true;
  }

  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    return true;
  }

  return allowedRoles.includes(user.role);
}

function canAccessCompany(user, targetCompanyId) {
  if (!user) return false;

  if (user.role === ROLES.MASTER) {
    return true;
  }

  return Number(user.company_id) === Number(targetCompanyId);
}

function requirePermission(permission) {
  return (req, reply, done) => {
    const authService = req.server.container?.services?.auth;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ ok: false, error: 'Não autenticado' });
    }

    const token = authHeader.substring(7);
    let user;

    if (authService) {
      user = authService.verifyToken(token);
    } else {
      const { AuthService } = require('../services/AuthService');
      user = new AuthService().verifyToken(token);
    }

    if (!user) {
      return reply.code(401).send({ ok: false, error: 'Token inválido' });
    }

    req.user = user;

    if (!checkPermission(user, permission)) {
      return reply.code(403).send({
        ok: false,
        error: `Permissão negada: ${permission}`,
        your_role: user.role
      });
    }

    done();
  };
}

module.exports = {
  ROLES,
  PERMISSIONS,
  checkPermission,
  canAccessCompany,
  requirePermission
};
