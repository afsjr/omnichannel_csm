async function processTriage(req, reply) {
  const { conversationId } = req.body || {};
  const { aiProcessingService } = req.server.container.ai;

  if (!conversationId) {
    return reply.code(400).send({ ok: false, error: 'conversationId e obrigatorio' });
  }

  try {
    const jobId = aiProcessingService.enqueueTriage(Number(conversationId));
    const result = await aiProcessingService.processJob(jobId);
    return reply.send({ ok: true, data: result });
  } catch (error) {
    return reply.code(500).send({ ok: false, error: error.message });
  }
}

async function generateDraft(req, reply) {
  const { conversationId, regenerate, instruction } = req.body || {};
  const { aiDraftService } = req.server.container.ai;

  if (!conversationId) {
    return reply.code(400).send({ ok: false, error: 'conversationId e obrigatorio' });
  }

  try {
    let result;
    if (regenerate && instruction) {
      result = await aiDraftService.regenerateDraft(Number(conversationId), instruction);
    } else {
      result = await aiDraftService.generateDraft(Number(conversationId));
    }

    if (req.server.io) {
      req.server.io.to(`conversation:${conversationId}`)
        .emit('draft_updated', {
          conversationId: Number(conversationId),
          draft: result.draft
        });
    }

    return reply.send({ ok: true, data: result });
  } catch (error) {
    return reply.code(500).send({ ok: false, error: error.message });
  }
}

async function processQueue(req, reply) {
  const { aiProcessingService } = req.server.container.ai;

  try {
    const results = await aiProcessingService.processAll();
    return reply.send({ ok: true, processed: results.length, results });
  } catch (error) {
    return reply.code(500).send({ ok: false, error: error.message });
  }
}

async function getJobStatus(req, reply) {
  const { jobId } = req.params || {};
  const { jobQueue } = req.server.container.ai;

  if (!jobId) {
    return reply.code(400).send({ ok: false, error: 'jobId e obrigatorio' });
  }

  const status = jobQueue.getStatus(jobId);
  if (!status) {
    return reply.code(404).send({ ok: false, error: 'Job nao encontrado' });
  }

  return reply.send({ ok: true, data: status });
}

async function getPendingJobs(req, reply) {
  const { jobQueue } = req.server.container.ai;
  const pending = jobQueue.listPending();
  return reply.send({ ok: true, data: pending });
}

module.exports = {
  processTriage,
  generateDraft,
  processQueue,
  getJobStatus,
  getPendingJobs
};