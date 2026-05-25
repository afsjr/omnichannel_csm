class AudioTranscriptionService {
  constructor({ messageRepository, evolutionProvider, llmProvider }) {
    this.messageRepository = messageRepository;
    this.evolutionProvider = evolutionProvider;
    this.llmProvider = llmProvider;
  }

  async transcribeMessage(message) {
    const metadata = message.metadata || {};

    if (!metadata.media_url && !metadata.original_payload?.key) {
      console.log('AudioTranscription: no media data for message', message.id);
      return null;
    }

    try {
      let transcription;

      if (metadata.media_url?.startsWith('http')) {
        transcription = await this.transcribeFromUrl(metadata.media_url, metadata.media_mimetype);
      } else if (metadata.original_payload?.key) {
        transcription = await this.transcribeFromEvolution(metadata);
      } else {
        console.log('AudioTranscription: no downloadable source for message', message.id);
        return null;
      }

      if (transcription) {
        await this.messageRepository.updateMetadata(message.id, { audio_transcription: transcription });
        console.log(`AudioTranscription: message ${message.id} transcribed successfully`);
      }

      return transcription;
    } catch (error) {
      console.error(`AudioTranscription: failed for message ${message.id}:`, error.message);
      return null;
    }
  }

  async transcribeFromUrl(url, mimetype) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    return this.llmProvider.transcribeAudio(buffer, mimetype || 'audio/ogg');
  }

  async transcribeFromEvolution(metadata) {
    const key = metadata.original_payload?.key || {};
    const messageKey = {
      id: key.id,
      remoteJid: key.remoteJid,
      fromMe: key.fromMe || false
    };

    if (!messageKey.id || !messageKey.remoteJid) {
      throw new Error('Invalid message key for Evolution download');
    }

    const audioBuffer = await this.evolutionProvider.downloadMedia(messageKey);
    return this.llmProvider.transcribeAudio(audioBuffer, metadata.media_mimetype || 'audio/ogg');
  }
}

module.exports = AudioTranscriptionService;
