/**
 * Módulo de Autenticação
 * Gerencia criação de usuários com confirmação por email (opcional)
 */

const { getSupabase } = require('./db');

/**
 * Cria usuário com confirmação por email via Supabase Auth
 * Retorna fallback para criação direta se não conseguir usar Auth
 */
async function createUserWithConfirmation(email, password, options = {}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    // Fallback: cria usuário direto sem Supabase Auth
    console.log('Supabase credentials missing, using direct creation');
    return { ok: false, fallback: true };
  }
  
  try {
    // Tenta usar Supabase Auth Admin
    const supabase = getSupabase();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,  // Envia email de confirmação
      user_metadata: options.metadata || {}
    });

    if (error) {
      // Se der erro (ex: email já existe no Auth), tenta fallback
      console.log('Auth creation error:', error.message);
      return { ok: false, fallback: true, error: error.message };
    }

    return { ok: true, user: data.user };
  } catch (err) {
    console.error('Auth error:', err.message);
    return { ok: false, fallback: true };
  }
}

/**
 * Envia email de redefinição de senha via Supabase
 */
async function sendPasswordReset(email) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, error: 'Serviço de email não configurado' };
  }
  
  try {
    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) throw error;
    return { ok: true, message: 'Email enviado' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Lista usuários da empresa
 */
async function listUsers(companyId) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, error: 'Banco não configurado' };
  }
  
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, company_id, department_id, is_active, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return { ok: true, users: data || [] };
}

/**
 * Ativa/desativa usuário
 */
async function setUserActive(userId, isActive) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, error: 'Banco não configurado' };
  }
  
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('users')
    .update({ 
      is_active: isActive, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId)
    .select('id, name, email, is_active')
    .single();

  if (error) throw error;
  return { ok: true, user: data };
}

module.exports = {
  createUserWithConfirmation,
  sendPasswordReset,
  listUsers,
  setUserActive
};