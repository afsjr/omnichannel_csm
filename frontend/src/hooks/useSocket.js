import socketService from '../services/socket';
import { useChatStore } from '../contexts/ChatContext';

const useSocket = () => {
  const appendMessage = useChatStore((s) => s.appendMessage);
  const updateConversationDraft = useChatStore((s) => s.updateConversationDraft);
  const loadQueue = useChatStore((s) => s.loadQueue);
  const loadMyConversations = useChatStore((s) => s.loadMyConversations);

  const setupSocketListeners = () => {
    socketService.on('new_message', (data) => {
      appendMessage(data.message);
    });

    socketService.on('draft_updated', (data) => {
      updateConversationDraft(data.conversationId, data.draft, data.confidence);
    });

    socketService.on('ai_processing_complete', (data) => {
      updateConversationDraft(data.conversationId, data.draft, data.confidence);
    });

    socketService.on('conversation_assigned', (data) => {
      loadMyConversations();
    });
  };

  const cleanupSocketListeners = () => {
    socketService.off('new_message');
    socketService.off('draft_updated');
    socketService.off('ai_processing_complete');
    socketService.off('conversation_assigned');
  };

  return {
    setupSocketListeners,
    cleanupSocketListeners,
    connect: socketService.connect,
    disconnect: socketService.disconnect
  };
}

export default useSocket;