/**
 * API de Reset de Senha
 * Endpoint: POST /api/auth/reset-password
 * 
 * Envia email com link para redefinição de senha via Supabase
 */

const { resetPassword } = require('../../lib/auth-supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Email é obrigatório' 
    });
  }

  try {
    const result = await resetPassword(email);

    if (!result.success) {
      return res.status(400).json({ 
        ok: false, 
        error: result.error 
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Email de redefinição enviado! Verifique sua caixa de entrada.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ ok: false, error: 'Erro ao processar solicitação' });
  }
};