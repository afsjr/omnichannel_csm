/**
 * Supabase Auth - Cliente de autenticação
 * 
 * Fornece funções para:
 * - Registro de usuários com confirmação de email
 * - Login com verificação de credenciais
 * - Reset de senha via email
 * - Atualização de senha
 * - Verificação de sessão
 * 
 * usa @supabase/supabase-js para gerenciar auth no lado do servidor
 */

const { getSupabase } = require('./db');
const supabase = getSupabase();

const REDIRECT_URL = process.env.AUTH_REDIRECT_URL || 'https://omnichannel-csm.vercel.app/confirm';
const UPDATE_PASSWORD_URL = process.env.AUTH_UPDATE_PASSWORD_URL || 'https://omnichannel-csm.vercel.app/update-password';

/**
 * Registrar novo usuário
 * Envia email de confirmação
 */
async function signUp(email, password, options = {}) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: options.redirectTo || REDIRECT_URL,
        data: options.metadata || {}
      }
    });

    if (error) throw error;

    return {
      success: true,
      data: {
        user: data.user,
        session: data.session,
        message: 'Confirme seu email para ativar a conta'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Login com email e senha
 * Retorna sessão se sucesso
 */
async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    return {
      success: true,
      data: {
        user: data.user,
        session: data.session,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Request reset de senha
 * Envia email com link para redefinir senha
 */
async function resetPassword(email) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: UPDATE_PASSWORD_URL
    });

    if (error) throw error;

    return {
      success: true,
      message: 'Email de redefinição enviado. Verifique sua caixa de entrada.'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Atualizar senha (após click no link de reset)
 * Requer token de acesso válido (do link de email)
 */
async function updatePassword(accessToken, newPassword) {
  try {
    const { data, error } = await supabase.auth.updateUser(
      { accessToken },
      { password: newPassword }
    );

    if (error) throw error;

    return {
      success: true,
      message: 'Senha atualizada com sucesso',
      user: data.user
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Trocar senha com senha atual (usuário logado)
 */
async function changePassword(userId, currentPassword, newPassword) {
  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userId.email || userId,
      password: currentPassword
    });

    if (signInError) {
      return { success: false, error: 'Senha atual incorreta' };
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    return {
      success: true,
      message: 'Senha alterada com sucesso'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verificar e validar sessão
 */
async function getSession(accessToken) {
  try {
    const { data, error } = await supabase.auth.getSession(accessToken);

    if (error) throw error;

    return {
      success: true,
      session: data.session,
      user: data.session?.user
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Buscar usuário por ID
 */
async function getUser(userId) {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) throw error;

    return {
      success: true,
      user: data.user
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Logout (invalida sessão)
 */
async function signOut(accessToken) {
  try {
    const { error } = await supabase.auth.signOut(accessToken);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Refresh token para manter sessão ativa
 */
async function refreshSession(refreshToken) {
  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) throw error;

    return {
      success: true,
      session: data.session
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  supabase,
  signUp,
  signIn,
  resetPassword,
  updatePassword,
  changePassword,
  getSession,
  getUser,
  signOut,
  refreshSession
};