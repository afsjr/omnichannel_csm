const { SupabaseBaseRepository } = require('../database/Database');

class DepartmentRepository extends SupabaseBaseRepository {
  constructor(database) {
    super(database, 'departments');
  }

  async findByCompany(companyId) {
    const { data, error } = await this.client
      .from('departments')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  async findActiveByCompany(companyId) {
    const { data, error } = await this.client
      .from('departments')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('departments')
      .select(`
        *,
        conversations(count),
        users(count)
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      return { rows: [], rowCount: 0 };
    }

    return {
      rows: [{
        ...data,
        conversation_count: data.conversations?.[0]?.count || 0,
        user_count: data.users?.[0]?.count || 0
      }],
      rowCount: 1
    };
  }
}

module.exports = DepartmentRepository;