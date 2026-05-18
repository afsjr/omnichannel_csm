/**
 * Módulo de integração com a Evolution API
 * 
 * Fornece funções para enviar mensagens de texto e mídia via WhatsApp
 * utilizando a Evolution API como gateway.
 * 
 * @requires fetch (nativo no Node.js 18+)
 * 
 * @example
 * const { sendMessageToEvolution } = require('./lib/evolution');
 * 
 * await sendMessageToEvolution({
 *   number: '5511999999999',
 *   message: 'Olá, tudo bem?'
 * });
 */

// Configurações da Evolution API (variáveis de ambiente)
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;

/**
 * Remove caracteres não numéricos do telefone e adiciona código do país
 * se necessário.
 * 
 * @param {string} phone - Número de telefone
 * @returns {string} Telefone formatado (apenas números com 55开头)
 * 
 * @example
 * formatPhone('11 99999-9999') // retorna '5511999999999'
 * formatPhone('11999999999')    // retorna '5511999999999'
 */
function formatPhone(phone) {
  const cleaned = (phone || '').replace(/\D/g, '');
  // Adiciona 55 (código Brasil) se não existir
  return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
}

/**
 * Obtém a URL base da API removendo "/api" se presente
 * Algumas instalações da Evolution usam /api, outras não
 * 
 * @returns {string} URL base da API
 */
function getBaseUrl() {
  const url = EVOLUTION_API_URL || '';
  if (url.includes('/api/')) {
    return url.replace(/\/api$/, '');
  }
  return url;
}

/**
 * Envia uma mensagem de texto via WhatsApp
 * 
 * @param {object} params - Parâmetros da mensagem
 * @param {string} params.number - Número do destinatário (com ou sem código do país)
 * @param {string} params.message - Texto da mensagem
 * @returns {Promise<object>} Resposta da Evolution API
 * 
 * @example
 * const result = await sendMessageToEvolution({
 *   number: '5511999999999',
 *   message: 'Olá! Como posso ajudar?'
 * });
 */
async function sendMessageToEvolution({ number, message }) {
  // Validação básica
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { 
      simulated: true, 
      error: 'Evolution API não configurada. Configure EVOLUTION_API_URL e EVOLUTION_API_KEY' 
    };
  }

  // Monta a URL da API - formato: /message/sendText/{instance}
  const url = `${getBaseUrl()}/message/sendText/${EVOLUTION_INSTANCE}`;

  // Prepara o corpo da requisição
  const body = {
    number: formatPhone(number),
    text: message
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(`Falha Evolution API: ${response.status} - ${JSON.stringify(data)}`);
    }

    return data;
  } catch (error) {
    console.error('Evolution sendMessage error:', error);
    return { simulated: true, error: error.message };
  }
}

/**
 * Envia mídia (imagem, vídeo, áudio, documento) via WhatsApp
 * 
 * @param {object} params - Parâmetros da mídia
 * @param {string} params.number - Número do destinatário
 * @param {string} params.media - URL ou base64 da mídia
 * @param {string} params.caption - Legenda opcional
 * @param {string} params.mediatype - Tipo: 'image', 'video', 'audio', 'document'
 * @returns {Promise<object>} Resposta da Evolution API
 * 
 * @example
 * await sendMediaToEvolution({
 *   number: '5511999999999',
 *   media: 'https://exemplo.com/imagem.jpg',
 *   caption: 'Minha imagem',
 *   mediatype: 'image'
 * });
 */
async function sendMediaToEvolution({ number, media, caption, mediatype }) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { simulated: true, error: 'Evolution API não configurada' };
  }

  // Mapeia tipo de mídia para endpoint correto
  const endpointMap = {
    image: 'sendImage',
    video: 'sendVideo',
    audio: 'sendAudio',
    document: 'sendDocument'
  };

  const endpoint = endpointMap[mediatype] || 'sendMedia';
  const url = `${getBaseUrl()}/message/${endpoint}/${EVOLUTION_INSTANCE}`;

  const body = {
    number: formatPhone(number),
    caption: caption || ''
  };

  // Suporta tanto URL quanto base64
  if (media.startsWith('http')) {
    body.mediaUrl = media;
  } else {
    body.media = media;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(`Falha Evolution API (mídia): ${response.status} - ${JSON.stringify(data)}`);
    }

    return data;
  } catch (error) {
    console.error('Evolution sendMedia error:', error);
    return { simulated: true, error: error.message };
  }
}

/**
 * Verifica o status da instância na Evolution API
 * 
 * @returns {Promise<object>} Status da conexão
 * 
 * @example
 * const status = await getInstanceStatus();
 * // { instance: { instanceName: 'omni_channel', state: 'open' } }
 */
async function getInstanceStatus() {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { error: 'Evolution API não configurada' };
  }

  const url = `${getBaseUrl()}/instance/connectionState/${EVOLUTION_INSTANCE}`;
  const response = await fetch(url, {
    headers: { 'apikey': EVOLUTION_API_KEY }
  });

  return response.json();
}

module.exports = {
  /**
   * Envia mensagem de texto
   * @type {function}
   */
  sendMessageToEvolution,
  
  /**
   * Envia mídia (imagem, vídeo, áudio, documento)
   * @type {function}
   */
  sendMediaToEvolution,
  
  /**
   * Verifica status da instância
   * @type {function}
   */
  getInstanceStatus
};