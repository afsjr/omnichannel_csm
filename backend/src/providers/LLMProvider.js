class LLMProvider {
  constructor(config = {}) {
    this.provider = config.provider || process.env.LLM_PROVIDER || 'groq';
    this.apiKey = config.apiKey || process.env.LLM_API_KEY;
    this.model = config.model || process.env.LLM_MODEL || 'llama-3.3-70b-versatile';
    this.baseUrl = this.getBaseUrl();
  }

  getBaseUrl() {
    switch (this.provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'groq':
      default:
        return 'https://api.groq.com/openai/v1';
    }
  }

  async chat(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('LLM_API_KEY not configured');
    }

    const url = `${this.baseUrl}/chat/completions`;
    const body = {
      model: options.model || this.model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens || 500
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM request failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
      model: data.model
    };
  }

  async classify(conversationHistory, categories, systemPrompt) {
    const categoriesList = categories.map(c => `- ${c}`).join('\n');
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: conversationHistory + '\n\nCategorias disponíveis:\n' + categoriesList }
    ];

    return this.chat(messages, { temperature: 0.1 });
  }

  async transcribeAudio(audioBuffer, mimetype = 'audio/ogg') {
    if (!this.apiKey) {
      throw new Error('LLM_API_KEY not configured');
    }

    const url = `${this.baseUrl}/audio/transcriptions`;
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimetype });
    formData.append('file', blob, 'audio.ogg');
    formData.append('model', 'whisper-large-v3');
    formData.append('temperature', '0');
    formData.append('language', 'pt');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Transcription failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.text;
  }

  async generateDraft(conversationHistory, departmentContext, systemPrompt) {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Contexto do Departamento:\n${departmentContext}\n\nHistórico da Conversa:\n${conversationHistory}\n\nGere uma sugestão de resposta profissional:` }
    ];

    return this.chat(messages, { temperature: 0.5, maxTokens: 1000 });
  }
}

module.exports = LLMProvider;