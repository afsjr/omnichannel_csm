/**
 * API de Registro - Sem bcrypt
 */

const crypto = require('crypto');

module.exports = async (req, res) => {
  console.log('Register: Starting...');
  
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
    
    // Use crypto instead of bcrypt
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    console.log('Register: Password hashed with SHA256');

    const insertResult = await supabase
      .from('users')
      .insert({
        company_id: 1,
        name,
        email,
        password: hashedPassword,
        role: 'admin',
        is_active: true
      })
      .select('id, name, email, role');

    console.log('Register: Insert result', JSON.stringify(insertResult));

    if (insertResult.error) {
      return res.status(400).json({ 
        ok: false, 
        error: insertResult.error.message,
        details: insertResult.error
      });
    }

    return res.status(201).json({
      ok: true,
      message: 'Usuário criado com sucesso!',
      user: insertResult.data[0]
    });
  } catch (error) {
    console.error('Register: Catch error', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message,
      stack: error.stack
    });
  }
};