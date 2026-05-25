class AudioTranscriptionService {
  constructor({ messageRepository, evolutionProvider, llmProvider }) {
    this.messageRepository = messageRepository;
    this.evolutionProvider = evolutionProvider;
    this.llmProvider = llmProvider;
  }

  async transcribeMessage(message) {
    const metadata = message.metadata || {};
    console.log('AudioTranscription: starting for message', message.id);

    if (!metadata.media_url && !metadata.original_payload?.key) {
      console.log('AudioTranscription: no media data for message', message.id);
      await this.finish(message.id, null);
      return null;
    }

    await this.messageRepository.updateMetadata(message.id, { transcribing: true }).catch(() => {});

    const result = await Promise.race([
      this.doTranscribe(message.id, metadata),
      this.timeout(120000, message.id)
    ]);

    await this.finish(message.id, result);
    return result;
  }

  async doTranscribe(messageId, metadata) {
    try {
      if (metadata.media_url?.startsWith('http')) {
        console.log('AudioTranscription: trying direct URL fetch');
        const transcription = await this.transcribeFromUrl(metadata.media_url, metadata.media_mimetype);
        if (transcription) return transcription;
      }

      if (metadata.original_payload?.key) {
        console.log('AudioTranscription: trying Evolution API download');
        const transcription = await this.transcribeFromEvolution(metadata);
        if (transcription) return transcription;
      }

      console.log('AudioTranscription: all methods failed for message', messageId);
      return null;
    } catch (error) {
      console.error('AudioTranscription: error for message', messageId, error.message);
      return null;
    }
  }

  async finish(messageId, transcription) {
    const updates = transcription
      ? { transcribing: false, audio_transcription: transcription }
      : { transcribing: false, audio_transcription: null };

    await this.messageRepository.updateMetadata(messageId, updates).catch((err) => {
      console.error('AudioTranscription: failed to save result for message', messageId, err.message);
    });
  }

  timeout(ms, messageId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('AudioTranscription: timeout for message', messageId);
        resolve(null);
      }, ms);
    });
  }

  async transcribeFromUrl(url, mimetype) {
    try {
      console.log('AudioTranscription: fetching URL', url.slice(0, 80));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'audio/*,*/*' }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        console.log('AudioTranscription: URL fetch failed with status', response.status);
        return null;
      }

      const contentType = response.headers.get('content-type') || mimetype || 'audio/ogg';
      const buffer = Buffer.from(await response.arrayBuffer());
      console.log('AudioTranscription: URL fetched OK, size:', buffer.length);

      return this.transcribeBuffer(buffer, contentType);
    } catch (error) {
      console.log('AudioTranscription: URL fetch error:', error.message);
      return null;
    }
  }

  async transcribeFromEvolution(metadata) {
    try {
      const key = metadata.original_payload?.key || {};
      const messageKey = {
        id: key.id,
        remoteJid: key.remoteJid,
        fromMe: key.fromMe || false
      };

      if (!messageKey.id || !messageKey.remoteJid) {
        console.log('AudioTranscription: invalid message key');
        return null;
      }

      console.log('AudioTranscription: Evolution downloading');
      const audioBuffer = await this.evolutionProvider.downloadMedia(messageKey);
      console.log('AudioTranscription: Evolution download OK, size:', audioBuffer.length);

      return this.transcribeBuffer(audioBuffer, metadata.media_mimetype || 'audio/ogg');
    } catch (error) {
      console.log('AudioTranscription: Evolution download error:', error.message);
      return null;
    }
  }

  async transcribeBuffer(buffer, mimetype) {
    const baseMime = mimetype?.split(';')[0]?.trim() || 'audio/ogg';
    const url = `${this.llmProvider.baseUrl}/audio/transcriptions`;
    const formData = new FormData();
    const blob = new Blob([buffer], { type: baseMime });
    formData.append('file', blob, 'audio.ogg');
    formData.append('model', 'whisper-large-v3');
    formData.append('temperature', '0');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.llmProvider.apiKey}` },
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      console.log('AudioTranscription: Groq API error:', response.status, error.slice(0, 200));
      return null;
    }

    const data = await response.json();
    console.log('AudioTranscription: Groq OK, text length:', data.text?.length);
    return data.text;
  }
}

module.exports = AudioTranscriptionService;
