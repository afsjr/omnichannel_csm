const { verifyApiKey } = require('../lib/security');
const { supabase } = require('../lib/db');

async function login(req, res) {
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
          role: user.role,
          department_id: user.department_id
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ ok: false, error: 'Erro ao fazer login' });
  }
}

async function register(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { name, email, password, company_id } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, error: 'Nome, email e senha são obrigatórios' });
  }

  try {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        company_id: company_id || 1,
        name,
        email,
        password: hashedPassword,
        role: 'agent'
      })
      .select('id, name, email, role, department_id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ ok: false, error: 'Email já cadastrado' });
      }
      throw error;
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user.id, companyId: user.company_id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      ok: true,
      data: { user, token }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ ok: false, error: 'Erro ao criar usuário' });
  }
}

async function me(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Token não fornecido' });
  }

  const token = authHeader.slice(7);

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, department_id, company_id')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ ok: false, error: 'Usuário não encontrado' });
    }

    return res.status(200).json({ ok: true, data: { user } });
  } catch (error) {
    return res.status(401).json({ ok: false, error: 'Token inválido' });
  }
}

module.exports = async (req, res) => {
  const { url } = req;

  console.log('Auth API called:', url, 'method:', req.method);

  if (url.includes('/login')) {
    return login(req, res);
  }

  if (url.includes('/register')) {
    return register(req, res);
  }

  if (url.includes('/me')) {
    return me(req, res);
  }

  return res.status(404).json({ ok: false, error: 'Endpoint não encontrado' });
};