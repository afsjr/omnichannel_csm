import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../contexts/ChatContext';
import { useAuthStore } from '../contexts/AuthContext';
import { aiApi } from '../services/api';
import AIDraftBox from './AIDraftBox';

export default function ChatWindow({ conversation }) {
  const { messages, sendMessage, resolveConversation, loadMessages, isLoading } = useChatStore();
  const { user } = useAuthStore();
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadMessages(conversation.id);
  }, [conversation.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    setIsSending(true);
    const content = inputValue.trim();
    setInputValue('');

    try {
      await sendMessage(content, user?.id);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResolve = async () => {
    if (window.confirm('Encerrar este atendimento?')) {
      await resolveConversation(conversation.id);
    }
  };

  const handleUseDraft = () => {
    const draft = conversation.ai_draft;
    if (draft) {
      setInputValue(draft);
      inputRef.current?.focus();
    }
  };

  const handleRegenerateDraft = async () => {
    try {
      await aiApi.generateDraft(conversation.id, true);
      await loadMessages(conversation.id);
    } catch (error) {
      console.error('Failed to regenerate draft:', error);
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="chat-window">
      <header className="chat-header">
        <div className="contact-info">
          <h2>{conversation.contact_name || conversation.contact_phone}</h2>
          <span>{conversation.channel}</span>
        </div>
        <div className="chat-actions">
          <span className="department-badge">{conversation.department_name || 'Sem setor'}</span>
          <button onClick={handleResolve} className="btn-resolve">Encerrar</button>
        </div>
      </header>

      {conversation.ai_draft && (
        <AIDraftBox
          draft={conversation.ai_draft}
          confidence={conversation.ai_confidence}
          onUse={handleUseDraft}
          onRegenerate={handleRegenerateDraft}
        />
      )}

      <div className="messages-container">
        {isLoading ? (
          <div className="loading">Carregando mensagens...</div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const showDate = idx === 0 || formatDate(messages[idx - 1].created_at) !== formatDate(msg.created_at);
              return (
                <div key={msg.id || idx}>
                  {showDate && <div className="date-divider">{formatDate(msg.created_at)}</div>}
                  <div className={`message ${msg.direction}`}>
                    <div className="message-content">
                      {msg.content}
                    </div>
                    <div className="message-meta">
                      <span className="message-time">{formatTime(msg.created_at)}</span>
                      {msg.sender_type === 'user' && msg.sender_name && (
                        <span className="message-sender">{msg.sender_name}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite sua mensagem..."
          rows={3}
          disabled={isSending}
        />
        <div className="input-actions">
          <span className="char-count">{inputValue.length}</span>
          <button onClick={handleSend} disabled={!inputValue.trim() || isSending}>
            {isSending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}