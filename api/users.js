const { supabase } = require('../lib/db');

module.exports = async (req, res) => {
  console.log('Users API called:', req.method);
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, company_id, department_id')
      .limit(10);
    
    if (error) {
      console.error('Users error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
    
    res.status(200).json({ 
      ok: true, 
      count: users?.length || 0,
      users 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
};