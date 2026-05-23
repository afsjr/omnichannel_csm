import { useChatStore } from '../contexts/ChatContext';
import { useAuthStore } from '../contexts/AuthContext';

export default function ConversationList({ conversations, type, emptyMessage }) {
  const { setActiveConversation, activeConversation, assignConversation } = useChatStore();
  const { user } = useAuthStore();

  const handleClick = async (conv) => {
    if (type === 'queue' && user) {
      await assignConversation(conv.id, user.id);
    }
    setActiveConversation(conv);
  };

  const formatTime = (date) => {
    if (!date) return ''
    return new Date(date.endsWith('Z') ? date : date + 'Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  };

  if (!conversations || conversations.length === 0) {
    return <p className="empty-message">{emptyMessage}</p>;
  }

  return (
    <ul className="conversation-list">
      {conversations.map((conv) => (
        <li
          key={conv.id}
          className={`conversation-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
          onClick={() => handleClick(conv)}
        >
          <div className="conv-header">
            <span className="contact-name">{conv.contact_name || conv.contact_phone}</span>
            <span className="conv-time">{formatTime(conv.last_message_at)}</span>
          </div>
          <div className="conv-info">
            <span className="department">{conv.department_name || 'Sem setor'}</span>
            {conv.ai_draft && <span className="ai-badge">AI</span>}
            {getPriorityLabel(conv.priority) && (
              <span className={`priority priority-${conv.priority}`}>
                {getPriorityLabel(conv.priority)}
              </span>
            )}
          </div>
          {type === 'mine' && conv.ai_draft && (
            <div className="draft-preview">
              {conv.ai_draft.substring(0, 50)}...
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}