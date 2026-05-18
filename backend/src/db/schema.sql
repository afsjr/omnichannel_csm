-- ============================================================
-- OmniChat CSM - Schema Completo
-- Suporte: Multi-empresas, Multi-instâncias WhatsApp, Equipes, Permissões
-- ============================================================

-- ============================================================
-- EMPRESAS (Multi-tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT,           -- CNPJ/CPF para identificação fiscal
  plan TEXT DEFAULT 'free',  -- free, pro, enterprise
  settings JSONB DEFAULT '{}', -- Configurações personalizadas
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- USUÁRIOS (Atendentes com Roles e Equipes)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'agent', 
  -- Roles: master, admin, leader, agent
  is_active BOOLEAN DEFAULT TRUE,
  is_online BOOLEAN DEFAULT FALSE,
  team_leader_id INT REFERENCES users(id),  -- Para líderes de equipe
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SETORES (Departments)
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- ============================================================
-- CONTATOS (Alunos/Clientes)
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, phone)
);

-- ============================================================
-- CONEXÕES (Instâncias da Evolution API)
-- Permite múltiplas instâncias de WhatsApp por empresa
-- ============================================================
CREATE TABLE IF NOT EXISTS connections (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  instance_name TEXT NOT NULL,       -- Nome da instância na Evolution
  instance_id TEXT,                   -- ID interno da Evolution
  phone_number TEXT NOT NULL,         -- Número do WhatsApp
  status TEXT DEFAULT 'offline',      -- online, offline, connecting
  qr_code TEXT,                       -- QR Code para conexão
  qr_code_expires TIMESTAMP,          -- Expiração do QR Code
  api_url TEXT,                       -- URL da Evolution API (pode variar por instância)
  api_key TEXT,                       -- API Key específica (opcional)
  settings JSONB DEFAULT '{}',         -- Configurações da instância
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, instance_name)
);

-- ============================================================
-- CONVERSAS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  contact_id INT REFERENCES contacts(id) ON DELETE CASCADE,
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
  connection_id INT REFERENCES connections(id) ON DELETE SET NULL,
  channel TEXT DEFAULT 'whatsapp',    -- whatsapp, web, instagram, facebook
  status TEXT DEFAULT 'open',         -- open, pending, queued, in_progress, resolved
  priority INT DEFAULT 0,              -- 0=normal, 1=alta, 2=urgente
  ai_draft TEXT,
  ai_confidence DECIMAL(3,2),
  funnel_stage TEXT DEFAULT 'unclassified',  -- topo, meio, fundo
  last_message_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MENSAGENS
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT DEFAULT 'contact',  -- contact, user, ai, system
  sender_id INT,
  content TEXT NOT NULL,
  direction TEXT DEFAULT 'incoming',    -- incoming, outgoing
  status TEXT DEFAULT 'received',       -- received, sent, delivered, read, failed
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_conversations_company_status ON conversations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_department ON conversations(department_id);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_connection ON conversations(connection_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_contacts_company_phone ON contacts(company_id, phone);
CREATE INDEX IF NOT EXISTS idx_connections_company ON connections(company_id);

-- ============================================================
-- SEED: Dados iniciais
-- ============================================================

-- Empresa padrão
INSERT INTO companies (name, document, plan) 
VALUES ('Escola Técnica CSM', '00.000.000/0001-00', 'free') 
ON CONFLICT DO NOTHING;

-- Departamentos padrão
INSERT INTO departments (company_id, name, description) VALUES
  (1, 'Comercial', 'Atendimento comercial e vendas'),
  (1, 'Financeiro', 'Dúvidas sobre pagamentos e boletos'),
  (1, 'Secretaria', 'Atendimento administrativo'),
  (1, 'Acadêmico', 'Suporte a cursos e certificados')
ON CONFLICT (company_id, name) DO NOTHING;

-- Usuário admin master (senha: admin123 - usar em produção com hash)
-- Esse usuário terá role 'master' e acesso a todas as funcionalidades
INSERT INTO users (company_id, name, email, password, role, is_active)
VALUES (1, 'Admin Master', 'admin@csm.com', '$2b$10$x0x0x0x0x0x0x0x0x0x0x0x0x0x0x0x0x0x0x0x0x0x', 'master', true)
ON CONFLICT (email) DO NOTHING;