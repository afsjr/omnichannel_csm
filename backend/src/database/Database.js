const { createClient } = require('@supabase/supabase-js');

class SupabaseDatabase {
  constructor(config = {}) {
    this.url = config.url || process.env.SUPABASE_URL || 'https://rccaiodmgvvudiplbodl.supabase.co';
    this.key = config.key || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    this.serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!this.url || !this.key) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY are required');
    }

    let ws;
    try { ws = require('ws'); } catch {}
    this.client = createClient(this.url, this.key, ws ? {
      realtime: { transport: ws }
    } : {});
    this.serviceClient = this.serviceKey ? createClient(this.url, this.serviceKey) : null;
  }

  async query(sql, params = []) {
    try {
      const result = await this.client.rpc('exec_sql', { query: sql, params: JSON.stringify(params) });
      return { rows: result.data || [], rowCount: result.data?.length || 0 };
    } catch {
      if (this.serviceClient) {
        const { data, error } = await this.serviceClient.rpc('pg_execute', { sql_text: sql });
        if (error) throw error;
        return { rows: data || [], rowCount: data?.length || 0 };
      }
      return { rows: [], rowCount: 0 };
    }
  }

  getClient() {
    return this.client;
  }

  async sqlRaw(sql) {
    if (this.serviceClient) {
      const { data, error } = await this.serviceClient.rpc('pg_execute', { sql_text: sql });
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    }
    throw new Error('SUPABASE_SERVICE_KEY required for raw SQL');
  }

  async close() {}
}

module.exports = SupabaseDatabase;