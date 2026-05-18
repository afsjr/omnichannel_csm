/**
 * API de Conexões/Instâncias
 * 
 * Gerencia múltiplas instâncias da Evolution API (múltiplos números de WhatsApp)
 * por empresa.
 * 
 * Endpoints:
 * - GET /api/instances - Lista todas as instâncias
 * - POST /api/instances - Cria nova instância
 * - GET /api/instances/:id - Detalhes de uma instância
 * - DELETE /api/instances/:id - Remove instância
 * - POST /api/instances/:id/connect - Inicia conexão
 * - POST /api/instances/:id/disconnect - Desconecta
 * 
 * @requires ./lib/db - Conexão com banco
 * @requires ./lib/permissions - Verificação de permissões
 */

const { getSupabase } = require('../lib/db');

/**
 * Lista todas as instâncias de uma empresa
 * 
 * @example
 * GET /api/instances?company_id=1
 */
async function listInstances(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const companyId = Number(req.query.company_id || 1);

  try {
    const { data: instances, error } = await getSupabase()
      .from('connections')
      .select(`
        *,
        departments(name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ 
      ok: true, 
      data: instances || [] 
    });
  } catch (error) {
    console.error('List instances error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

/**
 * Cria uma nova instância/conexão
 * 
 * @example
 * POST /api/instances
 * {
 *   "company_id": 1,
 *   "instance_name": "comercial_whatsapp",
 *   "department_id": 1,
 *   "phone_number": "5511999999999"
 * }
 */
async function createInstance(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { company_id, instance_name, department_id, phone_number, settings } = req.body || {};

  if (!company_id || !instance_name || !phone_number) {
    return res.status(400).json({ 
      ok: false, 
      error: 'company_id, instance_name e phone_number são obrigatórios' 
    });
  }

  try {
    const { data: instance, error } = await getSupabase()
      .from('connections')
      .insert({
        company_id,
        instance_name,
        department_id: department_id || null,
        phone_number,
        status: 'offline',
        settings: settings || {}
      })
      .select('*')
      .single();

    if (error) {
      // Código 23505 = instância com mesmo nome já existe
      if (error.code === '23505') {
        return res.status(400).json({ 
          ok: false, 
          error: 'Já existe uma instância com este nome' 
        });
      }
      throw error;
    }

    return res.status(201).json({ ok: true, data: instance });
  } catch (error) {
    console.error('Create instance error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

/**
 * Obtém detalhes de uma instância específica
 * 
 * @example
 * GET /api/instances/1
 */
async function getInstance(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const match = req.url.match(/\/instances\/(\d+)/);
  if (!match) {
    return res.status(400).json({ ok: false, error: 'instance_id é obrigatório' });
  }

  const instanceId = Number(match[1]);

  try {
    const { data: instance, error } = await getSupabase()
      .from('connections')
      .select('*, departments(name)')
      .eq('id', instanceId)
      .single();

    if (error || !instance) {
      return res.status(404).json({ ok: false, error: 'Instância não encontrada' });
    }

    return res.status(200).json({ ok: true, data: instance });
  } catch (error) {
    console.error('Get instance error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

/**
 * Atualiza uma instância (nome, department, etc)
 * 
 * @example
 * PUT /api/instances/1
 * {
 *   "department_id": 2,
 *   "settings": {"auto_reply": true}
 * }
 */
async function updateInstance(req, res) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const match = req.url.match(/\/instances\/(\d+)/);
  if (!match) {
    return res.status(400).json({ ok: false, error: 'instance_id é obrigatório' });
  }

  const instanceId = Number(match[1]);
  const { department_id, settings, instance_name } = req.body || {};

  const updateData = {};
  if (department_id !== undefined) updateData.department_id = department_id;
  if (settings) updateData.settings = settings;
  if (instance_name) updateData.instance_name = instance_name;
  updateData.updated_at = new Date().toISOString();

  try {
    const { data: instance, error } = await getSupabase()
      .from('connections')
      .update(updateData)
      .eq('id', instanceId)
      .select('*')
      .single();

    if (error) throw error;

    return res.status(200).json({ ok: true, data: instance });
  } catch (error) {
    console.error('Update instance error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

/**
 * Remove uma instância
 * 
 * @example
 * DELETE /api/instances/1
 */
async function deleteInstance(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const match = req.url.match(/\/instances\/(\d+)/);
  if (!match) {
    return res.status(400).json({ ok: false, error: 'instance_id é obrigatório' });
  }

  const instanceId = Number(match[1]);

  try {
    const { error } = await getSupabase()
      .from('connections')
      .delete()
      .eq('id', instanceId);

    if (error) throw error;

    return res.status(200).json({ ok: true, message: 'Instância removida' });
  } catch (error) {
    console.error('Delete instance error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

/**
 * Solicita conexão (gera QR Code) para uma instância
 * 
 * @example
 * POST /api/instances/1/connect
 */
async function connectInstance(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const match = req.url.match(/\/instances\/(\d+)\/connect/);
  if (!match) {
    return res.status(400).json({ ok: false, error: 'instance_id é obrigatório' });
  }

  const instanceId = Number(match[1]);

  try {
    // Busca a instância para obter configurações
    const { data: instance, error: getError } = await getSupabase()
      .from('connections')
      .select('*, companies(*)')
      .eq('id', instanceId)
      .single();

    if (getError || !instance) {
      return res.status(404).json({ ok: false, error: 'Instância não encontrada' });
    }

    // Configura a Evolution API para esta instância
    const evolutionUrl = instance.api_url || process.env.EVOLUTION_API_URL;
    const evolutionKey = instance.api_key || process.env.EVOLUTION_API_KEY;

    // Chama a Evolution API para gerar QR Code
    // Formato: POST /instance/connect/{instanceName}
    const response = await fetch(`${evolutionUrl}/instance/connect/${instance.instance_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey
      }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Falha ao conectar instância',
        details: result 
      });
    }

    // Atualiza status no banco
    const { data: updated, error: updateError } = await getSupabase()
      .from('connections')
      .update({ 
        status: 'connecting',
        qr_code: result.qr?.code || result.code,
        qr_code_expires: result.qr?.expires ? new Date(result.qr.expires) : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', instanceId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({ 
      ok: true, 
      data: {
        status: 'connecting',
        qr_code: updated.qr_code,
        qr_code_expires: updated.qr_code_expires
      }
    });
  } catch (error) {
    console.error('Connect instance error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

/**
 * Desconecta uma instância
 * 
 * @example
 * POST /api/instances/1/disconnect
 */
async function disconnectInstance(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const match = req.url.match(/\/instances\/(\d+)\/disconnect/);
  if (!match) {
    return res.status(400).json({ ok: false, error: 'instance_id é obrigatório' });
  }

  const instanceId = Number(match[1]);

  try {
    const { error } = await getSupabase()
      .from('connections')
      .update({ 
        status: 'offline',
        qr_code: null,
        qr_code_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', instanceId);

    if (error) throw error;

    return res.status(200).json({ 
      ok: true, 
      data: { status: 'offline' }
    });
  } catch (error) {
    console.error('Disconnect instance error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

/**
 * Rota principal - distribui para os handlers
 */
module.exports = async (req, res) => {
  const { url } = req;

  try {
    // Lista instâncias
    if (url === '/instances' || url.startsWith('/instances?')) {
      return listInstances(req, res);
    }

    // Cria instância
    if (url === '/instances' && req.method === 'POST') {
      return createInstance(req, res);
    }

    // Conectar instância
    if (url.match(/\/instances\/\d+\/connect/)) {
      return connectInstance(req, res);
    }

    // Desconectar instância
    if (url.match(/\/instances\/\d+\/disconnect/)) {
      return disconnectInstance(req, res);
    }

    // Atualiza instância
    if (url.match(/\/instances\/\d+/) && (req.method === 'PUT' || req.method === 'PATCH')) {
      return updateInstance(req, res);
    }

    // Deleta instância
    if (url.match(/\/instances\/\d+/) && req.method === 'DELETE') {
      return deleteInstance(req, res);
    }

    // Detalhes da instância
    if (url.match(/\/instances\/\d+/)) {
      return getInstance(req, res);
    }

    return res.status(404).json({ ok: false, error: 'Endpoint não encontrado' });
  } catch (error) {
    console.error('Instances API error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};