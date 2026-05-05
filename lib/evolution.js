async function sendMessageToEvolution({ number, message }) {
  if (!process.env.EVOLUTION_SEND_URL) {
    return { simulated: true };
  }

  const response = await fetch(process.env.EVOLUTION_SEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.EVOLUTION_API_KEY ? { apikey: process.env.EVOLUTION_API_KEY } : {})
    },
    body: JSON.stringify({ number, text: message })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Falha Evolution: ${response.status}`);
  return data;
}

module.exports = { sendMessageToEvolution };
