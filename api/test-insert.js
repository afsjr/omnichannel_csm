const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    
    if (!url || !key) {
      return res.json({ ok: false, error: 'env missing' });
    }
    
    const supabase = createClient(url, key);
    
    // Teste simples - tenta inserir
    const { data, error } = await supabase
      .from('users')
      .insert({
        company_id: 1,
        name: 'Teste',
        email: 'teste' + Date.now() + '@test.com',
        password: crypto.createHash('sha256').update('123').digest('hex'),
        role: 'agent',
        is_active: true
      })
      .select('*');
    
    if (error) {
      return res.json({ ok: false, error: JSON.stringify(error) });
    }
    
    res.json({ ok: true, data });
  } catch (e) {
    res.json({ ok: false, error: e.message, stack: e.stack });
  }
};