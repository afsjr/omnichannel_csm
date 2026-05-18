/**
 * API de Registro
 * Endpoint: POST /api/register
 * 
 * Cria usuário com possibilidade de confirmação por email
 */

const { createUserWithConfirmation } = require('../lib/auth');
const { getSupabase } = require('../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { name, email, password, role, company_id } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Nome, email e senha são obrigatórios' 
    });
  }

  // Validação de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ ok: false, error: 'Email inválido' });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Senha deve ter pelo menos 6 caracteres' 
    });
  }

  try {
    // 1. Tenta criar no Supabase Auth (para enviar email de confirmação)
    const authResult = await createUserWithConfirmation(email, password, {
      metadata: { name }
    });

    // Não блокируем se Auth falhar - continuamos com criação direta
    
    // 2. Cria usuário na tabela users
    const supabase = getSupabase();
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const targetCompanyId = company_id || 1;

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        company_id: targetCompanyId,
        name,
        email,
        password: hashedPassword,
        role: role || 'agent',
        is_active: true
      })
      .select('id, name, email, role')
      .single();

    if (error) {
      // Verifica se é duplicado
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Email já está cadastrado' 
        });
      }
      throw error;
    }

    // Define mensagem baseada no resultado do Auth
    const message = authResult.ok 
      ? 'Usuário criado! Verifique seu email para confirmar o cadastro.' 
      : 'Usuário criado com sucesso!';

    return res.status(201).json({
      ok: true,
      message,
      email_confirmed: !!authResult.ok,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message,
      details: error.stack
    });
  }
};