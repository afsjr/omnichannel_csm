module.exports = async (req, res) => {
  const envStatus = {
    SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING',
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL ? 'SET' : 'MISSING',
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY ? 'SET' : 'MISSING',
    EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE ? 'SET' : 'MISSING',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV || 'not set'
  };

  res.status(200).json({ ok: true, env: envStatus });
};