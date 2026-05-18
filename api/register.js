const { supabase } = require('../lib/db');

module.exports = async (req, res) => {
  console.log('Register API called:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, error: 'Nome, email e senha são obrigatórios' });
  }

  try {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        company_id: 1,
        name,
        email,
        password: hashedPassword,
        role: 'admin'
      })
      .select('id, name, email, role')
      .single();

    if (error) {
      console.error('Register error:', error);
      if (error.code === '23505') {
        return res.status(400).json({ ok: false, error: 'Email já cadastrado' });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }

    res.status(201).json({ ok: true, data: user });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
};