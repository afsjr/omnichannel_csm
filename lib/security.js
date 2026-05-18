const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'omnichat-secret-key-change-me';

function verifyApiKey(req, res, next) {
  const providedKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!providedKey) {
    res.status(401).json({ ok: false, error: 'API key não fornecida' });
    return false;
  }

  if (providedKey !== INTERNAL_API_KEY) {
    res.status(403).json({ ok: false, error: 'API key inválida' });
    return false;
  }

  return true;
}

function verifyEvolutionWebhook(req, res, next) {
  const apiKey = req.headers['apikey'];
  
  if (!apiKey) {
    res.status(401).json({ ok: false, error: 'Evolution API key não fornecida' });
    return false;
  }

  if (apiKey !== process.env.EVOLUTION_API_KEY) {
    res.status(403).json({ ok: false, error: 'Evolution API key inválida' });
    return false;
  }

  return true;
}

module.exports = {
  verifyApiKey,
  verifyEvolutionWebhook,
  INTERNAL_API_KEY
};