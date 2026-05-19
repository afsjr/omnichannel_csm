const AuthService = require('../services/AuthService');

const authService = new AuthService();

async function login(req, reply) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return reply.code(400).send({ ok: false, error: 'email e senha sao obrigatorios' });
  }

  const { user, session } = req.server.container.repositories;

  const result = await user.findByEmail(email);
  const userData = result.rows[0];

  if (!userData) {
    return reply.code(401).send({ ok: false, error: 'Credenciais invalidas' });
  }

  if (!authService.comparePassword(password, userData.password)) {
    return reply.code(401).send({ ok: false, error: 'Credenciais invalidas' });
  }

  await user.setOnlineStatus(userData.id, true);

  const token = authService.generateToken(userData);
  const refreshToken = authService.generateRefreshToken();
  const expiresAt = authService.getRefreshExpiration();

  await session.create({
    userId: userData.id,
    refreshToken,
    expiresAt
  });

  const { password: _, ...safeUser } = userData;

  return reply.send({
    ok: true,
    data: {
      user: safeUser,
      token,
      refresh_token: refreshToken,
      expires_at: expiresAt.toISOString()
    }
  });
}

async function register(req, reply) {
  const { name, email, password, companyId, departmentId, role } = req.body || {};
  const { user, session } = req.server.container.repositories;

  if (!name || !email || !password) {
    return reply.code(400).send({ ok: false, error: 'name, email e password sao obrigatorios' });
  }

  const existing = await user.findByEmail(email);
  if (existing.rowCount > 0) {
    return reply.code(409).send({ ok: false, error: 'Email ja cadastrado' });
  }

  const hashedPassword = authService.hashPassword(password);

  const result = await user.create({
    name,
    email,
    password: hashedPassword,
    companyId: companyId || 1,
    departmentId,
    role
  });

  const newUser = result.rows[0];
  const token = authService.generateToken(newUser);
  const refreshToken = authService.generateRefreshToken();
  const expiresAt = authService.getRefreshExpiration();

  await session.create({
    userId: newUser.id,
    refreshToken,
    expiresAt
  });

  const { password: _, ...safeUser } = newUser;

  return reply.code(201).send({
    ok: true,
    data: { user: safeUser, token, refresh_token: refreshToken, expires_at: expiresAt.toISOString() }
  });
}

async function me(req, reply) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ ok: false, error: 'Token nao fornecido' });
  }

  const token = authHeader.substring(7);
  const payload = authService.verifyToken(token);

  if (!payload) {
    return reply.code(401).send({ ok: false, error: 'Token invalido' });
  }

  const { user } = req.server.container.repositories;
  const result = await user.findById(payload.id);

  if (result.rowCount === 0) {
    return reply.code(404).send({ ok: false, error: 'Usuario nao encontrado' });
  }

  const { password: _, ...userData } = result.rows[0];
  return reply.send({ ok: true, data: { user: userData } });
}

async function refreshToken(req, reply) {
  const { refresh_token } = req.body || {};

  if (!refresh_token) {
    return reply.code(400).send({ ok: false, error: 'refresh_token é obrigatório' });
  }

  const { session, user } = req.server.container.repositories;

  const sessionResult = await session.findByToken(refresh_token);
  const sessionData = sessionResult.rows[0];

  if (!sessionData) {
    return reply.code(401).send({ ok: false, error: 'Refresh token inválido' });
  }

  if (new Date(sessionData.expires_at) < new Date()) {
    await session.deleteByToken(refresh_token);
    return reply.code(401).send({ ok: false, error: 'Refresh token expirado' });
  }

  const userResult = await user.findById(sessionData.user_id);
  const userData = userResult.rows[0];

  if (!userData) {
    await session.deleteByToken(refresh_token);
    return reply.code(401).send({ ok: false, error: 'Usuário não encontrado' });
  }

  await session.deleteByToken(refresh_token);

  const token = authService.generateToken(userData);
  const newRefreshToken = authService.generateRefreshToken();
  const expiresAt = authService.getRefreshExpiration();

  await session.create({
    userId: userData.id,
    refreshToken: newRefreshToken,
    expiresAt
  });

  const { password: _, ...safeUser } = userData;

  return reply.send({
    ok: true,
    data: {
      user: safeUser,
      token,
      refresh_token: newRefreshToken,
      expires_at: expiresAt.toISOString()
    }
  });
}

async function logout(req, reply) {
  const authHeader = req.headers.authorization;
  const { refresh_token } = req.body || {};

  if (refresh_token) {
    const { session } = req.server.container.repositories;
    await session.deleteByToken(refresh_token);
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = authService.verifyToken(token);

    if (payload) {
      const { user } = req.server.container.repositories;
      await user.setOnlineStatus(payload.id, false);
    }
  }

  return reply.send({ ok: true });
}

function authMiddleware(req, reply, done) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ ok: false, error: 'Token nao fornecido' });
  }

  const token = authHeader.substring(7);
  const payload = authService.verifyToken(token);

  if (!payload) {
    return reply.code(401).send({ ok: false, error: 'Token invalido' });
  }

  req.user = payload;
  done();
}

module.exports = {
  login,
  register,
  me,
  logout,
  refreshToken,
  authMiddleware
};