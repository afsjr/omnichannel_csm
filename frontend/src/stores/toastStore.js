import { create } from 'zustand'

const TOAST_DURATION = 4000

export const useToastStore = create((set, get) => ({
  toasts: [],

  addToast(message, type = 'info') {
    const id = Date.now() + Math.random()
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), TOAST_DURATION)
  },

  removeToast(id) {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },
}))
