const { createAIServiceContainer } = require('../services/AIService');
const FunnelClassificationService = require('../services/FunnelClassificationService');

let aiServices = null;
const funnelService = new FunnelClassificationService();

function getAIServices(container) {
  if (!aiServices) {
    aiServices = createAIServiceContainer({
      repositories: container.repositories,
      providers: container.providers
    });
  }
  return aiServices;
}

async function processWithAI(req, reply) {
  const { conversationId } = req.body || {};

  if (!conversationId) {
    return reply.code(400).send({ ok: false, error: 'conversationId e obrigatorio' });
  }

  const container = req.server.container;
  const { triageService, aiDraftService } = getAIServices(container);
  const { conversationRepository, messageRepository } = container.repositories;

  try {
    const triageResult = await triageService.triage(conversationId);
    const draftResult = await aiDraftService.generateDraft(conversationId);

    const isCommercial = triageResult.department === 'Comercial';
    const funnelInfo = triageResult.funnel;
    const funnelLabel = funnelService.getStageLabel(funnelInfo?.stage || 'unclassified');

    let systemContent = `🤖 **Análise IA**\n\n📋 **Setor Classificado:** ${triageResult.department} (${Math.round(triageResult.confidence * 100)}% de confiança)`;

    if (isCommercial && funnelInfo?.stage && funnelInfo.stage !== 'unclassified') {
      systemContent += `\n\n🎯 **Estágio do Funil:** ${funnelLabel} (${Math.round((funnelInfo.confidence || 0) * 100)}% de confiança)`;
    }

    systemContent += `\n\n✨ **Sugestão Gerada:**\n${draftResult.draft}`;

    await messageRepository.createSystem(
      conversationId,
      systemContent,
      'ai_triage',
      {
        department: triageResult.department,
        departmentId: triageResult.departmentId,
        triageConfidence: triageResult.confidence,
        draftConfidence: draftResult.confidence,
        funnelStage: funnelInfo?.stage || null,
        funnelConfidence: funnelInfo?.confidence || null
      }
    );

    if (req.server.io) {
      req.server.io.to(`conversation:${conversationId}`)
        .emit('ai_complete', {
          conversationId,
          department: triageResult.department,
          departmentId: triageResult.departmentId,
          confidence: triageResult.confidence,
          draft: draftResult.draft,
          draftConfidence: draftResult.confidence,
          funnelStage: funnelInfo?.stage,
          funnelConfidence: funnelInfo?.confidence
        });
    }

    return reply.send({
      ok: true,
      data: {
        triage: triageResult,
        draft: draftResult
      }
    });
  } catch (error) {
    console.error('AI processing error:', error);
    return reply.code(500).send({ ok: false, error: error.message });
  }
}

async function triageOnly(req, reply) {
  const { conversationId } = req.body || {};

  if (!conversationId) {
    return reply.code(400).send({ ok: false, error: 'conversationId e obrigatorio' });
  }

  const container = req.server.container;
  const { triageService } = getAIServices(container);

  try {
    const result = await triageService.triage(conversationId);

    return reply.send({ ok: true, data: result });
  } catch (error) {
    return reply.code(500).send({ ok: false, error: error.message });
  }
}

async function generateDraftOnly(req, reply) {
  const { conversationId } = req.body || {};

  if (!conversationId) {
    return reply.code(400).send({ ok: false, error: 'conversationId e obrigatorio' });
  }

  const container = req.server.container;
  const { aiDraftService } = getAIServices(container);

  try {
    const result = await aiDraftService.generateDraft(conversationId);

    if (req.server.io) {
      req.server.io.to(`conversation:${conversationId}`)
        .emit('draft_updated', {
          conversationId,
          draft: result.draft,
          confidence: result.confidence
        });
    }

    return reply.send({ ok: true, data: result });
  } catch (error) {
    return reply.code(500).send({ ok: false, error: error.message });
  }
}

module.exports = {
  processWithAI,
  triageOnly,
  generateDraftOnly
};