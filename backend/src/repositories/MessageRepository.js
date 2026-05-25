const SupabaseBaseRepository = require('./SupabaseBaseRepository');

class MessageRepository extends SupabaseBaseRepository {
  constructor(database) {
    super(database, 'messages');
  }

  async findByConversation(conversationId, options = {}) {
    let query = this.client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.direction) {
      query = query.eq('direction', options.direction);
    }

    const { data, error } = await query;

    if (error) throw error;
    return {
      rows: data || [],
      rowCount: data?.length || 0
    };
  }

  async findLastByConversation(conversationId) {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
  }

async create(data) {
    const insertData = {
      conversation_id: data.conversationId,
      sender_type: data.senderType || 'contact',
      sender_id: data.senderId || null,
      content: data.content,
      direction: data.direction || 'incoming',
      status: data.status || 'received',
      metadata: data.metadata ? (typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata)) : null
    };

    const { data: result, error } = await this.client
      .from('messages')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return { rows: [result], rowCount: 1 };
  }

async createIncoming(conversationId, content, metadata = {}) {
    const msgMetadata = { ...metadata };
    const source = metadata.original_payload || metadata;

    if (source.media_type) {
      msgMetadata.media_type = source.media_type;
      msgMetadata.media_url = source.media_url;
      msgMetadata.media_mimetype = source.media_mimetype;
      msgMetadata.media_caption = source.media_caption;
      msgMetadata.media_filesize = source.media_filesize;
    }

    return this.create({
      conversationId,
      senderType: 'contact',
      content,
      direction: 'incoming',
      status: 'received',
      metadata: msgMetadata
    });
  }

  async updateMetadata(messageId, updates) {
    const { data: existing } = await this.client
      .from('messages')
      .select('metadata')
      .eq('id', messageId)
      .maybeSingle();

    const mergedMetadata = { ...(existing?.metadata || {}), ...updates };

    const { data, error } = await this.client
      .from('messages')
      .update({ metadata: typeof mergedMetadata === 'object' ? JSON.stringify(mergedMetadata) : mergedMetadata })
      .eq('id', messageId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
  }

  async createOutgoing(conversationId, content, senderId, status = 'sent') {
    return this.create({
      conversationId,
      senderType: 'user',
      senderId,
      content,
      direction: 'outgoing',
      status,
      metadata: {}
    });
  }

  async createSystem(conversationId, content, actionType, metadata = {}) {
    return this.create({
      conversationId,
      senderType: 'ai',
      senderId: null,
      content,
      direction: 'incoming',
      status: 'ai_action',
      metadata: {
        action: actionType,
        ...metadata
      }
    });
  }
}

module.exports = MessageRepository;