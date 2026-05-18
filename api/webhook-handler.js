/**
 * Webhook Handler para Evolution API
 * 
 * Este endpoint recebe as mensagens que chegam via WhatsApp.
 * É chamado pela Evolution API sempre que uma nova mensagem for recebida.
 * 
 * Endpoint: POST /api/webhook-handler
 * 
 * Fluxo:
 * 1. Recebe payload da Evolution API
 * 2. Faz o parse do payload (extrai texto, mídia, telefone, nome)
 * 3. Cria/atualiza contato no banco
 * 4. Cria/atualiza conversa
 * 5. Salva a mensagem
 * 6. Retorna OK para Evolution
 * 
 * @example
 * // Payload típico recebido:
 * {
 *   "event": "messages.upsert",
 *   "data": {
 *     "messages": [{
 *       "key": { "remoteJid": "551199999999@s.whatsapp.net" },
 *       "pushName": "Maria Silva",
 *       "message": { "conversation": ["Olá, preciso de ajuda"] }
 *     }]
 *   }
 * }
 * 
 * // Response esperada (para Evolution confirmar recebimento):
 * { "ok": true, "conversationId": 123, "messageId": 456 }
 */

const { saveIncomingMessage } = require('../lib/messages');

/**
 * Normaliza o telefone removendo sufixos do WhatsApp
 * 
 * @param {string} phone - Telefone com sufixo
 * @returns {string} Telefone limpo
 * 
 * @example
 * "551199999999@s.whatsapp.net" → "5511999999999"
 * "551199999999@g.us" → "5511999999999"
 */
function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace('@s.whatsapp.net', '').replace('@g.us', '');
}

/**
 * Parsing do payload da Evolution API
 * 
 * A Evolution pode enviar o payload em diferentes formatos.
 * Esta função tenta extrair as informações de qualquer formato.
 * 
 * @param {object} payload - Payload completo recebido
 * @returns {object} Dados extraídos { content, phone, contact_name, media_type, media_url }
 */
function parseEvolutionPayload(payload) {
  // Evolution API v2 envía el evento dentro de 'event' y los datos en 'data'
  let data = payload;

  // Si viene con estructura de evento (messages.upsert)
  if (payload.data && payload.message) {
    data = { ...payload, ...payload.data };
  }

  // Si viene como array de mensajes
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

  // Extrae telefone do remoteJid
  if (data.key?.remoteJid) {
    result.phone = normalizePhone(data.key.remoteJid);
  }

  // Extrai nome do remetente
  if (data.pushName) {
    result.contact_name = data.pushName;
  }

  // Extrai conteúdo da mensagem
  const msg = data.message || data;

  // Texto simples (conversation)
  if (msg?.conversation?.[0]) {
    result.content = msg.conversation[0];
  }
  // Texto estendido (extendedTextMessage)
  else if (msg?.extendedTextMessage?.text) {
    result.content = msg.extendedTextMessage.text;
  }
  // Imagem com legenda
  else if (msg?.imageMessage) {
    const img = msg.imageMessage;
    result.content = img.caption || '[Imagem]';
    result.media_type = 'image';
    result.media_url = img.url || img.mediaKey || img.directPath;
    result.media_caption = img.caption;
  }
  // Vídeo
  else if (msg?.videoMessage) {
    const vid = msg.videoMessage;
    result.content = vid.caption || '[Vídeo]';
    result.media_type = 'video';
    result.media_url = vid.url || vid.mediaKey || vid.directPath;
    result.media_caption = vid.caption;
  }
  // Áudio (nota de voz)
  else if (msg?.audioMessage) {
    result.content = '[Áudio]';
    result.media_type = 'audio';
    result.media_url = msg.audioMessage.url || msg.audioMessage.mediaKey;
  }
  // Documento
  else if (msg?.documentMessage) {
    const doc = msg.documentMessage;
    result.content = doc.fileName || '[Documento]';
    result.media_type = 'document';
    result.media_url = doc.url || doc.mediaKey;
  }

  // Fallback: phone también puede venir en 'from'
  if (!result.phone && data.from) {
    result.phone = normalizePhone(data.from);
  }

  return result;
}

/**
 * Handler principal do webhook
 * 
 * Processa todas as requisições POST que chegam ao webhook.
 */
module.exports = async (req, res) => {
  // Apenas POST é aceito
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const payload = req.body || {};

    // Log apenas em ambiente de desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      console.log('=== EVOLUTION WEBHOOK ===');
      console.log('Event:', payload.event);
    }

    // Extrai os dados relevantes do payload
    let messageData = payload;

    // Formato específico do evento messages.upsert
    if (payload.event === 'messages.upsert' && payload.data?.messages) {
      messageData = {
        ...payload.data.messages[0],
        pushName: payload.data.pushName
      };
    }

    // Faz o parse do payload
    const parsed = parseEvolutionPayload(messageData);

    // Prepara payload enriquecido para salvar no banco
    const enrichedPayload = {
      ...messageData,
      content: parsed.content,
      phone: parsed.phone,
      contact_name: parsed.contact_name,
      media_type: parsed.media_type,
      media_url: parsed.media_url,
      media_caption: parsed.media_caption,
      channel: 'whatsapp'  // Define o canal como WhatsApp
    };

    // Valida se temos conteúdo ou mídia para salvar
    if (!parsed.content && !parsed.media_type) {
      console.log('Webhook: mensagem sem conteúdo, ignorando');
      return res.status(200).json({ ok: true, ignored: true });
    }

    // Salva a mensagem no banco de dados
    const saved = await saveIncomingMessage(enrichedPayload);

    // Retorna sucesso para a Evolution API
    res.status(200).json({ 
      ok: true, 
      conversationId: saved?.conversation?.id,
      messageId: saved?.id
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    // Sempre retorna 200 para a Evolution para evitar reenvios contínuos
    res.status(500).json({ ok: false, error: 'Erro ao processar mensagem' });
  }
};