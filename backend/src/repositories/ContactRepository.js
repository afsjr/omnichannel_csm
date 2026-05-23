const SupabaseBaseRepository = require('./SupabaseBaseRepository');

class ContactRepository extends SupabaseBaseRepository {
  constructor(database) {
    super(database, 'contacts');
  }

  async findByPhone(companyId, phone) {
    const normalizedPhone = this.normalizePhone(phone);
    const { data, error } = await this.client
      .from('contacts')
      .select('*')
      .eq('company_id', companyId)
      .eq('phone', normalizedPhone)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
  }

  async findOrCreate(companyId, name, phone) {
    const normalizedPhone = this.normalizePhone(phone);
    const existing = await this.findByPhone(companyId, normalizedPhone);

    if (existing.rowCount > 0) {
      return existing.rows[0];
    }

    const { data, error } = await this.client
      .from('contacts')
      .insert({
        company_id: companyId,
        name: name || normalizedPhone,
        phone: normalizedPhone
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async create(companyId, name, phone, email = null) {
    const normalizedPhone = this.normalizePhone(phone);
    const { data, error } = await this.client
      .from('contacts')
      .insert({
        company_id: companyId,
        name: name || normalizedPhone,
        phone: normalizedPhone,
        email
      })
      .select()
      .single();

    if (error) throw error;
    return { rows: [data], rowCount: 1 };
  }

  async findAll(companyId, options = {}) {
    let query = this.client
      .from('contacts')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (options.search) {
      query = query.or(`name.ilike.%${options.search}%,phone.ilike.%${options.search}%`);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
  }

  async update(id, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = this.normalizePhone(data.phone);

    const { data: result, error } = await this.client
      .from('contacts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { rows: [result], rowCount: 1 };
  }

  normalizePhone(phone) {
    return (phone || '').replace(/\D/g, '');
  }
}

module.exports = ContactRepository;