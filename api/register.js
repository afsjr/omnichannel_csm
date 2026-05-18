/**
 * API de Registro de Usuários
 * 
 * Cria novos usuários no sistema (atendentes).
 * Útil para criar contas de acesso ao sistema.
 * 
 * Endpoint: POST /api/register
 * 
 * @example
 * // Request
 * curl -X POST https://omnichannel-csm.vercel.app/api/register \
 *   -H "Content-Type: application/json" \
 *   -d '{"name": "João Atendente", "email": "joao@empresa.com", "password": "senha123"}'
 * 
 * // Response
 * {
 *   "ok": true,
 *   "data": {
 *     "id": 5,
 *     "name": "João Atendente",
 *     "email": "joao@empresa.com",
 *     "role": "agent"
 *   }
 * }
 */

const { getSupabase } = require('../lib/db');

module.exports = async (req, res) => {
  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { name, email, password, company_id } = req.body || {};

  // Validação básica
  if (!name || !email || !password) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Nome, email e senha são obrigatórios' 
    });
  }

  try {
    const supabase = getSupabase();
    const bcrypt = require('bcrypt');
    
    // Hash da senha antes de salvar (nunca salve senhas em texto!)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Cria o usuário
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        company_id: company_id || 1,
        name,
        email,
        password: hashedPassword,
        role: 'agent'  // Por padrão, novos usuários são agentes
      })
      .select('id, name, email, role')
      .single();

    if (error) {
      // Código 23505 = violação de unicidade (email duplicado)
      if (error.code === '23505') {
        return res.status(400).json({ ok: false, error: 'Email já cadastrado' });
      }
      throw error;
    }

    // Retorna sucesso (sem senha!)
    res.status(201).json({ ok: true, data: user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ ok: false, error: 'Erro ao criar usuário' });
  }
};