const { saveIncomingMessage } = require('../lib/messages');

function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/@s\.whatsapp\.net/, '').replace(/@g\.us/, '');
}

function parseEvolutionPayload(payload) {
  let msgObj = payload;

  if (Array.isArray(payload) && payload.length > 0) {
    payload = payload[0];
    msgObj = payload;
  }
  
  if (payload.data) {
    if (Array.isArray(payload.data) && payload.data.length > 0) {
      msgObj = payload.data[0];
    } else if (Array.isArray(payload.data.messages) && payload.data.messages.length > 0) {
      msgObj = { ...payload.data.messages[0], pushName: payload.data.pushName };
    } else if (payload.data.message && payload.data.message.key) { // v1
      msgObj = payload.data.message;
      if (payload.data.pushName) msgObj.pushName = payload.data.pushName;
    } else if (payload.data.key) { // v2
      msgObj = payload.data;
    } else {
      msgObj = { ...payload.data, ...payload.data.message };
    }
  }

  if (payload.messages && Array.isArray(payload.messages) && payload.messages.length > 0) {
    msgObj = payload.messages[0];
  }

  const result = { content: '', media_type: null, media_url: null, media_caption: null, phone: null, contact_name: null };
  if (msgObj.key?.remoteJid) result.phone = normalizePhone(msgObj.key.remoteJid);
  if (msgObj.pushName) result.contact_name = msgObj.pushName;
  
  const msg = msgObj.message || msgObj;
  
  if (typeof msg.conversation === 'string') { result.content = msg.conversation; }
  else if (msg.extendedTextMessage?.text) { result.content = msg.extendedTextMessage.text; }
  else if (msg.imageMessage) { const i = msg.imageMessage; result.content = i.caption || '[Imagem]'; result.media_type = 'image'; result.media_url = i.url || i.mediaKey; result.media_caption = i.caption; }
  else if (msg.videoMessage) { const v = msg.videoMessage; result.content = v.caption || '[Vídeo]'; result.media_type = 'video'; result.media_url = v.url || v.mediaKey; result.media_caption = v.caption; }
  else if (msg.audioMessage) { result.content = '[Áudio]'; result.media_type = 'audio'; result.media_url = msg.audioMessage.url || msg.audioMessage.mediaKey; }
  else if (msg.documentMessage) { const d = msg.documentMessage; result.content = d.fileName || '[Documento]'; result.media_type = 'document'; result.media_url = d.url || d.mediaKey; }
  
  if (!result.phone && msgObj.from) result.phone = normalizePhone(msgObj.from);
  
  // Ignore sent messages
  if (msgObj.key?.fromMe) {
    result.ignore = true;
  }
  
  return result;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  try {
    let payload = req.body || {};
    
    // Evolution API v2 pode enviar array no top-level
    if (Array.isArray(payload) && payload.length > 0) {
      payload = payload[0];
    }
    
    console.log('WEBHOOK RECEIVED event:', payload.event);
    
    // Process messages.upsert
    if (payload.event === 'messages.upsert' || payload.event === 'MESSAGES_UPSERT') {
      const parsed = parseEvolutionPayload(payload);
      
      if (parsed.ignore) {
        return res.status(200).json({ ok: true, ignored: true, reason: 'fromMe' });
      }
      
      if (!parsed.content && !parsed.media_type && !parsed.phone) {
        console.log('Webhook: sem dados úteis, ignorando', JSON.stringify(parsed));
        return res.status(200).json({ ok: true, ignored: true });
      }

      const enrichedPayload = { 
        ...payload, 
        content: parsed.content, 
        phone: parsed.phone, 
        contact_name: parsed.contact_name, 
        media_type: parsed.media_type, 
        media_url: parsed.media_url, 
        media_caption: parsed.media_caption, 
        channel: 'whatsapp' 
      };
      
      const saved = await saveIncomingMessage(enrichedPayload);
      console.log('WEBHOOK saved: convId=%s msgId=%s', saved?.conversation?.id, saved?.id);
      
      // Trigger AI processing in background
      if (saved?.conversation?.id) {
        const baseUrl = req.headers['x-forwarded-proto'] ? `${req.headers['x-forwarded-proto']}://${req.headers.host}` : `http://${req.headers.host}`;
        fetch(`${baseUrl}/api/ai/draft`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-internal-trigger': 'true'
          },
          body: JSON.stringify({ conversationId: saved.conversation.id })
        }).catch(e => console.error('AI draft trigger error:', e));
      }

      return res.status(200).json({ ok: true, conversationId: saved?.conversation?.id, messageId: saved?.id });
    }
    
    // Ack other events
    return res.status(200).json({ ok: true, ignored: true, event: payload.event });
  } catch (error) {
    console.error('Webhook error:', error.message, error.stack);
    return res.status(500).json({ ok: false, error: 'Erro ao processar mensagem' });
  }
};
