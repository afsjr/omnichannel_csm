/**
 * API de Registro - Supabase Auth
 * Endpoint: POST /api/auth/signup
 * 
 * Cria novo usuário com confirmação de email via Supabase
 */

const { signUp } = require('../../lib/auth-supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { email, password, name } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Email e senha são obrigatórios' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      ok: false,
      error: 'Senha deve ter pelo menos 6 caracteres'
    });
  }

  try {
    const result = await signUp(email, password, {
      metadata: { name: name || '' },
      redirectTo: `${req.headers.origin || 'https://omnichannel-csm.vercel.app'}/confirm`
    });

    if (!result.success) {
      if (result.code === 'user_already_exists') {
        return res.status(400).json({ 
          ok: false, 
          error: 'Este email já está cadastrado' 
        });
      }
      return res.status(400).json({ 
        ok: false, 
        error: result.error 
      });
    }

    res.status(201).json({
      ok: true,
      message: 'Conta criada! Confirme seu email para acessar.',
      data: {
        userId: result.data.user?.id,
        email: result.data.user?.email
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ ok: false, error: 'Erro ao criar conta' });
  }
};