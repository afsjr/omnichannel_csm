/**
 * API de Registro
 * Endpoint: POST /api/register
 */

const { getSupabase } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, error: 'Nome, email e senha são obrigatórios' });
  }

  try {
    const supabase = getSupabase();
    const bcrypt = require('bcrypt');
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        company_id: 1,
        name,
        email,
        password: hashedPassword,
        role: role || 'agent',
        is_active: true
      })
      .select('id, name, email, role')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ ok: false, error: 'Email já cadastrado' });
      }
      throw error;
    }

    res.status(201).json({ ok: true, data: user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
};