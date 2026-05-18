/**
 * API de Setup Inicial
 * Cria usuário admin master para primeira configuração
 */

const { getSupabase } = require('../lib/db');

module.exports = async (req, res) => {
  // Apenas para desenvolvimento - remover em produção!
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ ok: false, error: 'Disponível apenas em desenvolvimento' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { email, password, name, role } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ 
      ok: false, 
      error: 'email e password são obrigatórios' 
    });
  }

  try {
    const supabase = getSupabase();
    const bcrypt = require('bcrypt');
    
    const hashedPassword = await bcrypt.hash(password, 10);

    // Busca empresa padrão
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
      .single();

    if (!company) {
      return res.status(400).json({ ok: false, error: 'Nenhuma empresa encontrada' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        company_id: company.id,
        name: name || 'Admin',
        email,
        password: hashedPassword,
        role: role || 'admin',
        is_active: true
      })
      .select('id, name, email, role')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ ok: false, error: 'Email já existe' });
      }
      throw error;
    }

    return res.status(201).json({ 
      ok: true, 
      message: 'Usuário criado com sucesso!',
      user 
    });
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};