let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('DB: Missing credentials');
      return null;
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('DB: Client initialized');
    return supabase;
  } catch (err) {
    console.error('DB: Init error:', err.message);
    return null;
  }
}

module.exports = {
  get supabase() {
    return getSupabase();
  },
  getSupabase
};