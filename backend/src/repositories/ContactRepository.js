const { SupabaseBaseRepository } = require('../database/Database');

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

  normalizePhone(phone) {
    return (phone || '').replace(/\D/g, '');
  }
}

module.exports = ContactRepository;