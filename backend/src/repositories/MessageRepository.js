const { SupabaseBaseRepository } = require('../database/Database');

class MessageRepository extends SupabaseBaseRepository {
  constructor(database) {
    super(database, 'messages');
  }

  async findByConversation(conversationId, options = {}) {
    let query = this.client
      .from('messages')
      .select('*, users(name)')
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
      rows: data?.map(m => ({ ...m, sender_name: m.users?.name })) || [],
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
      metadata: data.metadata ? JSON.stringify(data.metadata) : null
    };

    const { data: result, error } = await this.client
      .from('messages')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return { rows: [result], rowCount: 1 };
  }

  async getConversationHistory(conversationId, limit = 50) {
    return this.findByConversation(conversationId, { limit });
  }

  async createIncoming(conversationId, content, metadata = {}) {
    return this.create({
      conversationId,
      senderType: 'contact',
      content,
      direction: 'incoming',
      status: 'received',
      metadata
    });
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
}

module.exports = MessageRepository;