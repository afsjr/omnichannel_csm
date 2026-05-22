import { useAuthStore } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return useAuthStore.getState().token;
}

async function refreshToken() {
  const { refreshToken: rt } = useAuthStore.getState();
  if (!rt) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt })
    });
    const data = await res.json();
    if (data.ok) {
      useAuthStore.setState({
        token: data.data.token,
        refreshToken: data.data.refresh_token
      });
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
  }

  async request(endpoint, options = {}) {
    const token = getToken();
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    let response = await fetch(url, config);

    if (response.status === 401 && token) {
      const refreshed = await refreshToken();
      if (refreshed) {
        const newToken = getToken();
        config.headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(url, config);
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body: data });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body: data });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

const api = new ApiClient();

export default api;

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me')
};

export const messageApi = {
  send: (conversationId, content, senderId) =>
    api.post('/messages/send', { conversationId, content, senderId }),
  getConversation: (id) => api.get(`/messages/conversation/${id}`),
  getQueue: (companyId, departmentId) =>
    api.get(`/messages/queue?companyId=${companyId}${departmentId ? `&departmentId=${departmentId}` : ''}`),
  getMyConversations: (companyId, userId) =>
    api.get(`/messages/my-conversations?companyId=${companyId}&userId=${userId}`),
  assign: (conversationId, userId) =>
    api.post('/messages/assign', { conversationId, userId }),
  updateDraft: (conversationId, draft) =>
    api.post('/messages/draft', { conversationId, draft }),
  resolve: (conversationId) =>
    api.post('/messages/resolve', { conversationId }),
  requeue: (conversationId) =>
    api.post('/messages/requeue', { conversationId })
};

export const aiApi = {
  triage: (conversationId) => api.post('/ai/triage', { conversationId }),
  generateDraft: (conversationId, regenerate, instruction) =>
    api.post('/ai/draft', { conversationId, regenerate, instruction }),
  getJobStatus: (jobId) => api.get(`/ai/jobs/${jobId}`)
};

export const departmentApi = {
  list: (companyId) => api.get(`/departments?companyId=${companyId}`)
};