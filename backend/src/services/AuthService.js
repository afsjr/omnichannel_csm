const bcrypt = require('bcrypt');
const crypto = require('crypto');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'omnichat-secret-change-in-production';

class AuthService {
  hashPassword(password) {
    return bcrypt.hashSync(password, SALT_ROUNDS);
  }

  comparePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  }

  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      company_id: user.company_id,
      role: user.role
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

      return JSON.parse(Buffer.from(body, 'base64url').toString());
    } catch {
      return null;
    }
  }
}

module.exports = AuthService;