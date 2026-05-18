const { supabase } = require('./db');

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

async function findOrCreateContact(companyId, name, phone) {
  const normalizedPhone = normalizePhone(phone);
  
  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('company_id', companyId)
    .eq('phone', normalizedPhone)
    .limit(1)
    .single();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from('contacts')
    .insert({
      company_id: companyId,
      name: name || normalizedPhone,
      phone: normalizedPhone
    })
    .select('id')
    .single();

  return created.id;
}

async function findOrCreateConversation(companyId, contactId, channel) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('company_id', companyId)
    .eq('contact_id', contactId)
    .eq('channel', channel)
    .eq('status', 'open')
    .limit(1)
    .single();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from('conversations')
    .insert({
      company_id: companyId,
      contact_id: contactId,
      channel: channel,
      status: 'pending'
    })
    .select('id')
    .single();

  return created.id;
}

async function saveIncomingMessage(payload) {
  const companyId = Number(payload.company_id || 1);
  const channel = payload.channel || 'whatsapp';
  const contactName = payload.contact_name || payload.pushName || payload.name || null;
  const phone = payload.phone || payload.number || payload.from || 'unknown';
  const content = payload.content || payload.message || payload.text || '';

  const contactId = await findOrCreateContact(companyId, contactName, phone);
  const conversationId = await findOrCreateConversation(companyId, contactId, channel);

  const metadata = {};
  if (payload.media_type) {
    metadata.media_type = payload.media_type;
    metadata.media_url = payload.media_url;
    metadata.media_caption = payload.media_caption;
  }

  const { data: created } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'contact',
      content: content || '[Mensagem sem conteúdo]',
      direction: 'incoming',
      status: 'received',
      metadata: Object.keys(metadata).length > 0 ? metadata : null
    })
    .select('*')
    .single();

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  const { data: conversation } = await supabase
    .from('conversations')
    .select('*, contacts(name, phone), departments(name)')
    .eq('id', conversationId)
    .single();

  return { ...created, conversation };
}

async function sendMessage({ conversationId, content, senderId }) {
  const { data: created } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'user',
      sender_id: senderId,
      content,
      direction: 'outgoing',
      status: 'sent'
    })
    .select('*')
    .single();

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return created;
}

async function sendMessageByPhone({ companyId = 1, phone, content, senderId }) {
  const contactId = await findOrCreateContact(companyId, null, phone);
  const conversationId = await findOrCreateConversation(companyId, contactId, 'whatsapp');
  
  return sendMessage({ conversationId, content, senderId });
}

async function getConversation(conversationId) {
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*, contacts(name, phone), departments(name), users(name)')
    .eq('id', conversationId)
    .single();

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return { conversation, messages };
}

async function getQueue(companyId, departmentId = null) {
  let query = supabase
    .from('conversations')
    .select('*, contacts(name, phone), departments(name), users(name)')
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('last_message_at', { ascending: false });

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data } = await query;
  return data || [];
}

async function getMyConversations(companyId, userId) {
  const { data } = await supabase
    .from('conversations')
    .select('*, contacts(name, phone), departments(name)')
    .eq('company_id', companyId)
    .eq('assigned_to', userId)
    .eq('status', 'in_progress')
    .order('last_message_at', { ascending: false });

  return data || [];
}

async function assignConversation(conversationId, userId) {
  const { data } = await supabase
    .from('conversations')
    .update({ assigned_to: userId, status: 'in_progress' })
    .eq('id', conversationId)
    .select('*, contacts(name, phone), departments(name)')
    .single();

  return data;
}

async function resolveConversation(conversationId) {
  const { data } = await supabase
    .from('conversations')
    .update({ status: 'resolved' })
    .eq('id', conversationId)
    .select('*, contacts(name, phone)')
    .single();

  return data;
}

module.exports = {
  saveIncomingMessage,
  sendMessage,
  getConversation,
  getQueue,
  getMyConversations,
  assignConversation,
  resolveConversation,
  findOrCreateContact
};