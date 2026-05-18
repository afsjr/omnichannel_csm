const { saveIncomingMessage } = require('../lib/messages');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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
    media_caption: null,
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
  } else if (msg?.conversation?.[0]) {
    result.content = msg.conversation[0];
  } else if (msg?.imageMessage) {
    const img = msg.imageMessage;
    result.content = img.caption || '[Imagem]';
    result.media_type = 'image';
    result.media_url = img.url || img.mediaKey || img.directPath;
    result.media_caption = img.caption;
  } else if (msg?.videoMessage) {
    const vid = msg.videoMessage;
    result.content = vid.caption || '[Vídeo]';
    result.media_type = 'video';
    result.media_url = vid.url || vid.mediaKey || vid.directPath;
    result.media_caption = vid.caption;
  } else if (msg?.audioMessage) {
    result.content = '[Áudio]';
    result.media_type = 'audio';
    result.media_url = msg.audioMessage.url || msg.audioMessage.mediaKey;
  } else if (msg?.documentMessage) {
    const doc = msg.documentMessage;
    result.content = doc.fileName || '[Documento]';
    result.media_type = 'document';
    result.media_url = doc.url || doc.mediaKey;
  }

  if (!result.phone && data.from) {
    result.phone = data.from.replace('@s.whatsapp.net', '').replace('@g.us', '');
  }

  return result;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const payload = req.body || {};

    if (!IS_PRODUCTION) {
      console.log('=== EVOLUTION WEBHOOK ===');
      console.log('Event:', payload.event);
    }

    let messageData = payload;

    if (payload.event === 'messages.upsert' && payload.data?.messages) {
      messageData = {
        ...payload.data.messages[0],
        pushName: payload.data.pushName
      };
    }

    const parsed = parseWebhookPayload(messageData);

    const enrichedPayload = {
      ...messageData,
      content: parsed.content,
      phone: parsed.phone,
      contact_name: parsed.contact_name,
      media_type: parsed.media_type,
      media_url: parsed.media_url,
      media_caption: parsed.media_caption,
      channel: 'whatsapp'
    };

    const saved = await saveIncomingMessage(enrichedPayload);

    res.status(200).json({ 
      ok: true, 
      conversationId: saved?.conversation?.id,
      messageId: saved?.id
    });
  } catch (error) {
    if (!IS_PRODUCTION) {
      console.error('Webhook error:', error);
    }
    res.status(500).json({ ok: false, error: 'Erro ao processar mensagem' });
  }
};