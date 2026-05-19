import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const ROLES = {
  MASTER: 'master',
  ADMIN: 'admin',
  LEADER: 'leader',
  AGENT: 'agent'
}

export const PERMISSIONS = {
  'users:create': [ROLES.MASTER, ROLES.ADMIN],
  'users:read': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'users:update': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'users:delete': [ROLES.MASTER, ROLES.ADMIN],
  'team:manage': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'conversations:read_all': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'conversations:assign': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
  'settings:write': [ROLES.MASTER, ROLES.ADMIN],
  'reports:export': [ROLES.MASTER, ROLES.ADMIN],
  'companies:create': [ROLES.MASTER],
  'companies:read': [ROLES.MASTER]
}

export function hasPermission(role, permission) {
  if (!role) return false
  if (role === ROLES.MASTER) return true
  return PERMISSIONS[permission]?.includes(role) || false
}

export function canAccessRoute(role, route) {
  const routePermissions = {
    '/admin': [ROLES.MASTER, ROLES.ADMIN],
    '/users': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
    '/settings': [ROLES.MASTER, ROLES.ADMIN],
    '/reports': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER],
    '/team': [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER]
  }
  const allowed = routePermissions[route]
  if (!allowed) return true
  return allowed.includes(role)
}

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          })
          const data = await response.json()

          if (data.ok) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
            return true
          } else {
            set({ isLoading: false, error: data.error })
            return false
          }
        } catch (error) {
          set({ isLoading: false, error: 'Erro de conexão' })
          return false
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, error: null })
      },

      clearError: () => set({ error: null }),

      hasPermission: (permission) => {
        const { user } = useAuthStore.getState()
        if (!user) return false
        return hasPermission(user.role, permission)
      },

      canAccessRoute: (route) => {
        const { user } = useAuthStore.getState()
        if (!user) return false
        return canAccessRoute(user.role, route)
      },

      isMaster: () => {
        const { user } = useAuthStore.getState()
        return user?.role === ROLES.MASTER
      },

      isAdmin: () => {
        const { user } = useAuthStore.getState()
        return user?.role === ROLES.ADMIN || user?.role === ROLES.MASTER
      },

      isLeader: () => {
        const { user } = useAuthStore.getState()
        return [ROLES.MASTER, ROLES.ADMIN, ROLES.LEADER].includes(user?.role)
      },

      getUsers: async (params = {}) => {
        const { token } = useAuthStore.getState()
        if (!token) return { ok: false, error: 'Não autenticado' }
        
        const query = new URLSearchParams(params).toString()
        const response = await fetch(`/api/auth/manage-users?${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        return await response.json()
      },

      createUser: async (userData) => {
        const { token } = useAuthStore.getState()
        if (!token) return { ok: false, error: 'Não autenticado' }
        
        const response = await fetch('/api/auth/manage-users', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(userData)
        })
        return await response.json()
      },

      updateUser: async (userId, updates) => {
        const { token } = useAuthStore.getState()
        if (!token) return { ok: false, error: 'Não autenticado' }
        
        const response = await fetch('/api/auth/manage-users', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ userId, ...updates })
        })
        return await response.json()
      },

      deleteUser: async (userId) => {
        const { token } = useAuthStore.getState()
        if (!token) return { ok: false, error: 'Não autenticado' }
        
        const response = await fetch('/api/auth/manage-users', {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ userId })
        })
        return await response.json()
      }
    }),
    {
      name: 'omnichat-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

export default useAuthStore