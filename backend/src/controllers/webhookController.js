async function receiveWebhook(req, reply) {
  const payload = req.body || {};
  const chatService = req.server.container.services.chat;

  const result = await chatService.processIncomingMessage(payload);

  const jobId = req.server.container.ai.aiProcessingService.enqueueFullProcessing(
    result.conversation.id
  );

  setImmediate(async () => {
    try {
      await req.server.container.ai.aiProcessingService.processAll();

      if (req.server.io) {
        const updatedConv = await chatService.getConversationWithMessages(result.conversation.id);
        if (updatedConv) {
          req.server.io.to(`conversation:${result.conversation.id}`)
            .emit('ai_processing_complete', {
              conversationId: result.conversation.id,
              department: updatedConv.conversation.department_id,
              draft: updatedConv.conversation.ai_draft,
              confidence: updatedConv.conversation.ai_confidence
            });
        }
      }
    } catch (error) {
      console.error('AI processing error:', error);
    }
  });

  return reply.send({
    ok: true,
    jobId,
    data: {
      conversationId: result.conversation.id,
      messageId: result.message.id,
      isNewConversation: result.isNewConversation
    }
  });
}

module.exports = {
  receiveWebhook
};