class EvolutionProvider {
  constructor(config = {}) {
    const rawUrl = config.baseUrl || process.env.EVOLUTION_API_URL || '';
    this.baseUrl = rawUrl.includes('/api/') ? rawUrl.replace(/\/api$/, '') : rawUrl;
    this.apiKey = config.apiKey || process.env.EVOLUTION_API_KEY;
    this.instanceName = config.instanceName || process.env.EVOLUTION_INSTANCE;
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.apiKey
    };
  }

  async sendText(phone, text, options = {}) {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Evolution API not configured');
    }

    const url = `${this.baseUrl}/message/sendText/${this.instanceName}`;
    const body = {
      number: this.formatPhone(phone),
      text,
      options: {
        delay: options.delay || 1000,
        presence: options.presence || 'typing'
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Evolution API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async sendMedia(phone, media, caption = '', options = {}) {
    const url = `${this.baseUrl}/message/sendMedia/${this.instanceName}`;
    
    const body = {
      number: this.formatPhone(phone),
      caption,
      options: {
        delay: options.delay || 1000,
        presence: options.presence || 'typing'
      }
    };

    if (media.startsWith('http')) {
      body.mediaUrl = media;
    } else {
      body.media = media;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Evolution API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async setPresence(phone, presence = 'available') {
    const url = `${this.baseUrl}/chat/setPresence/${this.instanceName}`;
    const body = {
      number: this.formatPhone(phone),
      presence
    };

    return fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });
  }

  formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  }

  async connect(instanceName) {
    const url = `${this.baseUrl}/instance/connect/${instanceName}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Evolution API connect error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async disconnect(instanceName) {
    const url = `${this.baseUrl}/instance/disconnect/${instanceName}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Evolution API disconnect error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async downloadMedia(messageKey) {
    const url = `${this.baseUrl}/message/downloadMedia/${this.instanceName}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ messageKey })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Download media failed: ${response.status} - ${error}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      const nested = data.data || data;
      const base64 = nested.base64 || data.base64 || nested.media || data.media;

      if (base64) {
        const cleanBase64 = String(base64).replace(/^data:[^;]+;base64,/, '');
        return Buffer.from(cleanBase64, 'base64');
      }

      const mediaUrl = nested.url || nested.mediaUrl || data.url || data.mediaUrl;
      if (mediaUrl) {
        const mediaResponse = await fetch(mediaUrl, {
          headers: { 'Accept': 'audio/*,*/*' }
        });
        if (!mediaResponse.ok) {
          throw new Error(`Download media URL failed: ${mediaResponse.status}`);
        }
        return Buffer.from(await mediaResponse.arrayBuffer());
      }

      throw new Error('Download media response did not include base64 or url');
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  }

  async getInstanceStatus() {
    const url = `${this.baseUrl}/instance/connectionState/${this.instanceName}`;
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    return response.json();
  }
}

module.exports = EvolutionProvider;
