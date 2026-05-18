const { supabase } = require('../lib/db');

module.exports = async (req, res) => {
  console.log('DB Test: Starting...');
  
  try {
    console.log('DB Test: Querying contacts...');
    
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, name, phone')
      .limit(3);

    console.log('DB Test: contacts result:', { data: contacts, error });

    if (error) {
      console.log('DB Test: Error:', error);
      return res.status(500).json({ 
        ok: false, 
        error: error.message,
        code: error.code 
      });
    }

    return res.status(200).json({ 
      ok: true, 
      contacts: contacts || [],
      count: contacts?.length || 0
    });
  } catch (err) {
    console.log('DB Test: Catch error:', err);
    return res.status(500).json({ 
      ok: false, 
      error: err.message 
    });
  }
};