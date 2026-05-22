const { getSupabase } = require('../lib/db');
const { getAction } = require('../lib/route-helper');

const BASE = '/api/instances';

async function listInstances(req, res) {
  const companyId = Number(req.query.company_id || 1);
  try {
    const { data: instances, error } = await getSupabase()
      .from('connections')
      .select('*, departments(name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.status(200).json({ ok: true, data: instances || [] });
  } catch (error) {
    console.error('List instances error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

async function createInstance(req, res) {
  const { company_id, instance_name, department_id, phone_number, settings } = req.body || {};
  if (!company_id || !instance_name || !phone_number) {
    return res.status(400).json({ ok: false, error: 'company_id, instance_name e phone_number são obrigatórios' });
  }
  try {
    const { data: instance, error } = await getSupabase()
      .from('connections')
      .insert({ company_id, instance_name, department_id: department_id || null, phone_number, status: 'offline', settings: settings || {} })
      .select('*').single();
    if (error) {
      if (error.code === '23505') return res.status(400).json({ ok: false, error: 'Já existe uma instância com este nome' });
      throw error;
    }
    return res.status(201).json({ ok: true, data: instance });
  } catch (error) {
    console.error('Create instance error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

async function getInstance(req, res, id) {
  try {
    const { data: instance, error } = await getSupabase()
      .from('connections').select('*, departments(name)').eq('id', Number(id)).single();
    if (error || !instance) return res.status(404).json({ ok: false, error: 'Instância não encontrada' });
    return res.status(200).json({ ok: true, data: instance });
  } catch (error) {
    console.error('Get instance error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

async function updateInstance(req, res, id) {
  const { department_id, settings, instance_name } = req.body || {};
  const updateData = {};
  if (department_id !== undefined) updateData.department_id = department_id;
  if (settings) updateData.settings = settings;
  if (instance_name) updateData.instance_name = instance_name;
  updateData.updated_at = new Date().toISOString();
  try {
    const { data: instance, error } = await getSupabase()
      .from('connections').update(updateData).eq('id', Number(id)).select('*').single();
    if (error) throw error;
    return res.status(200).json({ ok: true, data: instance });
  } catch (error) {
    console.error('Update instance error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

async function deleteInstance(req, res, id) {
  try {
    const { error } = await getSupabase().from('connections').delete().eq('id', Number(id));
    if (error) throw error;
    return res.status(200).json({ ok: true, message: 'Instância removida' });
  } catch (error) {
    console.error('Delete instance error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

async function connectInstance(req, res, id) {
  try {
    const { data: instance, error: getError } = await getSupabase()
      .from('connections').select('*, companies(*)').eq('id', Number(id)).single();
    if (getError || !instance) return res.status(404).json({ ok: false, error: 'Instância não encontrada' });
    const evolutionUrl = instance.api_url || process.env.EVOLUTION_API_URL;
    const evolutionKey = instance.api_key || process.env.EVOLUTION_API_KEY;
    const base = (evolutionUrl||'').replace(/\/api$/,'');
    const response = await fetch(`${base}/instance/connect/${instance.instance_name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(400).json({ ok: false, error: 'Falha ao conectar instância', details: result });
    const { data: updated, error: updateError } = await getSupabase()
      .from('connections')
      .update({ status: 'connecting', qr_code: result.qr?.code || result.code, qr_code_expires: result.qr?.expires ? new Date(result.qr.expires) : null, updated_at: new Date().toISOString() })
      .eq('id', Number(id)).select('*').single();
    if (updateError) throw updateError;
    return res.status(200).json({ ok: true, data: { status: 'connecting', qr_code: updated.qr_code, qr_code_expires: updated.qr_code_expires } });
  } catch (error) {
    console.error('Connect instance error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

async function disconnectInstance(req, res, id) {
  try {
    const { error } = await getSupabase()
      .from('connections').update({ status: 'offline', qr_code: null, qr_code_expires: null, updated_at: new Date().toISOString() })
      .eq('id', Number(id));
    if (error) throw error;
    return res.status(200).json({ ok: true, data: { status: 'offline' } });
  } catch (error) {
    console.error('Disconnect instance error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

async function setupWebhook(req, res) {
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;
  const instanceName = process.env.EVOLUTION_INSTANCE;
  if (!evolutionUrl || !evolutionKey || !instanceName) {
    return res.status(400).json({ ok: false, error: 'EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE obrigatórios' });
  }
  const base = evolutionUrl.replace(/\/api$/, '');
  const original = req.headers['x-vercel-rewrite-original-url'] || req.url;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const webhookUrl = req.body?.url || `https://${host}/api/webhook-handler`;
  try {
    const response = await fetch(`${base}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
      body: JSON.stringify({
        webhook: { enabled: true, url: webhookUrl, webhookByEvents: false, events: ['MESSAGES_UPSERT', 'SEND_MESSAGE', 'CONNECTION_UPDATE'] }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(400).json({ ok: false, error: 'Falha ao configurar webhook', details: data });
    return res.status(200).json({ ok: true, message: 'Webhook configurado', data: { webhookUrl, instance: instanceName, response: data } });
  } catch (error) {
    console.error('Setup webhook error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

module.exports = async (req, res) => {
  const action = getAction(req, BASE);

  try {
    if (action === 'setup-webhook' && req.method === 'POST') return setupWebhook(req, res);

    if (!action) {
      if (req.method === 'GET') return listInstances(req, res);
      if (req.method === 'POST') return createInstance(req, res);
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    const parts = action.split('/');
    const id = parts[0];
    const sub = parts[1];

    if (!/^\d+$/.test(id)) return res.status(404).json({ ok: false, error: 'Endpoint não encontrado' });

    if (sub === 'connect' && req.method === 'POST') return connectInstance(req, res, id);
    if (sub === 'disconnect' && req.method === 'POST') return disconnectInstance(req, res, id);

    if (req.method === 'GET') return getInstance(req, res, id);
    if (req.method === 'PUT' || req.method === 'PATCH') return updateInstance(req, res, id);
    if (req.method === 'DELETE') return deleteInstance(req, res, id);

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Instances API error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
