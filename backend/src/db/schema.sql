-- ============================================================
-- OmniChat CSM - Schema OOP Compliant
-- Suporte: Multi-setores, Conexões WhatsApp, Rascunhos IA
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SETORES (Departments)
-- Ex: Comercial, Financeiro, Secretaria, Academico
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
-- USUÁRIOS (Atendentes)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'agent', -- 'admin', 'supervisor', 'agent'
  is_online BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
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
-- Cada número de WhatsApp é uma conexão
-- ============================================================
CREATE TABLE IF NOT EXISTS connections (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  instance_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'offline', -- 'online', 'offline', 'connecting'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, instance_name)
);

-- ============================================================
-- CONVERSAS
-- Status: open, pending, resolved, queued
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  contact_id INT REFERENCES contacts(id) ON DELETE CASCADE,
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
  connection_id INT REFERENCES connections(id) ON DELETE SET NULL,
  channel TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'open', -- open, pending (triagem), queued, in_progress, resolved
  priority INT DEFAULT 0, -- 0=normal, 1=alta, 2=urgente
  ai_draft TEXT, -- Rascunho gerado pela IA
  ai_confidence DECIMAL(3,2), -- Confiança da triagem (0.00 - 1.00)
  last_message_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MENSAGENS
-- direction: incoming (cliente), outgoing (atendente)
-- status: sent, delivered, read, draft, failed
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT DEFAULT 'contact', -- 'contact', 'user', 'ai', 'system'
  sender_id INT,
  content TEXT NOT NULL,
  direction TEXT DEFAULT 'incoming', -- 'incoming', 'outgoing'
  status TEXT DEFAULT 'received', -- 'received', 'sent', 'delivered', 'read', 'draft', 'failed'
  metadata JSONB, -- Armazena dados extras (midia, localização, etc)
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_conversations_company_status ON conversations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_department ON conversations(department_id);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_company_phone ON contacts(company_id, phone);

-- ============================================================
-- SEED: Dados iniciais (ajuste para produção)
-- ============================================================
INSERT INTO companies (name) VALUES ('Escola Técnica CSM') ON CONFLICT DO NOTHING;

INSERT INTO departments (company_id, name, description) VALUES
  (1, 'Comercial', 'Atendimento comercial e vendas'),
  (1, 'Financeiro', 'Dúvidas sobre pagamentos e boletos'),
  (1, 'Secretaria', 'Atendimento administrativo'),
  (1, 'Acadêmico', 'Suporte a cursos e certificados')
ON CONFLICT (company_id, name) DO NOTHING;