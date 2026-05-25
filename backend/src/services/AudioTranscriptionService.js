class AudioTranscriptionService {
  constructor({ messageRepository, evolutionProvider, llmProvider }) {
    this.messageRepository = messageRepository;
    this.evolutionProvider = evolutionProvider;
    this.llmProvider = llmProvider;
  }

  async transcribeMessage(message) {
    const metadata = message.metadata || {};
    console.log('AudioTranscription: starting for message', message.id, 'media_url:', metadata.media_url?.slice(0, 50));

    if (!metadata.media_url && !metadata.original_payload?.key) {
      console.log('AudioTranscription: no media data for message', message.id);
      return null;
    }

    await this.messageRepository.updateMetadata(message.id, { transcribing: true });

    let transcription = null;

    try {
      if (metadata.media_url?.startsWith('http')) {
        console.log('AudioTranscription: trying direct URL fetch');
        transcription = await this.transcribeFromUrl(metadata.media_url, metadata.media_mimetype);
      }

      if (!transcription && metadata.original_payload?.key) {
        console.log('AudioTranscription: falling back to Evolution API download');
        transcription = await this.transcribeFromEvolution(metadata);
      }

      if (!transcription) {
        console.log('AudioTranscription: all methods failed for message', message.id);
        await this.messageRepository.updateMetadata(message.id, { transcribing: false, audio_transcription: null });
        return null;
      }

      await this.messageRepository.updateMetadata(message.id, { transcribing: false, audio_transcription: transcription });
      console.log(`AudioTranscription: message ${message.id} transcribed successfully (${transcription.length} chars)`);
      return transcription;
    } catch (error) {
      console.error(`AudioTranscription: failed for message ${message.id}:`, error.message, error.stack);
      await this.messageRepository.updateMetadata(message.id, { transcribing: false, audio_transcription: null }).catch(() => {});
      return null;
    }
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
      console.log('AudioTranscription: URL fetch OK, content-type:', contentType, 'size:', response.headers.get('content-length'));

      const buffer = Buffer.from(await response.arrayBuffer());
      return this.llmProvider.transcribeAudio(buffer, contentType);
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

      console.log('AudioTranscription: Evolution download with key', JSON.stringify(messageKey));

      if (!messageKey.id || !messageKey.remoteJid) {
        console.log('AudioTranscription: invalid message key');
        return null;
      }

      const audioBuffer = await this.evolutionProvider.downloadMedia(messageKey);
      console.log('AudioTranscription: Evolution download OK, size:', audioBuffer.length);
      return this.llmProvider.transcribeAudio(audioBuffer, metadata.media_mimetype || 'audio/ogg');
    } catch (error) {
      console.log('AudioTranscription: Evolution download error:', error.message);
      return null;
    }
  }
}

module.exports = AudioTranscriptionService;
