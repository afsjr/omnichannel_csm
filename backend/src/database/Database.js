const { createClient } = require('@supabase/supabase-js');

class SupabaseDatabase {
  constructor(config = {}) {
    this.url = config.url || process.env.SUPABASE_URL || 'https://rccaiodmgvvudiplbodl.supabase.co';
    this.key = config.key || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    this.serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!this.url || !this.key) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY are required');
    }

    const ws = require('ws');
    this.client = createClient(this.url, this.key, {
      realtime: { transport: ws }
    });
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

class SupabaseBaseRepository {
  constructor(database, tableName) {
    if (!database || !database.client) {
      throw new Error('SupabaseDatabase instance required');
    }
    this.db = database;
    this.tableName = tableName;
    this.client = database.client;
  }

  async findById(id) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
  }

  async findAll(filters = {}) {
    let query = this.client.from(this.tableName).select('*');

    if (filters.where) {
      for (const [key, value] of Object.entries(filters.where)) {
        query = query.eq(key, value);
      }
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  async create(data) {
    const formatted = {};
    for (const [key, value] of Object.entries(data)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      formatted[dbKey] = value;
    }

    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(formatted)
      .select()
      .single();

    if (error) throw error;
    return { rows: [result], rowCount: 1 };
  }

  async update(id, data) {
    const formatted = {};
    for (const [key, value] of Object.entries(data)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      formatted[dbKey] = value;
    }

    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(formatted)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { rows: [result], rowCount: 1 };
  }

  async delete(id) {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { rows: [], rowCount: 1 };
  }

  async count(filters = {}) {
    let query = this.client.from(this.tableName).select('*', { count: 'exact', head: true });

    if (filters.where) {
      for (const [key, value] of Object.entries(filters.where)) {
        query = query.eq(key, value);
      }
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }
}

module.exports = { SupabaseDatabase, SupabaseBaseRepository };