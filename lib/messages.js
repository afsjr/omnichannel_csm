/**
 * Módulo de funções de banco de dados para mensagens e conversas
 * 
 * Fornece todas as operações de CRUD (Create, Read, Update, Delete)
 * para conversas, mensagens e contatos.
 * 
 * Este módulo é usado tanto pelo backend local quanto pelas APIs serverless (Vercel).
 * 
 * @requires ./db - Conexão com Supabase
 * 
 * @example
 * const { saveIncomingMessage, getQueue, getConversation } = require('./lib/messages');
 * 
 * // Salvar mensagem recebida
 * const result = await saveIncomingMessage(payload);
 * 
 * // Listar fila de atendimentos
 * const queue = await getQueue(1);
 */

// Importa o cliente Supabase
const { getSupabase } = require('./db');

/**
 * Normaliza telefone removendo caracteres não numéricos
 * 
 * @param {string} phone - Número de telefone
 * @returns {string} Telefone apenas com números
 * 
 * @example
 * normalizePhone('(11) 99999-9999') // '11999999999'
 */
function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

/**
 * Busca ou cria um contato no banco de dados
 * 
 * Se o telefone já existir para a empresa, retorna o ID existente.
 * Caso contrário, cria um novo contato.
 * 
 * @param {number} companyId - ID da empresa (tenant)
 * @param {string} name - Nome do contato
 * @param {string} phone - Telefone do contato
 * @returns {Promise<number>} ID do contato (existente ou novo)
 * 
 * @example
 * const contactId = await findOrCreateContact(1, 'João Silva', '11999999999');
 * // Retorna ID do contato existente ou cria novo
 */
async function findOrCreateContact(companyId, name, phone) {
  const normalizedPhone = normalizePhone(phone);
  
  // Tenta encontrar contato existente pelo telefone
  const { data: existing } = await getSupabase()
    .from('contacts')
    .select('id')
    .eq('company_id', companyId)
    .eq('phone', normalizedPhone)
    .limit(1)
    .maybeSingle();

  // Se existe, retorna o ID
  if (existing) return existing.id;

  // Se não existe, cria novo contato
  const { data: created } = await getSupabase()
    .from('contacts')
    .insert({
      company_id: companyId,
      name: name || normalizedPhone,  // Usa telefone como nome se não fornecer
      phone: normalizedPhone
    })
    .select('id')
    .single();

  return created.id;
}

/**
 * Busca ou cria uma conversa para um contato
 * 
 * Verifica se existe uma conversa aberta para o contato.
 * Se não existir, cria uma nova.
 * 
 * @param {number} companyId - ID da empresa
 * @param {number} contactId - ID do contato
 * @param {string} channel - Canal da conversa ('whatsapp', 'web', etc)
 * @returns {Promise<number>} ID da conversa
 * 
 * @example
 * const conversationId = await findOrCreateConversation(1, contactId, 'whatsapp');
 */
async function findOrCreateConversation(companyId, contactId, channel) {
  // Busca conversa existente que esteja aberta
  const { data: existing } = await getSupabase()
    .from('conversations')
    .select('id')
    .eq('company_id', companyId)
    .eq('contact_id', contactId)
    .eq('channel', channel)
    .in('status', ['pending', 'in_progress', 'queued'])  // Conversas ativas
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  // Cria nova conversa se não existir
  const { data: created } = await getSupabase()
    .from('conversations')
    .insert({
      company_id: companyId,
      contact_id: contactId,
      channel: channel,
      status: 'pending'  // Status inicial: pendente (sem atendimento)
    })
    .select('id')
    .single();

  return created.id;
}

/**
 * Salva uma mensagem recebida (enviada pelo cliente)
 * 
 * Este é o ponto de entrada principal para mensagens que chegam
 * via webhook da Evolution API ou simulação local.
 * 
 * @param {object} payload - Dados da mensagem recebida
 * @param {number} [payload.company_id=1] - ID da empresa
 * @param {string} [payload.phone] - Telefone do cliente
 * @param {string} [payload.contact_name] - Nome do cliente
 * @param {string} [payload.content] - Texto da mensagem
 * @param {string} [payload.channel='whatsapp'] - Canal de origem
 * @param {string} [payload.media_type] - Tipo de mídia (se houver)
 * @param {string} [payload.media_url] - URL da mídia
 * @returns {Promise<object>} Mensagem salva com dados da conversa
 * 
 * @example
 * const saved = await saveIncomingMessage({
 *   phone: '5511999999999',
 *   contact_name: 'Maria',
 *   content: 'Olá, preciso de informações',
 *   channel: 'whatsapp'
 * });
 */
async function saveIncomingMessage(payload) {
  const companyId = Number(payload.company_id || 1);
  const channel = payload.channel || 'whatsapp';
  const contactName = payload.contact_name || payload.pushName || payload.name || null;
  const phone = payload.phone || payload.number || payload.from || 'unknown';
  const content = payload.content || payload.message || payload.text || '';

  // 1. Busca ou cria o contato
  const contactId = await findOrCreateContact(companyId, contactName, phone);
  
  // 2. Busca ou cria a conversa
  const conversationId = await findOrCreateConversation(companyId, contactId, channel);

  // 3. Prepara metadados da mensagem (incluindo mídia se houver)
  const metadata = {};
  if (payload.media_type) {
    metadata.media_type = payload.media_type;
    metadata.media_url = payload.media_url;
    metadata.media_caption = payload.media_caption;
  }

  // 4. Salva a mensagem no banco
  const { data: created } = await getSupabase()
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'contact',  // Quem enviou foi o cliente
      content: content || '[Mensagem sem conteúdo]',
      direction: 'incoming',  // Mensagem recebida
      status: 'received',
      metadata: Object.keys(metadata).length > 0 ? metadata : null
    })
    .select('*')
    .single();

  // 5. Atualiza o timestamp da última mensagem na conversa
  await getSupabase()
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  // 6. Retorna a mensagem com dados relacionados da conversa
  const { data: conversation } = await getSupabase()
    .from('conversations')
    .select('*, contacts(name, phone), departments(name)')
    .eq('id', conversationId)
    .single();

  return { ...created, conversation };
}

/**
 * Envia uma mensagem de saída (do atendente para o cliente)
 * 
 * @param {object} params - Parâmetros
 * @param {number} params.conversationId - ID da conversa
 * @param {string} params.content - Texto da mensagem
 * @param {number} [params.senderId] - ID do usuário que enviou
 * @returns {Promise<object>} Mensagem criada
 * 
 * @example
 * const msg = await sendMessage({
 *   conversationId: 1,
 *   content: 'Olá! Como posso ajudar?',
 *   senderId: 5
 * });
 */
async function sendMessage({ conversationId, content, senderId }) {
  const { data: created } = await getSupabase()
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'user',  // Quem enviou foi um usuário/atendente
      sender_id: senderId,
      content,
      direction: 'outgoing',  // Mensagem enviada
      status: 'sent'
    })
    .select('*')
    .single();

  // Atualiza última mensagem na conversa
  await getSupabase()
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return created;
}

/**
 * Envia mensagem usando o telefone do contato
 * 
 * Útil para envios diretos sem conversa existente.
 * Cria automaticamente contato e conversa se necessário.
 * 
 * @param {object} params - Parâmetros
 * @param {number} [params.companyId=1] - ID da empresa
 * @param {string} params.phone - Telefone do destinatário
 * @param {string} params.content - Texto da mensagem
 * @param {number} [params.senderId] - ID do remetente
 * @returns {Promise<object>} Mensagem criada
 */
async function sendMessageByPhone({ companyId = 1, phone, content, senderId }) {
  const contactId = await findOrCreateContact(companyId, null, phone);
  const conversationId = await findOrCreateConversation(companyId, contactId, 'whatsapp');
  
  return sendMessage({ conversationId, content, senderId });
}

/**
 * Obtém os dados de uma conversa com suas mensagens
 * 
 * @param {number} conversationId - ID da conversa
 * @returns {Promise<object>} Dados da conversa e mensagens
 * 
 * @example
 * const { conversation, messages } = await getConversation(1);
 */
async function getConversation(conversationId) {
  const { data: conversation } = await getSupabase()
    .from('conversations')
    .select('*, contacts(name, phone), departments(name), users(name)')
    .eq('id', conversationId)
    .single();

  const { data: messages } = await getSupabase()
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return { conversation, messages };
}

/**
 * Obtém a fila de atendimentos (conversas pendentes)
 * 
 * @param {number} companyId - ID da empresa
 * @param {number} [departmentId] - Filtrar por departamento (opcional)
 * @returns {Promise<Array>} Lista de conversas na fila
 * 
 * @example
 * // Todas as conversas pendentes
 * const queue = await getQueue(1);
 * 
 * // Apenas do departamento comercial
 * const commercialQueue = await getQueue(1, 1);
 */
async function getQueue(companyId, departmentId = null) {
  let query = getSupabase()
    .from('conversations')
    .select('*, contacts(name, phone), departments(name), users(name)')
    .eq('company_id', companyId)
    .in('status', ['pending', 'queued'])  // Pendentes e reenfileiradas
    .order('priority', { ascending: false })  // Prioridade primeiro
    .order('last_message_at', { ascending: false });  // Mais recentes primeiro

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data } = await query;
  return data || [];
}

/**
 * Obtém as conversas atribuídas a um atendente
 * 
 * @param {number} companyId - ID da empresa
 * @param {number} userId - ID do atendente
 * @returns {Promise<Array>} Lista de conversas em atendimento
 */
async function getMyConversations(companyId, userId) {
  const { data } = await getSupabase()
    .from('conversations')
    .select('*, contacts(name, phone), departments(name)')
    .eq('company_id', companyId)
    .eq('assigned_to', userId)
    .eq('status', 'in_progress')
    .order('last_message_at', { ascending: false });

  return data || [];
}

/**
 * Atribui uma conversa a um atendente
 * 
 * @param {number} conversationId - ID da conversa
 * @param {number} userId - ID do atendente
 * @returns {Promise<object>} Conversa atualizada
 */
async function assignConversation(conversationId, userId) {
  const { data } = await getSupabase()
    .from('conversations')
    .update({ 
      assigned_to: userId, 
      status: 'in_progress'  // Muda status para "em andamento"
    })
    .eq('id', conversationId)
    .select('*, contacts(name, phone), departments(name)')
    .single();

  return data;
}

/**
 * Encerrra uma conversa
 * 
 * @param {number} conversationId - ID da conversa
 * @returns {Promise<object>} Conversa atualizada
 */
async function resolveConversation(conversationId) {
  const { data } = await getSupabase()
    .from('conversations')
    .update({ status: 'resolved' })
    .eq('id', conversationId)
    .select('*, contacts(name, phone)')
    .single();

  return data;
}

module.exports = {
  // Funções principais
  saveIncomingMessage,
  sendMessage,
  sendMessageByPhone,
  
  // Consultas
  getConversation,
  getQueue,
  getMyConversations,
  
  // Ações
  assignConversation,
  resolveConversation,
  
  // Utilitários
  findOrCreateContact,
  normalizePhone
};