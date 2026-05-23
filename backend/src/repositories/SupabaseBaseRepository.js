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

module.exports = SupabaseBaseRepository;
