function getAction(req, base) {
  const original = req.headers['x-vercel-rewrite-original-url'] || req.url;
  const path = (original || '').split('?')[0];
  if (path.startsWith(base + '/')) return path.slice(base.length + 1);
  return '';
}

function getUserFromToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const jwt = require('jsonwebtoken');
    return jwt.verify(authHeader.slice(7), process.env.JWT_SECRET || 'default-secret');
  } catch { return null; }
}

function requireAuth(req, res) {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) { res.status(401).json({ ok: false, error: 'Token inválido' }); return null; }
  return user;
}

module.exports = { getAction, getUserFromToken, requireAuth };
