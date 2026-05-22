/**
 * Script para criar usuário MASTER inicial
 * Uso: node api/auth/create-master.js
 * 
 * Este script:
 * 1. Cria usuário no Supabase Auth
 * 2. Cria registro na tabela users com role 'master'
 * 
 * Execute apenas uma vez para criar o admin master
 */

require('dotenv').config({ path: './.env' })

const { createClient } = require('@supabase/supabase-js')
const WebSocket = require('ws')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Configure SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_KEY no .env')
  console.error('   A SERVICE_KEY deve começar com "eyJ..." (service role key)')
  process.exit(1)
}

if (!supabaseServiceKey.startsWith('eyJ')) {
  console.error('❌ A SUPABASE_SERVICE_KEY parece ser incorreta.')
  console.error('   Você precisa da SERVICE ROLE KEY (começa com "eyJ...")')
  console.error('   Pegue em: Settings → API → Service Role Key')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket }
})

const MASTER_EMAIL = 'master@omnichat.com'
const MASTER_PASSWORD = 'Master@2026!'
const MASTER_NAME = 'Administrador Master'

async function createMasterUser() {
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash(MASTER_PASSWORD, 10);
  console.log('🔧 Criando usuário MASTER...\n')

  try {
    console.log('1. Verificando se usuário já existe no Supabase Auth...')
    const { data: existingAuth, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      console.log('   ⚠️ Erro ao listar, tentando criar diretamente...')
    }

    const authUser = existingAuth?.users?.find(u => u.email === MASTER_EMAIL)

    let authId
    if (authUser) {
      console.log('   ✓ Usuário já existe no Auth:', authUser.id)
      authId = authUser.id
    } else {
      console.log('   → Criando no Supabase Auth...')
      const { data: newAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: MASTER_EMAIL,
        password: MASTER_PASSWORD,
        email_confirm: true,
        user_metadata: { name: MASTER_NAME }
      })

      if (authError) {
        console.error('   ❌ Erro ao criar no Auth:', authError.message)
        process.exit(1)
      }

      authId = newAuth.user.id
      console.log('   ✓ Criado no Supabase Auth:', authId)
    }

    console.log('\n2. Verificando/Criando registro na tabela users...')
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('email', MASTER_EMAIL)
      .single()

    if (existingUser) {
      if (existingUser.role !== 'master') {
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ role: 'master', company_id: 1, is_active: true })
          .eq('email', MASTER_EMAIL)

        if (updateError) {
          console.error('   ❌ Erro ao atualizar role:', updateError.message)
        } else {
          console.log('   ✓ Role atualizada para master')
        }
      } else {
        console.log('   ✓ Usuário master já existe')
      }
    } else {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', MASTER_EMAIL)
        .maybeSingle()

      if (existingUser) {
        console.log('   ✓ Usuário já existe na tabela users (id=' + existingUser.id + ')')
      } else {
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            company_id: 1,
            name: MASTER_NAME,
            email: MASTER_EMAIL,
            password: hashedPassword,
            role: 'master',
            is_active: true,
            department_id: null
          })

        if (insertError) {
          console.error('   ❌ Erro ao inserir na tabela users:', insertError.message)
        } else {
          console.log('   ✓ Criado na tabela users com role master')
        }
      }
    }

    console.log('\n✅ Usuário MASTER criado com sucesso!')
    console.log('\n📧 Credenciais:')
    console.log(`   Email: ${MASTER_EMAIL}`)
    console.log(`   Senha: ${MASTER_PASSWORD}`)
    console.log('\n⚠️  Altere a senha após o primeiro login!')

  } catch (error) {
    console.error('\n❌ Erro:', error.message)
    process.exit(1)
  }
}

createMasterUser()