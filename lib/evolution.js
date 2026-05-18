const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;

function getBaseUrl() {
  const url = EVOLUTION_API_URL || '';
  if (url.includes('/api/')) {
    return url.replace(/\/api$/, '');
  }
  return url;
}

function formatPhone(phone) {
  const cleaned = (phone || '').replace(/\D/g, '');
  return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
}

async function sendMessageToEvolution({ number, message }) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { simulated: true, error: 'Evolution API não configurada' };
  }

  const url = `${getBaseUrl()}/message/sendText/${EVOLUTION_INSTANCE}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY
    },
    body: JSON.stringify({
      number: formatPhone(number),
      text: message
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Falha Evolution API: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data;
}

async function sendMediaToEvolution({ number, media, caption, mediatype }) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { simulated: true, error: 'Evolution API não configurada' };
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
}

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
  sendMessageToEvolution,
  sendMediaToEvolution,
  getInstanceStatus
};