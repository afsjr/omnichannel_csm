/**
 * API de Update Password
 * Endpoint: POST /api/auth/update-password
 * 
 * Redefine senha do usuário via Supabase Auth
 * Recebe o access_token do frontend (extraído do hash URL)
 */

const { updatePassword } = require('../../lib/auth-supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { access_token, password } = req.body || {};

  if (!access_token) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Token de acesso inválido ou expirado' 
    });
  }

  if (!password) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Nova senha é obrigatória' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      ok: false,
      error: 'Senha deve ter pelo menos 6 caracteres'
    });
  }

  try {
    const result = await updatePassword(access_token, password);

    if (!result.success) {
      return res.status(400).json({ 
        ok: false, 
        error: result.error || 'Não foi possível atualizar a senha' 
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Senha atualizada com sucesso!'
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ ok: false, error: 'Erro ao atualizar senha' });
  }
};