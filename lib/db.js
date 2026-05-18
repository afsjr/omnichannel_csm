const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  
  console.log('DB: Initializing...');
  console.log('DB: ENV - URL:', process.env.SUPABASE_URL ? 'present' : 'missing');
  console.log('DB: ENV - KEY:', process.env.SUPABASE_SERVICE_KEY ? 'present' : 'missing');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('DB: Missing credentials');
    return null;
  }
  
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('DB: Client initialized successfully');
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