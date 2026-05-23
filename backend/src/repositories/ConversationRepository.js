const { SupabaseBaseRepository } = require('../database/Database');

class ConversationRepository extends SupabaseBaseRepository {
  constructor(database) {
    super(database, 'conversations');
    this.db = database;
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('conversations')
      .select('*, contacts(*)')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return {
      rows: data ? [data] : [],
      rowCount: data ? 1 : 0
    };
  }

  async findByContactAndStatus(companyId, contactId, channel = 'whatsapp', status = 'open') {
    const { data, error } = await this.client
      .from('conversations')
      .select('*')
      .eq('company_id', companyId)
      .eq('contact_id', contactId)
      .eq('channel', channel)
      .eq('status', status)
      .limit(1);

    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  async findByCompany(companyId, filters = {}) {
    let query = this.client
      .from('conversations')
      .select('*, contacts(name, phone), departments(name), users(name)')
      .eq('company_id', companyId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.departmentId) {
      query = query.eq('department_id', filters.departmentId);
    }
    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }
    if (filters.unassigned) {
      query = query.is('assigned_to', null);
    }

    query = query.order('priority', { ascending: false }).order('last_message_at', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return {
      rows: data || [],
      rowCount: data?.length || 0
    };
  }

  async create(data) {
    const insertData = {
      company_id: data.companyId,
      contact_id: data.contactId,
      department_id: data.departmentId || null,
      assigned_to: data.assignedTo || null,
      connection_id: data.connectionId || null,
      channel: data.channel || 'whatsapp',
      status: data.status || 'open',
      priority: data.priority || 0
    };

    const { data: result, error } = await this.client
      .from('conversations')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return { rows: [result], rowCount: 1 };
  }

  async update(id, data) {
    const updateData = {};

    if (data.departmentId !== undefined) updateData.department_id = data.departmentId;
    if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo;
    if (data.connectionId !== undefined) updateData.connection_id = data.connectionId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.aiDraft !== undefined) updateData.ai_draft = data.aiDraft;
    if (data.aiConfidence !== undefined) updateData.ai_confidence = data.aiConfidence;
    if (data.funnelStage !== undefined) updateData.funnel_stage = data.funnelStage;

    if (data.updateLastMessage !== false) {
      updateData.last_message_at = new Date().toISOString();
    }

    const { data: result, error } = await this.client
      .from('conversations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { rows: [result], rowCount: 1 };
  }

  async updateDraft(conversationId, draft, confidence) {
    return this.update(conversationId, {
      aiDraft: draft,
      aiConfidence: confidence
    });
  }

  async assignTo(conversationId, userId) {
    return this.update(conversationId, {
      assignedTo: userId,
      status: 'in_progress'
    });
  }

  async resolve(conversationId) {
    return this.update(conversationId, { status: 'resolved' });
  }

  async requeue(conversationId) {
    return this.update(conversationId, {
      assignedTo: null,
      status: 'queued'
    });
  }

  async reopen(conversationId) {
    return this.update(conversationId, {
      assignedTo: null,
      status: 'pending'
    });
  }

  async findResolved(companyId, options = {}) {
    let query = this.client
      .from('conversations')
      .select('*, contacts(name, phone), departments(name), users(name)')
      .eq('company_id', companyId)
      .eq('status', 'resolved')
      .order('last_message_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  formatConversationData(conv) {
    return {
      ...conv,
      department_name: conv.departments?.name,
      assigned_to_name: conv.users?.name,
      contact_name: conv.contacts?.name,
      contact_phone: conv.contacts?.phone
    };
  }
}

module.exports = ConversationRepository;