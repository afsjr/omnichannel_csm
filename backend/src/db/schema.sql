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
  document TEXT,
  plan TEXT DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar colunas se tabela já existir (para upgrades)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'document') THEN
    ALTER TABLE companies ADD COLUMN document TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'plan') THEN
    ALTER TABLE companies ADD COLUMN plan TEXT DEFAULT 'free';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'settings') THEN
    ALTER TABLE companies ADD COLUMN settings JSONB DEFAULT '{}';
  END IF;
END $$;

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
  is_active BOOLEAN DEFAULT TRUE,
  is_online BOOLEAN DEFAULT FALSE,
  team_leader_id INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar colunas se já existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'agent';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'team_leader_id') THEN
    ALTER TABLE users ADD COLUMN team_leader_id INT REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

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
  instance_name TEXT NOT NULL,
  instance_id TEXT,
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'offline',
  qr_code TEXT,
  qr_code_expires TIMESTAMP,
  api_url TEXT,
  api_key TEXT,
  settings JSONB DEFAULT '{}',
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
  channel TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'open',
  priority INT DEFAULT 0,
  ai_draft TEXT,
  ai_confidence DECIMAL(3,2),
  funnel_stage TEXT DEFAULT 'unclassified',
  last_message_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MENSAGENS
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT DEFAULT 'contact',
  sender_id INT,
  content TEXT NOT NULL,
  direction TEXT DEFAULT 'incoming',
  status TEXT DEFAULT 'received',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SESSÕES (Refresh Tokens)
-- Permite logout real e renovação de JWT
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token);

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
-- SEED: Dados iniciais (apenas se não existirem)
-- ============================================================

-- Empresa padrão
INSERT INTO companies (name) 
VALUES ('Escola Técnica CSM') 
ON CONFLICT DO NOTHING;

-- Departamentos padrão
INSERT INTO departments (company_id, name, description) VALUES
  (1, 'Comercial', 'Atendimento comercial e vendas'),
  (1, 'Financeiro', 'Dúvidas sobre pagamentos e boletos'),
  (1, 'Secretaria', 'Atendimento administrativo'),
  (1, 'Acadêmico', 'Suporte a cursos e certificados')
ON CONFLICT (company_id, name) DO NOTHING;

-- Usuário admin master (senha: admin123 -哈希ada em produção)
-- role: master = acesso total, admin = admin empresa, leader = líder equipe, agent = atendente
INSERT INTO users (company_id, name, email, password, role, is_active)
VALUES (1, 'Admin Master', 'admin@csm.com', '$2b$10$-placeholder-hash', 'master', true)
ON CONFLICT (email) DO NOTHING;

-- Verificar se o usuário admin existe e atualizar role se necessário
UPDATE users SET role = 'master' WHERE email = 'admin@csm.com';