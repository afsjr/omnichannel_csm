const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': EVOLUTION_API_KEY || ''
  };
}

function formatPhone(phone) {
  const cleaned = (phone || '').replace(/\D/g, '');
  return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
}

function getBaseUrl() {
  const url = EVOLUTION_API_URL || '';
  if (url.includes('/api/')) {
    return url.replace(/\/api$/, '');
  }
  return url;
}

async function sendMessageToEvolution({ number, message }) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return {
      simulated: true,
      detail: 'Evolution API não configurada. Envio simulado.'
    };
  }

  const url = `${getBaseUrl()}/message/sendText/${EVOLUTION_INSTANCE}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      number: formatPhone(number),
      text: message
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Falha Evolution API: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function sendMediaToEvolution({ number, mediatype, media, caption, filename }) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return {
      simulated: true,
      detail: 'Evolution API não configurada. Envio simulado.'
    };
  }

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

  if (media.startsWith('http')) {
    body.mediaUrl = media;
  } else {
    body.media = media;
  }

  if (filename) {
    body.fileName = filename;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Falha Evolution API (mídia): ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function sendAudioToEvolution({ number, audio }) {
  return sendMediaToEvolution({
    number,
    mediatype: 'audio',
    media: audio,
    filename: 'audio.ogg'
  });
}

async function sendImageToEvolution({ number, image, caption }) {
  return sendMediaToEvolution({
    number,
    mediatype: 'image',
    media: image,
    caption
  });
}

async function sendVideoToEvolution({ number, video, caption }) {
  return sendMediaToEvolution({
    number,
    mediatype: 'video',
    media: video,
    caption
  });
}

module.exports = {
  sendMessageToEvolution,
  sendMediaToEvolution,
  sendAudioToEvolution,
  sendImageToEvolution,
  sendVideoToEvolution
};