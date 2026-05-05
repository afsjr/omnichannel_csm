CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  name TEXT,
  email TEXT,
  password TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  company_id INT,
  name TEXT,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  company_id INT,
  contact_id INT,
  channel TEXT,
  status TEXT DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT,
  sender TEXT,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
