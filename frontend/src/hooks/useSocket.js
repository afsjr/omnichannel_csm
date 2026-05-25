import socketService from '../services/socket';
import { useChatStore } from '../contexts/ChatContext';

const useSocket = () => {
  const addMessage = useChatStore((s) => s.addMessage);
  const updateConversationDraft = useChatStore((s) => s.updateConversationDraft);
  const loadQueue = useChatStore((s) => s.loadQueue);
  const loadMyConversations = useChatStore((s) => s.loadMyConversations);

  const setupSocketListeners = () => {
    socketService.on('new_message', (data) => {
      addMessage(data.message);
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

    socketService.on('message_updated', (data) => {
      const store = useChatStore.getState();
      if (store.activeConversation?.id === data.conversationId) {
        if (data.message?.id) {
          store.updateMessage(data.message.id, data.message);
        } else {
          store.refreshMessages(data.conversationId);
        }
      }
    });
  };

  const cleanupSocketListeners = () => {
    socketService.off('new_message');
    socketService.off('draft_updated');
    socketService.off('ai_processing_complete');
    socketService.off('conversation_assigned');
    socketService.off('message_updated');
  };

  return {
    setupSocketListeners,
    cleanupSocketListeners,
    connect: socketService.connect,
    disconnect: socketService.disconnect
  };
}

export default useSocket;
