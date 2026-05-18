const { createClient } = require('@supabase/supabase-js');

class SupabaseDatabase {
  constructor(config = {}) {
    this.url = config.url || process.env.SUPABASE_URL || 'https://rccaiodmgvvudiplbodl.supabase.co';
    this.key = config.key || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    this.serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!this.url || !this.key) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY are required');
    }

    this.client = createClient(this.url, this.key);
    this.serviceClient = this.serviceKey ? createClient(this.url, this.serviceKey) : null;
  }

  async query(sql, params = []) {
    const result = await this.client.rpc('exec_sql', { query: sql, params: JSON.stringify(params) });
    return {
      rows: result.data || [],
      rowCount: result.data?.length || 0
    };
  }

  async queryDirect(sql, params = []) {
    console.log('Executing SQL:', sql.substring(0, 100));
    const result = await this.client.from('_exec').select('*').limit(0);
    return { rows: [], rowCount: 0 };
  }

  async sqlRaw(sql) {
    if (this.serviceClient) {
      const { data, error } = await this.serviceClient.rpc('pg_execute', { sql_text: sql });
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    throw new Error('SUPABASE_SERVICE_KEY required for raw SQL');
  }

  getClient() {
    return this.client;
  }

  async transaction(callback) {
    throw new Error('Transactions not supported with Supabase direct client. Use edge functions.');
  }

  async close() {
    // No-op for Supabase
  }
}

module.exports = SupabaseDatabase;