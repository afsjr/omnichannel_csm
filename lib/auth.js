/**
 * Módulo de Autenticação via Supabase Auth
 * Gerencia criação de usuários com confirmação por email
 */

const { createClient } = require('@supabase/supabase-js');

// Cliente de admin para operações privilegiadas
function getAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Cria usuário com confirmação por email
 * O Supabase vai enviar email de confirmação automaticamente
 * 
 * @param {string} email - Email do usuário
 * @param {string} password - Senha
 * @param {object} options - Opções adicionais (metadata, etc)
 * @returns {Promise<object>} Dados do usuário criado
 */
async function createUserWithConfirmation(email, password, options = {}) {
  const supabase = getAdminClient();
  
  try {
    // Cria usuário com email confirmation
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,  //false = envia email de confirmação
      user_metadata: options.metadata || {},
      email_redirect_to: options.redirectUrl || null
    });

    if (error) {
      throw error;
    }

    return {
      ok: true,
      user: data.user,
      message: 'Usuário criado. Verifique o email para confirmar cadastro.'
    };
  } catch (error) {
    console.error('Create user error:', error);
    
    // Tratamento de erros comuns
    if (error.message.includes('already been registered')) {
      return { ok: false, error: 'Email já está cadastrado' };
    }
    
    return { ok: false, error: error.message };
  }
}

/**
 * Confirma email do usuário usando token
 * 
 * @param {string} token - Token de confirmação
 * @returns {Promise<object>}
 */
async function confirmEmail(token) {
  const supabase = getAdminClient();
  
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    });

    if (error) throw error;
    
    return { ok: true, user: data.user };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Envia email de redefinição de senha
 * 
 * @param {string} email - Email do usuário
 * @returns {Promise<object>}
 */
async function sendPasswordReset(email) {
  const supabase = getAdminClient();
  
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.PASSWORD_RESET_REDIRECT || 'https://omnichannel-csm.vercel.app/reset-password'
    });

    if (error) throw error;
    
    return { ok: true, message: 'Email de redefinição de senha enviado' };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Lista usuários (admin only)
 * 
 * @param {number} companyId - ID da empresa
 * @returns {Promise<object>}
 */
async function listUsers(companyId) {
  const supabase = getAdminClient();
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, company_id, department_id, is_active, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return { ok: true, users: data || [] };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Ativa/desativa usuário
 * 
 * @param {number} userId - ID do usuário
 * @param {boolean} isActive - Ativar ou desativar
 * @returns {Promise<object>}
 */
async function setUserActive(userId, isActive) {
  const supabase = getAdminClient();
  
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, name, email, is_active')
      .single();

    if (error) throw error;
    
    return { ok: true, user: data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

module.exports = {
  createUserWithConfirmation,
  confirmEmail,
  sendPasswordReset,
  listUsers,
  setUserActive,
  getAdminClient
};