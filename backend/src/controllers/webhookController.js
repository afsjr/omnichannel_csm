function parseWebhookPayload(payload) {
  let data = payload;

  if (payload.data && payload.message) {
    data = { ...payload, ...payload.data };
  }

  if (payload.messages && Array.isArray(payload.messages) && payload.messages.length > 0) {
    data = payload.messages[0];
  }

  const result = {
    content: '',
    media_type: null,
    media_url: null,
    media_mimetype: null,
    media_caption: null,
    media_filesize: null,
    phone: null,
    contact_name: null
  };

  if (data.key?.remoteJid) {
    result.phone = data.key.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  }

  if (data.pushName) {
    result.contact_name = data.pushName;
  }

  const msg = data.message || data;

  if (msg?.extendedTextMessage?.text) {
    result.content = msg.extendedTextMessage.text;
  } else if (msg?.conversation) {
    result.content = typeof msg.conversation === 'string' ? msg.conversation : msg.conversation[0];
  } else if (msg?.imageMessage) {
    const img = msg.imageMessage;
    result.content = img.caption || '[Imagem]';
    result.media_type = 'image';
    result.media_url = img.url || img.mediaKey || img.directPath;
    result.media_mimetype = img.mimetype || 'image/jpeg';
    result.media_caption = img.caption;
    result.media_filesize = img.fileLength;
  } else if (msg?.videoMessage) {
    const vid = msg.videoMessage;
    result.content = vid.caption || '[Vídeo]';
    result.media_type = 'video';
    result.media_url = vid.url || vid.mediaKey || vid.directPath;
    result.media_mimetype = vid.mimetype || 'video/mp4';
    result.media_caption = vid.caption;
    result.media_filesize = vid.fileLength;
  } else if (msg?.audioMessage) {
    result.content = '[Áudio]';
    result.media_type = 'audio';
    result.media_url = msg.audioMessage.url || msg.audioMessage.mediaKey || msg.audioMessage.directPath;
    result.media_mimetype = msg.audioMessage.mimetype || 'audio/ogg';
    result.media_filesize = msg.audioMessage.fileLength;
  } else if (msg?.documentMessage) {
    const doc = msg.documentMessage;
    result.content = doc.fileName || '[Documento]';
    result.media_type = 'document';
    result.media_url = doc.url || doc.mediaKey || doc.directPath;
    result.media_mimetype = doc.mimetype;
    result.media_caption = doc.caption || doc.title;
    result.media_filesize = doc.fileLength;
  } else if (msg?.stickerMessage) {
    result.content = '[Sticker]';
    result.media_type = 'image';
    result.media_url = msg.stickerMessage.url || msg.stickerMessage.mediaKey;
    result.media_mimetype = 'image/webp';
  } else if (msg?.ephemeralMessage?.message) {
    return parseWebhookPayload({ ...data, message: msg.ephemeralMessage.message });
  }

  if (!result.content && data.text) {
    result.content = data.text;
  }

  if (!result.phone && data.from) {
    result.phone = data.from.replace('@s.whatsapp.net', '').replace('@g.us', '');
  }

  return result;
}

async function receiveWebhook(req, reply) {
  let payload = req.body || {};
  const chatService = req.server.container.services.chat;

  console.log('=== EVOLUTION WEBHOOK RECEIVED ===');
  console.log('Event:', payload.event || payload);
  console.log('Full payload:', JSON.stringify(payload, null, 2));
  console.log('=====================================');

  if (payload.event === 'messages.upsert' && payload.data?.messages) {
    const msgData = payload.data.messages[0];
    payload = { ...msgData, pushName: payload.data.pushName };
  }

  const parsedMessage = parseWebhookPayload(payload);

  const enrichedPayload = {
    ...payload,
    content: parsedMessage.content,
    media_type: parsedMessage.media_type,
    media_url: parsedMessage.media_url,
    media_mimetype: parsedMessage.media_mimetype,
    media_caption: parsedMessage.media_caption,
    media_filesize: parsedMessage.media_filesize,
    phone: parsedMessage.phone || payload.from,
    contact_name: parsedMessage.contact_name || payload.pushName
  };

  const result = await chatService.processIncomingMessage(enrichedPayload);

  if (req.server.io) {
    req.server.io.to(`conversation:${result.conversation.id}`)
      .emit('new_message', {
        conversationId: result.conversation.id,
        message: result.message,
        contact: result.contact
      });
    const deptId = result.conversation.department_id;
    if (deptId) {
      req.server.io.to(`department:${deptId}`)
        .emit('queue_updated', { departmentId: deptId });
    }
  }

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
    data: {
      conversationId: result.conversation.id,
      messageId: result.message.id,
      isNewConversation: result.isNewConversation,
      wasReopened: result.wasReopened
    }
  });
}

module.exports = {
  receiveWebhook,
  parseWebhookPayload
};