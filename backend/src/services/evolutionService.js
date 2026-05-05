async function sendMessageToEvolution({ number, message }) {
  const endpoint = process.env.EVOLUTION_SEND_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!endpoint) {
    return {
      simulated: true,
      detail: 'EVOLUTION_SEND_URL nao configurada. Envio simulado.'
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { apikey: apiKey } : {})
    },
    body: JSON.stringify({
      number,
      text: message
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Falha Evolution API: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

module.exports = {
  sendMessageToEvolution
};
