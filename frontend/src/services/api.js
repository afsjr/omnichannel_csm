const API_BASE = import.meta.env.VITE_API_URL || '/api';
const WS_URL = import.meta.env.VITE_WS_URL || '';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
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