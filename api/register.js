/**
 * API de Registro
 * Endpoint: POST /api/register
 * 
 * CORREÇÕES FEITAS (2026-05-19):
 * - Trocado SHA256 por bcrypt para hash de senhas (segurança)
 * - Padrão: bcrypt com salt de 10 rodadas
 */

const bcrypt = require('bcrypt');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Nome, email e senha são obrigatórios' 
    });
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ ok: false, error: 'Banco não configurado' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tenta inserir
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        company_id: 1,
        name,
        email,
        password: hashedPassword,
        role: 'admin',
        is_active: true
      })
      .select('id, name, email, role')
      .single();

    if (error) {
      return res.status(400).json({ 
        ok: false, 
        error: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details
      });
    }

    return res.status(201).json({
      ok: true,
      version: 'v2-crypto',
      message: 'Usuário criado com sucesso!',
      user
    });
  } catch (error) {
    return res.status(500).json({ 
      ok: false, 
      error: error.message,
      version: 'v2-crypto'
    });
  }
};