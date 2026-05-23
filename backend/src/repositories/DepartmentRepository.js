const SupabaseBaseRepository = require('./SupabaseBaseRepository');

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
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
  }

  async findByName(name, companyId) {
    let query = this.client
      .from('departments')
      .select('*')
      .ilike('name', name)
      .limit(1);

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
  }
}

module.exports = DepartmentRepository;