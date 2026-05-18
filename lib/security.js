/**
 * Módulo de segurança - Verificação de API Keys
 * 
 * Protege as APIs contra acesso não autorizado usando chaves de API.
 * Este módulo deve ser usado em todas as endpoints que precisam de autenticação.
 * 
 * @example
 * // Para proteger uma rota:
 * const { verifyApiKey } = require('./lib/security');
 * 
 * module.exports = async (req, res) => {
 *   if (!verifyApiKey(req, res)) return;
 *   // ... lógica da rota
 * };
 */

// Chave de API interna - deve ser configurada como variável de ambiente
// Em produção, use uma chave forte e única
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'omnichat-secret-key-change-me';

/**
 * Verifica se a requisição contém uma API Key válida
 * 
 * A chave pode ser enviada via:
 * - Header: X-API-Key
 * - Query param: ?api_key=...
 * 
 * @param {object} req - Objeto de requisição do Express/Fastify
 * @param {object} res - Objeto de resposta do Express/Fastify
 * @returns {boolean} true se válida, false se inválida
 * 
 * @example
 * // Requisição válida:
 * curl -H "X-API-Key: minha-chave-secreta" https://api.exemplo.com/endpoint
 * 
 * // Requisição inválida:
 * curl https://api.exemplo.com/endpoint
 * // Retorna: 401 {"error": "API key não fornecida"}
 */
function verifyApiKey(req, res, next) {
  // Tenta obter a chave do header ou query string
  const providedKey = req.headers['x-api-key'] || req.query.api_key;
  
  // Verifica se a chave foi fornecida
  if (!providedKey) {
    res.status(401).json({ 
      ok: false, 
      error: 'API key não fornecida. Use o header X-API-Key ou ?api_key=...' 
    });
    return false;
  }
  
  // Compara a chave fornecida com a chave configurada
  if (providedKey !== INTERNAL_API_KEY) {
    res.status(403).json({ 
      ok: false, 
      error: 'API key inválida' 
    });
    return false;
  }
  
  return true;
}

/**
 * Verifica a chave de API da Evolution para o webhook
 * 
 * O webhook da Evolution API envia a chave no header 'apikey'.
 * Esta função valida se a requisição vem realmente da Evolution.
 * 
 * @param {object} req - Objeto de requisição
 * @param {object} res - Objeto de resposta
 * @returns {boolean} true se válida, false se inválida
 * 
 * @example
 * // Header esperado da Evolution:
 * apikey: 02E16307DC4C-46EA-BA84-D0B08D394106
 */
function verifyEvolutionWebhook(req, res, next) {
  const apiKey = req.headers['apikey'];
  
  if (!apiKey) {
    res.status(401).json({ 
      ok: false, 
      error: 'Evolution API key não fornecida' 
    });
    return false;
  }
  
  if (apiKey !== process.env.EVOLUTION_API_KEY) {
    res.status(403).json({ 
      ok: false, 
      error: 'Evolution API key inválida' 
    });
    return false;
  }
  
  return true;
}

module.exports = {
  /**
   * Verifica API Key interna para proteger endpoints
   * @type {function}
   */
  verifyApiKey,
  
  /**
   * Verifica API Key da Evolution para webhook
   * @type {function}
   */
  verifyEvolutionWebhook,
  
  /**
   * Chave de API configurada (para uso em verificações diretas)
   * @type {string}
   */
  INTERNAL_API_KEY
};