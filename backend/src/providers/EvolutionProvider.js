class EvolutionProvider {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.EVOLUTION_API_URL;
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

  async sendMedia(phone, mediaUrl, caption = '', options = {}) {
    const url = `${this.baseUrl}/message/sendMedia/${this.instanceName}`;
    const body = {
      number: this.formatPhone(phone),
      mediaUrl,
      caption,
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

  async getInstanceStatus() {
    const url = `${this.baseUrl}/instance/connectionState/${this.instanceName}`;
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    return response.json();
  }
}

module.exports = EvolutionProvider;