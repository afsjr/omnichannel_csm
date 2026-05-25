const ws = require('../lib/websocket');

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
    message_key: null,
    ignore: false,
    phone: null,
    contact_name: null
  };

  if (data.key?.remoteJid) {
    result.phone = data.key.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    result.message_key = data.key;
  }

  if (data.pushName) {
    result.contact_name = data.pushName;
  }

  if (data.key?.fromMe) {
    result.ignore = true;
    return result;
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
    result.media_url = img.base64
      ? `data:${img.mimetype || 'image/jpeg'};base64,${img.base64}`
      : (img.url || img.mediaKey || img.directPath);
    result.media_mimetype = img.mimetype || 'image/jpeg';
    result.media_caption = img.caption;
    result.media_filesize = img.fileLength;
  } else if (msg?.videoMessage) {
    const vid = msg.videoMessage;
    result.content = vid.caption || '[Vídeo]';
    result.media_type = 'video';
    result.media_url = vid.base64
      ? `data:${vid.mimetype || 'video/mp4'};base64,${vid.base64}`
      : (vid.url || vid.mediaKey || vid.directPath);
    result.media_mimetype = vid.mimetype || 'video/mp4';
    result.media_caption = vid.caption;
    result.media_filesize = vid.fileLength;
  } else if (msg?.audioMessage) {
    const a = msg.audioMessage;
    result.content = '[Áudio]';
    result.media_type = 'audio';
    result.media_url = a.base64
      ? `data:${a.mimetype || 'audio/ogg'};base64,${a.base64}`
      : (a.url || a.mediaKey || a.directPath);
    result.media_mimetype = a.mimetype || 'audio/ogg';
    result.media_filesize = a.fileLength;
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
  } else if (msg) {
    const knownTypes = ['extendedTextMessage','conversation','imageMessage','videoMessage','audioMessage','documentMessage','stickerMessage','ephemeralMessage','buttonsMessage','templateMessage','listMessage','orderMessage'];
    const hasKnown = Object.keys(msg).some(k => knownTypes.some(t => t === k));
    if (!hasKnown && !result.content && !result.media_type) {
      console.log('parseWebhookPayload: unknown message type, keys:', Object.keys(msg));
    }
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

  if (parsedMessage.ignore) {
    return reply.send({ ok: true, ignored: true, reason: 'fromMe' });
  }

  const enrichedPayload = {
    ...payload,
    content: parsedMessage.content,
    media_type: parsedMessage.media_type,
    media_url: parsedMessage.media_url,
    media_mimetype: parsedMessage.media_mimetype,
    media_caption: parsedMessage.media_caption,
    media_filesize: parsedMessage.media_filesize,
    message_key: parsedMessage.message_key,
    phone: parsedMessage.phone || payload.from,
    contact_name: parsedMessage.contact_name || payload.pushName
  };

  const result = await chatService.processIncomingMessage(enrichedPayload);

  ws.toConversation(req, result.conversation.id, 'new_message', {
    conversationId: result.conversation.id,
    message: result.message,
    contact: result.contact
  });
  const deptId = result.conversation.department_id;
  if (deptId) {
    ws.toDepartment(req, deptId, 'queue_updated', { departmentId: deptId });
  }

  if (parsedMessage.media_type === 'audio') {
    ws.toConversation(req, result.conversation.id, 'message_updated', {
      conversationId: result.conversation.id,
      message: { id: result.message.id, metadata: { transcribing: true } }
    });

    setImmediate(async () => {
      try {
        const transcriptionService = req.server.container.services.audioTranscription;
        const transcription = await transcriptionService.transcribeMessage(result.message);

        if (transcription) {
          const updatedConv = await chatService.getConversationWithMessages(result.conversation.id);
          if (updatedConv) {
            const updatedMsg = updatedConv.messages.find(m => m.id === result.message.id);
            ws.toConversation(req, result.conversation.id, 'message_updated', {
              conversationId: result.conversation.id,
              message: updatedMsg || { id: result.message.id, metadata: { transcribing: false, audio_transcription: transcription } }
            });
          }
        } else {
          ws.toConversation(req, result.conversation.id, 'message_updated', {
            conversationId: result.conversation.id,
            message: { id: result.message.id, metadata: { transcribing: false, audio_transcription: null } }
          });
        }
      } catch (error) {
        console.error('Audio transcription error:', error);
        ws.toConversation(req, result.conversation.id, 'message_updated', {
          conversationId: result.conversation.id,
          message: { id: result.message.id, metadata: { transcribing: false, audio_transcription: null } }
        });
      }
    });
  }

  setImmediate(async () => {
    try {
      await req.server.container.ai.aiProcessingService.processAll();

      const updatedConv = await chatService.getConversationWithMessages(result.conversation.id);
      if (updatedConv) {
        ws.toConversation(req, result.conversation.id, 'ai_processing_complete', {
          conversationId: result.conversation.id,
          department: updatedConv.conversation.department_id,
          draft: updatedConv.conversation.ai_draft,
          confidence: updatedConv.conversation.ai_confidence
        });
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