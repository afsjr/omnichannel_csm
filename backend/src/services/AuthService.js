const bcrypt = require('bcrypt');
const crypto = require('crypto');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'omnichat-secret-change-in-production';
const JWT_EXPIRATION = '24h';
const REFRESH_EXPIRATION_DAYS = 30;

class AuthService {
  hashPassword(password) {
    return bcrypt.hashSync(password, SALT_ROUNDS);
  }

  comparePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  }

  generateToken(user) {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 24 * 60 * 60;

    const payload = {
      id: user.id,
      email: user.email,
      company_id: user.company_id,
      role: user.role,
      iat: now,
      exp
    };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  verifyToken(token) {
    try {
      const [header, body, signature] = token.split('.');
      const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(body, 'base64url').toString());

      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  generateRefreshToken() {
    return crypto.randomBytes(48).toString('hex');
  }

  getRefreshExpiration() {
    const date = new Date();
    date.setDate(date.getDate() + REFRESH_EXPIRATION_DAYS);
    return date;
  }
}

module.exports = AuthService;