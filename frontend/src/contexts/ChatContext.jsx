import { create } from 'zustand'

export const useChatStore = create((set) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  queue: [],
  draft: null,
  
  setActiveConversation: (conv) => set({ activeConversation: conv, messages: [], draft: conv?.ai_draft }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setQueue: (queue) => set({ queue }),
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null })
}))

export default useChatStore