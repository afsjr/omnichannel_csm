/**
 * API de Registro
 * Endpoint: POST /api/register
 * 
 * Cria usuário com confirmação por email via Supabase Auth
 */

const { createUserWithConfirmation, listUsers, setUserActive } = require('../lib/auth');
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

  // Validação básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ ok: false, error: 'Email inválido' });
  }

  // Validação de senha (mínimo 6 caracteres)
  if (password.length < 6) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Senha deve ter pelo menos 6 caracteres' 
    });
  }

  try {
    // 1. Primeiro cria usuário no Supabase Auth (envia email de confirmação)
    const authResult = await createUserWithConfirmation(email, password, {
      metadata: { name }
    });

    if (!authResult.ok) {
      return res.status(400).json({ 
        ok: false, 
        error: authResult.error 
      });
    }

    // 2. Depois cria registro na tabela users com referência
    const supabase = getSupabase();
    
    // Busca empresa do usuário (pode ser recebida ou usa a padrão)
    const targetCompanyId = company_id || 1;
    
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        company_id: targetCompanyId,
        name,
        email,
        role: role || 'agent',
        is_active: true  // Usuário ativo, mas precisa confirmar email
      })
      .select('id, name, email, role')
      .single();

    if (error) {
      // Se falhar na tabela users, ainda assim o usuário foi criado no Auth
      // Pode acontecer se já existir registro órfão
      console.error('User table error:', error);
      
      return res.status(201).json({ 
        ok: true, 
        message: 'Usuário criado! Verifique seu email para confirmar o cadastro.',
        email_confirmed: false
      });
    }

    return res.status(201).json({
      ok: true,
      message: 'Usuário criado! Verifique seu email para confirmar o cadastro.',
      email_confirmed: false,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ ok: false, error: 'Erro ao criar usuário' });
  }
};