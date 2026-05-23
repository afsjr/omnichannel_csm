/**
 * Módulo de conexão com o banco de dados Supabase
 * 
 * Este arquivo inicializa o cliente do Supabase para ser usado em todas as
 * operações de banco de dados no ambiente serverless (Vercel).
 * 
 * @requires @supabase/supabase-js
 * @requires dotenv (automático no ambiente Vercel)
 * 
 * @example
 * const { getSupabase } = require('./lib/db');
 * const supabase = getSupabase();
 * const { data } = await supabase.from('users').select('*');
 */

const { createClient } = require('@supabase/supabase-js');
let ws;
try { ws = require('ws'); } catch (e) { /* ignore */ }

// Variáveis de ambiente - configuradas na Vercel
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

/**
 * Cliente Supabase singleton
 * Inicializado uma única vez e reutilizado em todas as requisições
 */
let supabase = null;

/**
 * Obtém a instância do cliente Supabase
 * Se ainda não foi inicializado, cria uma nova instância
 * 
 * @returns {object|null} Cliente Supabase ou null se não configurado
 * 
 * @example
 * const client = getSupabase();
 * if (client) {
 *   const { data } = await client.from('contacts').select('*');
 * }
 */
function getSupabase() {
  // Retorna instância existente se já inicializada
  if (supabase) return supabase;
  
  // Log para debug em ambiente de desenvolvimento
  console.log('DB: Initializing...');
  console.log('DB: ENV - URL:', SUPABASE_URL ? 'present' : 'missing');
  console.log('DB: ENV - KEY:', SUPABASE_KEY ? 'present' : 'missing');
  
  // Validação das credenciais obrigatórias
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('DB: Missing credentials - configure SUPABASE_URL and SUPABASE_SERVICE_KEY');
    return null;
  }
  
  try {
    // Criação do cliente Supabase
    // O cliente usa as credenciais para todas as requisições
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, ws ? { realtime: { transport: ws } } : {});
    console.log('DB: Client initialized successfully');
    return supabase;
  } catch (err) {
    console.error('DB: Init error:', err.message);
    return null;
  }
}

// Exporta o cliente como propriedade (getter) e função
module.exports = {
  /**
   * Cliente Supabase - uso direto
   * @type {object}
   */
  get supabase() {
    return getSupabase();
  },
  
  /**
   * Função para obter/reinicializar o cliente
   * @type {function}
   */
  getSupabase
};