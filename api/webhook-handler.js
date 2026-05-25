require('dotenv').config();
const { supabase } = require('../lib/db');
const { saveIncomingMessage, updateMessageMetadata } = require('../lib/messages');

async function ensureMediaBucket() {
  if (!supabase) return false;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find(b => b.name === 'media')) {
      await supabase.storage.createBucket('media', { public: true });
      console.log('Storage: created bucket "media"');
    }
    return true;
  } catch (e) {
    console.error('Storage: bucket check error:', e.message);
    return false;
  }
}

async function uploadMediaToStorage(buffer, mimetype, messageId) {
  const ext = (mimetype || 'application/octet-stream').split('/')[1] || 'bin';
  const path = `messages/${messageId}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from('media')
    .upload(path, buffer, {
      contentType: mimetype || 'application/octet-stream',
      upsert: true
    });

  if (uploadErr) throw uploadErr;

  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(path);

  return publicUrl;
}

function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/@s\.whatsapp\.net/, '').replace(/@g\.us/, '');
}

async function fetchAudioFromUrl(url) {
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 30000);
  const audioResp = await fetch(url, {
    signal: controller.signal,
    headers: { 'Accept': 'audio/*,*/*' }
  });
  clearTimeout(fetchTimeout);

  if (!audioResp.ok) {
    throw new Error(`Audio URL ${audioResp.status}`);
  }

  return Buffer.from(await audioResp.arrayBuffer());
}

async function downloadAudioFromEvolution(messageKey) {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!baseUrl || !apiKey || !instance || !messageKey?.id || !messageKey?.remoteJid) {
    return null;
  }

  const response = await fetch(`${baseUrl}/message/downloadMedia/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey
    },
    body: JSON.stringify({ messageKey })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Evolution download ${response.status}: ${error.slice(0, 200)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return Buffer.from(await response.arrayBuffer());
  }

  const data = await response.json();
  const nested = data.data || data;
  const base64 = nested.base64 || data.base64 || nested.media || data.media;
  if (base64) {
    return Buffer.from(String(base64).replace(/^data:[^;]+;base64,/, ''), 'base64');
  }

  const mediaUrl = nested.url || nested.mediaUrl || data.url || data.mediaUrl;
  if (mediaUrl) {
    return fetchAudioFromUrl(mediaUrl);
  }

  throw new Error('Evolution download did not include audio bytes, base64 or URL');
}

function parseEvolutionPayload(payload) {
  let msgObj = payload;

  if (Array.isArray(payload) && payload.length > 0) {
    payload = payload[0];
    msgObj = payload;
  }

  if (payload.data) {
    if (Array.isArray(payload.data) && payload.data.length > 0) {
      msgObj = payload.data[0];
    } else if (Array.isArray(payload.data.messages) && payload.data.messages.length > 0) {
      msgObj = { ...payload.data.messages[0], pushName: payload.data.pushName };
    } else if (payload.data.message && payload.data.message.key) {
      msgObj = payload.data.message;
      if (payload.data.pushName) msgObj.pushName = payload.data.pushName;
    } else if (payload.data.key) {
      msgObj = payload.data;
    } else {
      msgObj = { ...payload.data, ...payload.data.message };
    }
  }

  if (payload.messages && Array.isArray(payload.messages) && payload.messages.length > 0) {
    msgObj = payload.messages[0];
  }

  const result = {
    content: '',
    media_type: null,
    media_url: null,
    media_mimetype: null,
    media_caption: null,
    media_filesize: null,
    message_key: msgObj.key || null,
    ignore: false,
    phone: null,
    contact_name: null
  };

  if (msgObj.key?.remoteJid) result.phone = normalizePhone(msgObj.key.remoteJid);
  if (msgObj.pushName) result.contact_name = msgObj.pushName;

  if (msgObj.key?.fromMe) {
    result.ignore = true;
    return result;
  }

  const msg = msgObj.message || msgObj;

  if (typeof msg.conversation === 'string') { result.content = msg.conversation; }
  else if (msg.extendedTextMessage?.text) { result.content = msg.extendedTextMessage.text; }
  else if (msg.imageMessage) { const i = msg.imageMessage; result.content = i.caption || '[Imagem]'; result.media_type = 'image'; result.media_url = i.base64 ? `data:${i.mimetype || 'image/jpeg'};base64,${i.base64}` : (i.url || i.mediaKey || i.directPath); result.media_mimetype = i.mimetype || 'image/jpeg'; result.media_caption = i.caption; result.media_filesize = i.fileLength; }
  else if (msg.videoMessage) { const v = msg.videoMessage; result.content = v.caption || '[Vídeo]'; result.media_type = 'video'; result.media_url = v.base64 ? `data:${v.mimetype || 'video/mp4'};base64,${v.base64}` : (v.url || v.mediaKey || v.directPath); result.media_mimetype = v.mimetype || 'video/mp4'; result.media_caption = v.caption; result.media_filesize = v.fileLength; }
  else if (msg.audioMessage) { const a = msg.audioMessage; result.content = '[Áudio]'; result.media_type = 'audio'; result.media_url = a.base64 ? `data:${a.mimetype || 'audio/ogg'};base64,${a.base64}` : (a.url || a.mediaKey || a.directPath); result.media_mimetype = a.mimetype || 'audio/ogg'; result.media_filesize = a.fileLength; }
  else if (msg.documentMessage) { const d = msg.documentMessage; result.content = d.fileName || '[Documento]'; result.media_type = 'document'; result.media_url = d.base64 ? `data:${d.mimetype || 'application/octet-stream'};base64,${d.base64}` : (d.url || d.mediaKey || d.directPath); result.media_mimetype = d.mimetype; result.media_caption = d.caption || d.title; result.media_filesize = d.fileLength; }
  else if (msg.stickerMessage) { result.content = '[Sticker]'; result.media_type = 'image'; result.media_url = msg.stickerMessage.url || msg.stickerMessage.mediaKey; result.media_mimetype = 'image/webp'; }
  else if (msg.ephemeralMessage?.message) {
    return parseEvolutionPayload({ ...payload, message: msg.ephemeralMessage.message });
  } else if (msg) {
    console.log('parseEvolutionPayload unknown message keys:', Object.keys(msg));
  }

  if (!result.phone && msgObj.from) result.phone = normalizePhone(msgObj.from);

  return result;
}

async function transcribeAudio(savedId, parsed) {
  try {
    console.log('Webhook transcription: starting for msg', savedId);
    await updateMessageMetadata(savedId, { transcribing: true });

    let audioBuffer = null;

    if (parsed.media_url?.startsWith('http')) {
      console.log('Webhook transcription: fetching URL');
      audioBuffer = await fetchAudioFromUrl(parsed.media_url);
    } else if (parsed.media_url?.startsWith('data:')) {
      console.log('Webhook transcription: decoding base64');
      const commaIdx = parsed.media_url.indexOf(',');
      audioBuffer = Buffer.from(parsed.media_url.substring(commaIdx + 1), 'base64');
    }

    if (!audioBuffer && parsed.message_key) {
      console.log('Webhook transcription: downloading from Evolution');
      audioBuffer = await downloadAudioFromEvolution({
        id: parsed.message_key.id,
        remoteJid: parsed.message_key.remoteJid,
        fromMe: parsed.message_key.fromMe || false
      });
    }

    if (!audioBuffer) {
      console.log('Webhook transcription: no audio data for msg', savedId);
      await updateMessageMetadata(savedId, { transcribing: false, audio_transcription: null });
      return null;
    }

    console.log('Webhook transcription: audio size', audioBuffer.length);
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: parsed.media_mimetype || 'audio/ogg' });
    formData.append('file', blob, 'audio.ogg');
    formData.append('model', 'whisper-large-v3');
    formData.append('temperature', '0');
    formData.append('language', 'pt');

    const groqController = new AbortController();
    const groqTimeout = setTimeout(() => groqController.abort(), 120000);
    const groqResp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.LLM_API_KEY}` },
      body: formData,
      signal: groqController.signal
    });
    clearTimeout(groqTimeout);

    if (!groqResp.ok) {
      const errText = await groqResp.text();
      throw new Error(`Groq ${groqResp.status}: ${errText.slice(0, 200)}`);
    }

    const { text } = await groqResp.json();
    await updateMessageMetadata(savedId, { transcribing: false, audio_transcription: text });
    console.log('Webhook transcription: success for msg', savedId, text.length, 'chars');
    return text;
  } catch (error) {
    console.error('Webhook transcription error for msg', savedId, ':', error.message);
    await updateMessageMetadata(savedId, { transcribing: false, audio_transcription: null }).catch(() => {});
    return null;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  try {
    let payload = req.body || {};

    if (Array.isArray(payload) && payload.length > 0) {
      payload = payload[0];
    }

    console.log('WEBHOOK RECEIVED event:', payload.event);

    if (payload.event === 'messages.upsert' || payload.event === 'MESSAGES_UPSERT') {
      const parsed = parseEvolutionPayload(payload);

      if (parsed.ignore) {
        return res.status(200).json({ ok: true, ignored: true, reason: 'fromMe' });
      }

      if (!parsed.content && !parsed.media_type && !parsed.phone) {
        console.log('Webhook: no useful data', JSON.stringify(parsed));
        return res.status(200).json({ ok: true, ignored: true });
      }

      // Upload base64 media to Supabase Storage so frontend has a playable HTTP URL
      if (parsed.media_url?.startsWith('data:')) {
        try {
          const commaIdx = parsed.media_url.indexOf(',');
          const buf = Buffer.from(parsed.media_url.substring(commaIdx + 1), 'base64');
          if (buf.length > 0) {
            const ready = await ensureMediaBucket();
            if (ready) {
              const publicUrl = await uploadMediaToStorage(buf, parsed.media_mimetype, `${parsed.media_type}-${Date.now()}`);
              console.log('WEBHOOK %s uploaded to Storage: %s', parsed.media_type, publicUrl.slice(0, 80));
              parsed.media_url = publicUrl;
            }
          }
        } catch (storeErr) {
          console.error('WEBHOOK media upload failed for %s: %s', parsed.media_type, storeErr.message);
        }
      }

      const enrichedPayload = {
        ...payload,
        content: parsed.content,
        phone: parsed.phone,
        contact_name: parsed.contact_name,
        media_type: parsed.media_type,
        media_url: parsed.media_url,
        media_mimetype: parsed.media_mimetype,
        media_caption: parsed.media_caption,
        media_filesize: parsed.media_filesize,
        message_key: parsed.message_key,
        channel: 'whatsapp'
      };

      const saved = await saveIncomingMessage(enrichedPayload);
      console.log('WEBHOOK saved: convId=%s msgId=%s', saved?.conversation?.id, saved?.id);

      // Mark transcribing early so frontend shows status
      if (parsed.media_type === 'audio' && saved?.id) {
        await updateMessageMetadata(saved.id, { transcribing: true }).catch(() => {});
      }

      // Fire-and-forget transcription: response returns immediately so Evolution gets HTTP 200
      if (parsed.media_type === 'audio' && saved?.id) {
        transcribeAudio(saved.id, parsed).catch(e =>
          console.error('WEBHOOK transcription background error:', e)
        );
      }

      // Trigger AI processing in background (fire-and-forget)
      if (saved?.conversation?.id) {
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host || 'localhost:3000';
        fetch(`${proto}://${host}/api/ai/draft`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-trigger': 'true'
          },
          body: JSON.stringify({ conversationId: saved.conversation.id })
        }).catch(e => console.error('AI draft trigger error:', e));
      }

      return res.status(200).json({
        ok: true,
        conversationId: saved?.conversation?.id,
        messageId: saved?.id
      });
    }

    return res.status(200).json({ ok: true, ignored: true, event: payload.event });
  } catch (error) {
    console.error('Webhook error:', error.message, error.stack);
    return res.status(500).json({ ok: false, error: 'Erro ao processar mensagem' });
  }
};
