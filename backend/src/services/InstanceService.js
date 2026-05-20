class InstanceService {
  constructor({ instanceRepository, evolutionProvider }) {
    this.instanceRepository = instanceRepository;
    this.evolutionProvider = evolutionProvider;
  }

  async list(companyId) {
    return this.instanceRepository.findByCompany(companyId);
  }

  async getById(instanceId) {
    const result = await this.instanceRepository.findById(instanceId);
    if (result.rowCount === 0) {
      throw Object.assign(new Error('Instância não encontrada'), { statusCode: 404 });
    }
    return result;
  }

  async create(data) {
    const { companyId, instanceName, departmentId, phoneNumber, settings } = data;

    if (!companyId || !instanceName || !phoneNumber) {
      throw Object.assign(
        new Error('companyId, instanceName e phoneNumber são obrigatórios'),
        { statusCode: 400 }
      );
    }

    try {
      return await this.instanceRepository.create({
        companyId,
        instanceName,
        departmentId,
        phoneNumber,
        settings
      });
    } catch (error) {
      if (error.code === '23505') {
        throw Object.assign(
          new Error('Já existe uma instância com este nome'),
          { statusCode: 409 }
        );
      }
      throw error;
    }
  }

  async update(instanceId, data) {
    const existing = await this.instanceRepository.findById(instanceId);
    if (existing.rowCount === 0) {
      throw Object.assign(new Error('Instância não encontrada'), { statusCode: 404 });
    }

    return this.instanceRepository.update(instanceId, data);
  }

  async delete(instanceId) {
    const existing = await this.instanceRepository.findById(instanceId);
    if (existing.rowCount === 0) {
      throw Object.assign(new Error('Instância não encontrada'), { statusCode: 404 });
    }

    await this.instanceRepository.delete(instanceId);
    return { ok: true };
  }

  async connect(instanceId) {
    const result = await this.instanceRepository.findById(instanceId);
    if (result.rowCount === 0) {
      throw Object.assign(new Error('Instância não encontrada'), { statusCode: 404 });
    }

    const instance = result.rows[0];

    if (instance.status === 'connected') {
      throw Object.assign(new Error('Instância já conectada'), { statusCode: 409 });
    }

    const evolutionUrl = instance.api_url || process.env.EVOLUTION_API_URL;
    const evolutionKey = instance.api_key || process.env.EVOLUTION_API_KEY;

    const response = await fetch(`${evolutionUrl}/instance/connect/${instance.instance_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey
      }
    });

    const evolutionResult = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw Object.assign(
        new Error('Falha ao conectar instância'),
        { statusCode: 502, details: evolutionResult }
      );
    }

    const qrCode = evolutionResult.qr?.code || evolutionResult.code;
    const qrExpires = evolutionResult.qr?.expires
      ? new Date(evolutionResult.qr.expires).toISOString()
      : null;

    const updated = await this.instanceRepository.updateStatus(instanceId, 'connecting', qrCode, qrExpires);

    return {
      status: 'connecting',
      qr_code: updated.rows[0].qr_code,
      qr_code_expires: updated.rows[0].qr_code_expires
    };
  }

  async disconnect(instanceId) {
    const result = await this.instanceRepository.findById(instanceId);
    if (result.rowCount === 0) {
      throw Object.assign(new Error('Instância não encontrada'), { statusCode: 404 });
    }

    const instance = result.rows[0];

    if (instance.status === 'offline') {
      throw Object.assign(new Error('Instância já desconectada'), { statusCode: 409 });
    }

    await this.instanceRepository.updateStatus(instanceId, 'offline', null, null);

    return { status: 'offline' };
  }
}

module.exports = InstanceService;
