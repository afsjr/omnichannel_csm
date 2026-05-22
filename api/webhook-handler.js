const { saveIncomingMessage } = require('../lib/messages');

function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/@s\.whatsapp\.net/, '').replace(/@g\.us/, '');
}

function parseEvolutionPayload(payload) {
  let msgObj = payload;
  if (payload.data) {
    if (Array.isArray(payload.data.messages) && payload.data.messages.length > 0) {
      msgObj = { ...payload.data.messages[0], pushName: payload.data.pushName };
    } else if (payload.data.key) {
      msgObj = payload.data;
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
  return result;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }
  try {
    const payload = req.body || {};
    console.log('WEBHOOK RECEIVED event:', payload.event);
    let messageData = payload;
    if (payload.event === 'messages.upsert') {
      if (payload.data?.messages) {
        messageData = { ...payload.data.messages[0], pushName: payload.data.pushName };
      } else if (payload.data?.key) {
        messageData = payload.data;
      }
    }
    const parsed = parseEvolutionPayload(messageData);
    console.log('WEBHOOK parsed:', JSON.stringify(parsed));
    if (!parsed.content && !parsed.media_type && !parsed.phone) {
      console.log('Webhook: sem dados úteis, ignorando');
      return res.status(200).json({ ok: true, ignored: true });
    }
    const enrichedPayload = { ...messageData, content: parsed.content, phone: parsed.phone, contact_name: parsed.contact_name, media_type: parsed.media_type, media_url: parsed.media_url, media_caption: parsed.media_caption, channel: 'whatsapp' };
    const saved = await saveIncomingMessage(enrichedPayload);
    console.log('WEBHOOK saved: convId=%s msgId=%s', saved?.conversation?.id, saved?.id);
    res.status(200).json({ ok: true, conversationId: saved?.conversation?.id, messageId: saved?.id });
  } catch (error) {
    console.error('Webhook error:', error.message, error.stack);
    res.status(200).json({ ok: false, error: 'Erro ao processar mensagem' });
  }
};
