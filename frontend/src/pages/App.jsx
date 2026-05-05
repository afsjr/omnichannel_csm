import { useEffect, useState } from 'react';

export default function App() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadMessages() {
      const response = await fetch('/api/messages?company_id=1&limit=50');
      const json = await response.json();
      if (active && json.ok) {
        setMessages(json.data);
      }
    }

    loadMessages();
    const intervalId = setInterval(loadMessages, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: '24px auto', fontFamily: 'sans-serif' }}>
      <h1>OmniChat SaaS</h1>
      <p>Mensagens recebidas em tempo real</p>
      {messages.map((m, index) => (
        <article key={`${m.id || 'msg'}-${m.created_at || index}`} style={{ borderBottom: '1px solid #ddd', padding: '8px 0' }}>
          <strong>{m.sender}</strong>
          <p>{m.content}</p>
        </article>
      ))}
    </main>
  );
}
