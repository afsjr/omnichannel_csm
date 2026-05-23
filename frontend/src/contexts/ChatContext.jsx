import { create } from 'zustand'

const API = '/api'

async function apiFetch(endpoint, options = {}) {
  const auth = JSON.parse(localStorage.getItem('omnichat-auth') || '{}')
  const state = auth.state || {}
  
  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...options.headers
    }
  })

  if (res.status === 401) {
    localStorage.removeItem('omnichat-auth')
    window.location.href = '/login'
    return res
  }

  return res
}

export const useChatStore = create((set, get) => ({
  queue: [],
  myConversations: [],
  resolvedConversations: [],
  contacts: [],
  activeConversation: null,
  messages: [],
  draft: null,
  draftConfidence: null,
  isLoading: false,
  isAILoading: false,
  classifiedDepartment: null,
  error: null,

  fetchQueue: async (companyId = 1, departmentId = null) => {
    set({ isLoading: true })
    const url = `/messages/queue?companyId=${companyId}${departmentId ? `&departmentId=${departmentId}` : ''}`
    const res = await apiFetch(url)
    const data = await res.json()
    if (data.ok) {
      set({ queue: data.data || [], isLoading: false })
    } else {
      set({ error: data.error, isLoading: false })
    }
  },

  fetchMyConversations: async (companyId = 1, userId = null) => {
    const url = `/messages/my-conversations?companyId=${companyId}${userId ? `&userId=${userId}` : ''}`
    const res = await apiFetch(url)
    const data = await res.json()
    if (data.ok) {
      set({ myConversations: data.data || [] })
    }
  },

  fetchResolvedConversations: async (companyId = 1) => {
    const url = `/messages/resolved?companyId=${companyId}`
    const res = await apiFetch(url)
    const data = await res.json()
    if (data.ok) {
      set({ resolvedConversations: data.data || [] })
    }
  },

  fetchConversation: async (id) => {
    set({ isLoading: true })
    const res = await apiFetch(`/messages/conversation/${id}`)
    const data = await res.json()
    if (data.ok) {
      set({ 
        activeConversation: data.data.conversation,
        messages: data.data.messages || [],
        draft: data.data.conversation.ai_draft,
        draftConfidence: data.data.conversation.ai_confidence,
        isLoading: false
      })
    } else {
      set({ error: data.error, isLoading: false })
    }
  },

  refreshMessages: async (conversationId) => {
    const res = await apiFetch(`/messages/conversation/${conversationId}`)
    const data = await res.json()
    if (data.ok) {
      set({
        messages: data.data.messages || [],
        draft: data.data.conversation.ai_draft,
        draftConfidence: data.data.conversation.ai_confidence,
      })
    }
  },

  processWithAI: async (conversationId) => {
    set({ isAILoading: true })
    try {
      const [draftRes, triageRes] = await Promise.all([
        apiFetch('/ai/draft', {
          method: 'POST',
          body: JSON.stringify({ conversationId })
        }),
        apiFetch('/ai/triage', {
          method: 'POST',
          body: JSON.stringify({ conversationId })
        })
      ])

      const draftData = await draftRes.json()
      const triageData = await triageRes.json()

      const draft = draftData.ok ? draftData.data.draft : null
      const confidence = draftData.ok ? draftData.data.confidence : null
      const department = triageData.ok ? triageData.data.department : null
      const departmentId = triageData.ok ? triageData.data.departmentId : null
      
      set((s) => ({
        draft,
        draftConfidence: confidence,
        classifiedDepartment: department,
        activeConversation: s.activeConversation ? {
          ...s.activeConversation,
          department_name: department,
          department_id: departmentId,
          ai_draft: draft,
          ai_confidence: confidence
        } : null,
        isAILoading: false
      }))
      
      await get().fetchConversation(conversationId)
    } catch (error) {
      console.error('processWithAI error:', error)
      set({ isAILoading: false, error: error.message })
    }
  },

  setActiveConversation: (conv) => {
    set({ activeConversation: conv, messages: [], draft: conv?.ai_draft, draftConfidence: conv?.ai_confidence, classifiedDepartment: conv?.department_name })
    if (conv) {
      get().fetchConversation(conv.id)
    }
  },

  assignConversation: async (conversationId, userId) => {
    const res = await apiFetch('/messages/assign', {
      method: 'POST',
      body: JSON.stringify({ conversationId, userId })
    })
    const data = await res.json()
    if (data.ok) {
      const { queue, myConversations } = get()
      const conv = queue.find(c => c.id === conversationId)
      if (conv) {
        set({
          queue: queue.filter(c => c.id !== conversationId),
          myConversations: [conv, ...myConversations],
          activeConversation: conv
        })
        get().fetchConversation(conversationId)
        
        setTimeout(() => {
          get().processWithAI(conversationId).catch(e => console.error('AI process error:', e))
        }, 500)
      }
    }
    return data
  },

  sendMessage: async (content, senderId) => {
    const { activeConversation } = get()
    if (!activeConversation) return

    const res = await apiFetch('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ 
        conversationId: activeConversation.id, 
        content,
        senderId 
      })
    })
    const data = await res.json()
    if (data.ok) {
      set((s) => ({ messages: [...s.messages, data.message] }))
    }
    return data
  },

  updateDraft: async (draft) => {
    const { activeConversation } = get()
    if (!activeConversation) return

    const res = await apiFetch('/messages/draft', {
      method: 'POST',
      body: JSON.stringify({ conversationId: activeConversation.id, draft })
    })
    const data = await res.json()
    if (data.ok) {
      set({ draft, draftConfidence: data.data.ai_confidence })
    }
  },

  resolveConversation: async (conversationId) => {
    const res = await apiFetch('/messages/resolve', {
      method: 'POST',
      body: JSON.stringify({ conversationId })
    })
    const data = await res.json()
    if (data.ok) {
      const conv = get().myConversations.find(c => c.id === conversationId)
      set((s) => ({
        myConversations: s.myConversations.filter(c => c.id !== conversationId),
        resolvedConversations: conv ? [conv, ...s.resolvedConversations] : s.resolvedConversations,
        activeConversation: null,
        messages: [],
        draft: null
      }))
    }
    return data
  },

  reopenConversation: async (conversationId) => {
    const res = await apiFetch('/messages/reopen', {
      method: 'POST',
      body: JSON.stringify({ conversationId })
    })
    const data = await res.json()
    if (data.ok) {
      const conv = get().resolvedConversations.find(c => c.id === conversationId)
      set((s) => ({
        resolvedConversations: s.resolvedConversations.filter(c => c.id !== conversationId),
        queue: conv ? [conv, ...s.queue] : s.queue
      }))
    }
    return data
  },

  fetchContacts: async (companyId = 1, search = '') => {
    const url = `/contacts?companyId=${companyId}${search ? `&search=${encodeURIComponent(search)}` : ''}`
    const res = await apiFetch(url)
    const data = await res.json()
    if (data.ok) {
      set({ contacts: data.data || [] })
    }
  },

  createContact: async (name, phone, email = null) => {
    const res = await apiFetch('/contacts', {
      method: 'POST',
      body: JSON.stringify({ companyId: 1, name, phone, email })
    })
    const data = await res.json()
    if (data.ok) {
      set((s) => ({ contacts: [data.data, ...s.contacts] }))
    }
    return data
  },

  startConversation: async (contactId, content) => {
    const res = await apiFetch('/contacts/start-conversation', {
      method: 'POST',
      body: JSON.stringify({ contactId, content })
    })
    const data = await res.json()
    if (data.ok) {
      const conversation = data.data
      set((s) => ({
        queue: [conversation, ...s.queue],
        activeConversation: conversation
      }))
      if (conversation.id) {
        get().fetchConversation(conversation.id)
      }
    }
    return data
  },

  sendMediaMessage: async (type, url, caption) => {
    const { activeConversation } = get()
    if (!activeConversation) return

    const res = await apiFetch('/messages/send-media', {
      method: 'POST',
      body: JSON.stringify({
        conversationId: activeConversation.id,
        type,
        url,
        caption
      })
    })
    const data = await res.json()
    if (data.ok) {
      set((s) => ({ messages: [...s.messages, data.message] }))
    }
    return data
  },

  deleteMessage: async (messageId) => {
    const res = await apiFetch('/messages/delete', {
      method: 'POST',
      body: JSON.stringify({ id: messageId })
    })
    const data = await res.json()
    if (data.ok) {
      set((s) => ({ messages: s.messages.filter(m => m.id !== messageId) }))
    }
    return data
  },

  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  clearError: () => set({ error: null })
}))

export default useChatStore