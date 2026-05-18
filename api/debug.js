const { supabase } = require('../lib/db');

const DEBUG_ENABLED = process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true';

module.exports = async (req, res) => {
  if (!DEBUG_ENABLED) {
    return res.status(404).json({ ok: false, error: 'Endpoint não encontrado' });
  }

  try {
    const debug = {
      supabaseUrl: process.env.SUPABASE_URL ? '✓ configurado' : '✗ não encontrado',
      supabaseKey: process.env.SUPABASE_SERVICE_KEY ? '✓ configurado' : '✗ não encontrado',
      evolutionUrl: process.env.EVOLUTION_API_URL ? '✓ configurado' : '✗ não encontrado',
      evolutionKey: process.env.EVOLUTION_API_KEY ? '✓ configurado' : '✗ não encontrado',
      evolutionInstance: process.env.EVOLUTION_INSTANCE ? '✓ configurado' : '✗ não encontrado'
    };

    if (req.query.test === 'db') {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, phone')
        .limit(5);
      
      return res.status(200).json({ 
        ok: true, 
        debug,
        dbTest: error ? { error: error.message } : { contacts: data, count: data?.length || 0 }
      });
    }

    res.status(200).json({ ok: true, debug });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};