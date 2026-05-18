/**
 * API de Login
 * 
 * Autentica usuários e retorna token JWT para sessões.
 * 
 * Endpoint: POST /api/login
 * 
 * @example
 * // Request
 * curl -X POST https://omnichannel-csm.vercel.app/api/login \
 *   -H "Content-Type: application/json" \
 *   -d '{"email": "admin@csm.com", "password": "123456"}'
 * 
 * // Response
 * {
 *   "ok": true,
 *   "data": {
 *     "user": { "id": 1, "name": "Admin", "email": "admin@csm.com", "role": "admin" },
 *     "token": "eyJhbGci..."
 *   }
 * }
 */

const { getSupabase } = require('../lib/db');

/**
 * Valida credenciais e retorna token JWT
 */
module.exports = async (req, res) => {
  // Apenas aceita método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { email, password } = req.body || {};

  // Valida campos obrigatórios
  if (!email || !password) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Email e senha são obrigatórios' 
    });
  }

  try {
    const supabase = getSupabase();
    
    // 1. Busca usuário pelo email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ ok: false, error: 'Usuário não encontrado' });
    }

    // 2. Valida senha com bcrypt
    // Nota: Em produção, considere usar Supabase Auth
    const bcrypt = require('bcrypt');
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ ok: false, error: 'Senha incorreta' });
    }

    // 3. Gera token JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user.id, companyId: user.company_id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    // 4. Retorna dados do usuário (sem a senha!) e token
    return res.status(200).json({
      ok: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ ok: false, error: 'Erro ao fazer login' });
  }
};