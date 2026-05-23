const SupabaseBaseRepository = require('./SupabaseBaseRepository');

class UserRepository extends SupabaseBaseRepository {
  constructor(database) {
    super(database, 'users');
  }

  async findByEmail(email) {
    const { data, error } = await this.client
      .from('users')
      .select('*, departments(name)')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return { rows: data ? [this.formatUserData(data)] : [], rowCount: data ? 1 : 0 };
  }

  async findByCompany(companyId) {
    const { data, error } = await this.client
      .from('users')
      .select('*, departments(name)')
      .eq('company_id', companyId)
      .order('name');

    if (error) throw error;
    return { rows: data?.map(u => this.formatUserData(u)) || [], rowCount: data?.length || 0 };
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('users')
      .select('*, departments(name)')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return { rows: data ? [this.formatUserData(data)] : [], rowCount: data ? 1 : 0 };
  }

  async create(data) {
    const insertData = {
      company_id: data.companyId,
      department_id: data.departmentId || null,
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role || 'agent'
    };

    const { data: result, error } = await this.client
      .from('users')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return { rows: [this.formatUserData(result)], rowCount: 1 };
  }

  async update(id, data) {
    const updateData = { updated_at: new Date().toISOString() };
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (data.departmentId !== undefined) updateData.department_id = data.departmentId;
    if (data.email) updateData.email = data.email;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: result, error } = await this.client
      .from('users')
      .update(updateData)
      .eq('id', Number(id))
      .select('*, departments(name)')
      .single();

    if (error) throw error;
    return { rows: [this.formatUserData(result)], rowCount: 1 };
  }

  async setActiveStatus(userId, isActive) {
    return this.update(userId, { isActive });
  }

  async setOnlineStatus(userId, isOnline) {
    const { data, error } = await this.client
      .from('users')
      .update({ is_online: isOnline })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { rows: [data], rowCount: 1 };
  }

  formatUserData(user) {
    return {
      ...user,
      department_name: user.departments?.name
    };
  }
}

module.exports = UserRepository;