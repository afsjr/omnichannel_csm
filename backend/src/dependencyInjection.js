const { SupabaseDatabase } = require('./database/Database');

const UserRepository = require('./repositories/UserRepository');
const ContactRepository = require('./repositories/ContactRepository');
const MessageRepository = require('./repositories/MessageRepository');
const ConversationRepository = require('./repositories/ConversationRepository');
const DepartmentRepository = require('./repositories/DepartmentRepository');

const ChatService = require('./services/ChatService');
const { createAIServiceContainer } = require('./services/AIService');
const LLMProvider = require('./providers/LLMProvider');
const EvolutionProvider = require('./providers/EvolutionProvider');

function createContainer(config = {}) {
  const db = new SupabaseDatabase({
    url: process.env.SUPABASE_URL || 'https://rccaiodmgvvudiplbodl.supabase.co',
    key: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
  });

  const repositories = {
    user: new UserRepository(db),
    contact: new ContactRepository(db),
    conversation: new ConversationRepository(db),
    message: new MessageRepository(db),
    department: new DepartmentRepository(db)
  };

  const providers = {
    llm: new LLMProvider(config.llm),
    evolution: new EvolutionProvider(config.evolution)
  };

  const services = {
    chat: new ChatService({
      contactRepository: repositories.contact,
      conversationRepository: repositories.conversation,
      messageRepository: repositories.message,
      departmentRepository: repositories.department,
      evolutionProvider: providers.evolution
    })
  };

  const ai = createAIServiceContainer({
    repositories,
    providers
  });

  return {
    db,
    repositories,
    providers,
    services,
    ai,
    async close() {}
  };
}

module.exports = { createContainer };