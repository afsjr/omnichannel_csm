const { SupabaseBaseRepository } = require('../database/Database');

class InstanceRepository extends SupabaseBaseRepository {
  constructor(database) {
    super(database, 'connections');
  }

  async findByCompany(companyId) {
    const { data, error } = await this.client
      .from('connections')
      .select('*, departments(name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('connections')
      .select('*, departments(name)')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
  }

  async create(data) {
    const { data: result, error } = await this.client
      .from('connections')
      .insert({
        company_id: data.companyId,
        instance_name: data.instanceName,
        department_id: data.departmentId || null,
        phone_number: data.phoneNumber,
        status: 'offline',
        settings: data.settings || {}
      })
      .select('*')
      .single();

    if (error) throw error;
    return { rows: [result], rowCount: 1 };
  }

  async update(id, data) {
    const updateData = {};
    if (data.departmentId !== undefined) updateData.department_id = data.departmentId;
    if (data.settings !== undefined) updateData.settings = data.settings;
    if (data.instanceName !== undefined) updateData.instance_name = data.instanceName;
    if (data.phoneNumber !== undefined) updateData.phone_number = data.phoneNumber;
    updateData.updated_at = new Date().toISOString();

    const { data: result, error } = await this.client
      .from('connections')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return { rows: [result], rowCount: 1 };
  }

  async delete(id) {
    const { error } = await this.client
      .from('connections')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { rows: [], rowCount: 1 };
  }

  async updateStatus(id, status, qrCode = null, qrExpires = null) {
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };
    if (qrCode !== null) updateData.qr_code = qrCode;
    if (qrExpires !== null) updateData.qr_code_expires = qrExpires;

    const { data: result, error } = await this.client
      .from('connections')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return { rows: [result], rowCount: 1 };
  }
}

module.exports = InstanceRepository;
