/**
 * API de Login
 * Endpoint: POST /api/login
 * 
 * Usa Supabase Auth para autenticar e busca role na tabela users
 */

const { signIn } = require('../lib/auth-supabase');
const { getSupabase } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email e senha são obrigatórios' });
  }

  try {
    const result = await signIn(email, password);

    if (!result.success) {
      return res.status(401).json({ ok: false, error: result.error || 'Credenciais inválidas' });
    }

    const supabase = getSupabase();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role, company_id, department_id, is_active')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ ok: false, error: 'Usuário não encontrado no sistema' });
    }

    if (!userData.is_active) {
      return res.status(401).json({ ok: false, error: 'Usuário inativo' });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: userData.id, companyId: userData.company_id, role: userData.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      ok: true,
      data: {
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          company_id: userData.company_id,
          department_id: userData.department_id
        },
        token,
        accessToken: result.data.accessToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ ok: false, error: 'Erro ao fazer login' });
  }
};