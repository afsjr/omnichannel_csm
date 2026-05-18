const { supabase } = require('../lib/db');

module.exports = async (req, res) => {
  console.log('Login API called:', req.method, req.url);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email e senha são obrigatórios' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ ok: false, error: 'Usuário não encontrado' });
    }

    const bcrypt = require('bcrypt');
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ ok: false, error: 'Senha incorreta' });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user.id, companyId: user.company_id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

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