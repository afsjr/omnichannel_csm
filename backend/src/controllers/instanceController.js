async function listInstances(req, reply) {
  const { companyId } = req.query || {};
  const instances = req.server.container.services.instance;

  const result = await instances.list(Number(companyId) || 1);
  return reply.send({ ok: true, data: result.rows });
}

async function createInstance(req, reply) {
  const { companyId, instanceName, departmentId, phoneNumber, settings } = req.body || {};
  const instances = req.server.container.services.instance;

  try {
    const result = await instances.create({
      companyId: Number(companyId),
      instanceName,
      departmentId: departmentId ? Number(departmentId) : null,
      phoneNumber,
      settings
    });

    return reply.code(201).send({ ok: true, data: result.rows[0] });
  } catch (error) {
    const status = error.statusCode || 500;
    return reply.code(status).send({ ok: false, error: error.message });
  }
}

async function getInstance(req, reply) {
  const { id } = req.params || {};
  const instances = req.server.container.services.instance;

  try {
    const result = await instances.getById(Number(id));
    return reply.send({ ok: true, data: result.rows[0] });
  } catch (error) {
    const status = error.statusCode || 500;
    return reply.code(status).send({ ok: false, error: error.message });
  }
}

async function updateInstance(req, reply) {
  const { id } = req.params || {};
  const { departmentId, settings, instanceName, phoneNumber } = req.body || {};
  const instances = req.server.container.services.instance;

  try {
    const result = await instances.update(Number(id), {
      departmentId: departmentId !== undefined ? Number(departmentId) : undefined,
      settings,
      instanceName,
      phoneNumber
    });

    return reply.send({ ok: true, data: result.rows[0] });
  } catch (error) {
    const status = error.statusCode || 500;
    return reply.code(status).send({ ok: false, error: error.message });
  }
}

async function deleteInstance(req, reply) {
  const { id } = req.params || {};
  const instances = req.server.container.services.instance;

  try {
    await instances.delete(Number(id));
    return reply.send({ ok: true, message: 'Instância removida' });
  } catch (error) {
    const status = error.statusCode || 500;
    return reply.code(status).send({ ok: false, error: error.message });
  }
}

async function connectInstance(req, reply) {
  const { id } = req.params || {};
  const instances = req.server.container.services.instance;

  try {
    const result = await instances.connect(Number(id));
    return reply.send({ ok: true, data: result });
  } catch (error) {
    const status = error.statusCode || 500;
    return reply.code(status).send({ ok: false, error: error.message });
  }
}

async function disconnectInstance(req, reply) {
  const { id } = req.params || {};
  const instances = req.server.container.services.instance;

  try {
    const result = await instances.disconnect(Number(id));
    return reply.send({ ok: true, data: result });
  } catch (error) {
    const status = error.statusCode || 500;
    return reply.code(status).send({ ok: false, error: error.message });
  }
}

module.exports = {
  listInstances,
  createInstance,
  getInstance,
  updateInstance,
  deleteInstance,
  connectInstance,
  disconnectInstance
};
