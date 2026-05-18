import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '../contexts/ChatContext'
import { useAuthStore } from '../contexts/AuthContext'

export default function ChatWindow() {
  const { user } = useAuthStore()
  const { 
    activeConversation, 
    messages, 
    draft, 
    draftConfidence,
    classifiedDepartment,
    isAILoading,
    sendMessage, 
    sendMediaMessage,
    processWithAI,
    updateDraft,
    resolveConversation,
    isLoading 
  } = useChatStore()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [editingDraft, setEditingDraft] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [showMediaPanel, setShowMediaPanel] = useState(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    setDraftText(draft || '')
  }, [draft])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    await sendMessage(input.trim(), user?.id)
    setInput('')
    setSending(false)
    inputRef.current?.focus()
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleUseDraft = () => {
    setInput(draft || '')
    inputRef.current?.focus()
  }

  const handleRegenerate = async () => {
    if (activeConversation) {
      await processWithAI(activeConversation.id)
    }
  }

  const handleSaveDraft = async () => {
    await updateDraft(draftText)
    setEditingDraft(false)
  }

  const handleResolve = async () => {
    if (window.confirm('Encerrar este atendimento?')) {
      await resolveConversation(activeConversation.id)
    }
  }

  const handleMediaSelect = (type) => {
    fileInputRef.current?.click()
    fileInputRef.current?.setAttribute('accept', 
      type === 'image' ? 'image/*' : 
      type === 'video' ? 'video/*' : 
      type === 'audio' ? 'audio/*' : '*/*'
    )
    fileInputRef.current?.setAttribute('data-type', type)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSending(true)
    
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      
      const type = file.type.startsWith('image/') ? 'image' :
                   file.type.startsWith('video/') ? 'video' :
                   file.type.startsWith('audio/') ? 'audio' : 'document'

      await sendMediaMessage(type, base64, '')
      setSending(false)
    }
    reader.readAsDataURL(file)
    
    e.target.value = ''
  }

  const getMediaIcon = (msg) => {
    const meta = msg.metadata || {}
    const type = meta.media_type
    if (type === 'image') return '🖼️'
    if (type === 'video') return '🎬'
    if (type === 'audio') return '🎵'
    if (type === 'document') return '📄'
    return '📎'
  }

  const isMediaMessage = (msg) => {
    const meta = msg.metadata || {}
    return meta.media_type && (msg.direction === 'incoming' || meta.media_url)
  }

  const formatTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('pt-BR')
  }

  const isResolved = activeConversation?.status === 'resolved'

  if (!activeConversation) return null

  return (
    <div className="chat-window">
      <header className="chat-header">
        <div className="chat-contact">
          <h2>{activeConversation.contact_name || activeConversation.contact_phone}</h2>
          <span className="channel">{activeConversation.channel}</span>
        </div>
        <div className="chat-actions">
          {isResolved && <span className="resolved-badge">🔒 Encerrada</span>}
          {!isResolved && (
            <>
              <span className="dept-badge">{classifiedDepartment || activeConversation.department_name || 'Sem setor'}</span>
              <button onClick={handleRegenerate} disabled={isAILoading} className="btn-ai">
                {isAILoading ? '🤖 IA...' : '🤖 Gerar IA'}
              </button>
              <button onClick={handleResolve} className="btn-resolve">Encerrar</button>
            </>
          )}
        </div>
      </header>

      {isAILoading && !isResolved && (
        <div className="ai-loading">
          <span>🤖 Analisando mensagem e gerando sugestão...</span>
        </div>
      )}

      {draft && !editingDraft && !isAILoading && !isResolved && (
        <div className="ai-draft-box">
          <div className="ai-draft-header">
            <span>✨ Sugestão da IA</span>
            {draftConfidence && <span className="confidence">{Math.round(draftConfidence * 100)}%</span>}
            <div className="ai-actions">
              <button onClick={() => setEditingDraft(true)} title="Editar">✏️</button>
              <button onClick={handleRegenerate} title="Regenerar">🔄</button>
              <button onClick={handleUseDraft} className="btn-use">Usar</button>
            </div>
          </div>
          <div className="ai-draft-content">
            <p>{draft}</p>
          </div>
        </div>
      )}

      {editingDraft && (
        <div className="draft-editor">
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Edite a sugestão da IA..."
            rows={3}
          />
          <div className="draft-editor-actions">
            <button onClick={() => setEditingDraft(false)} className="btn-cancel">Cancelar</button>
            <button onClick={handleSaveDraft} className="btn-save">Salvar</button>
          </div>
        </div>
      )}

      <div className="messages-container">
        {isLoading ? (
          <div className="loading">Carregando mensagens...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">Nenhuma mensagem ainda</div>
        ) : (
          messages.map((msg, idx) => {
            const showDate = idx === 0 || formatDate(messages[idx - 1]?.created_at) !== formatDate(msg.created_at)
            const isAIMessage = msg.sender_type === 'ai' || msg.metadata?.action === 'ai_triage'
            return (
              <div key={msg.id || idx}>
                {showDate && <div className="date-divider">{formatDate(msg.created_at)}</div>}
                <div className={`message ${msg.direction} ${isAIMessage ? 'ai-message' : ''}`}>
                  {isAIMessage && <div className="ai-icon">🤖</div>}
                  <div className="message-content">
                    {isAIMessage ? (
                      <div className="ai-content">
                        {msg.content.split('\n').map((line, i) => (
                          <div key={i} className={line.startsWith('**') ? 'ai-line-bold' : ''}>
                            {line.replace(/\*\*/g, '')}
                          </div>
                        ))}
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  <div className="message-meta">
                    {isAIMessage ? <span className="ai-label">Análise IA</span> : <span className="time">{formatTime(msg.created_at)}</span>}
                    {msg.direction === 'outgoing' && !isAIMessage && <span className="status">{msg.status}</span>}
                  </div>
                  {isMediaMessage(msg) && (
                    <div className="media-preview">
                      {msg.metadata?.media_type === 'image' && (
                        <img src={msg.metadata?.media_url} alt="Imagem" onClick={() => window.open(msg.metadata?.media_url, '_blank')} />
                      )}
                      {msg.metadata?.media_type === 'video' && (
                        <video src={msg.metadata?.media_url} controls onClick={() => window.open(msg.metadata?.media_url, '_blank')} />
                      )}
                      {msg.metadata?.media_type === 'audio' && (
                        <audio src={msg.metadata?.media_url} controls />
                      )}
                      {msg.metadata?.media_type === 'document' && (
                        <a href={msg.metadata?.media_url} target="_blank" rel="noopener noreferrer" className="document-link">
                          📄 {msg.metadata?.media_caption || 'Documento'}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {!isResolved && (
        <div className="chat-input">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div className="media-buttons">
            <button type="button" onClick={() => handleMediaSelect('image')} title="Enviar imagem">🖼️</button>
            <button type="button" onClick={() => handleMediaSelect('video')} title="Enviar vídeo">🎬</button>
            <button type="button" onClick={() => handleMediaSelect('audio')} title="Enviar áudio">🎵</button>
            <button type="button" onClick={() => handleMediaSelect('document')} title="Enviar arquivo">📎</button>
          </div>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            rows={2}
            disabled={sending}
          />
          <div className="input-footer">
            <span className="char-count">{input.length}</span>
            <button onClick={handleSend} disabled={!input.trim() || sending} className="btn-send">
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}