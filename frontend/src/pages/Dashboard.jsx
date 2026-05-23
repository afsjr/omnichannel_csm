import { useEffect, useState } from 'react'
import { useAuthStore, ROLES } from '../contexts/AuthContext'
import { useChatStore } from '../contexts/ChatContext'
import ChatWindow from '../components/ChatWindow'
import ContactsModal from '../components/ContactsModal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const API_PREFIX = '/api'

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const { 
    queue, 
    myConversations,
    resolvedConversations,
    activeConversation,
    fetchQueue, 
    fetchMyConversations,
    fetchResolvedConversations,
    setActiveConversation,
    assignConversation,
    reopenConversation
  } = useChatStore()
  const [filterDept, setFilterDept] = useState(null)
  const [showStats, setShowStats] = useState(false)
  const [stats, setStats] = useState(null)
  const [showResolved, setShowResolved] = useState(false)
  const [showContacts, setShowContacts] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)

  const { hasPermission, isAdmin, isMaster } = useAuthStore()

  useEffect(() => {
    fetchQueue(1, filterDept)
    fetchMyConversations(1, user?.id)
    if (showResolved) {
      fetchResolvedConversations(1)
    }
    
    const interval = setInterval(() => {
      fetchQueue(1, filterDept)
      fetchMyConversations(1, user?.id)
    }, 10000)
    
    return () => clearInterval(interval)
  }, [filterDept, user?.id, showResolved])

  useEffect(() => {
    if (showStats) {
      fetchStats()
    }
  }, [showStats])

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}${API_PREFIX}/dashboard/full?companyId=1`)
      const data = await res.json()
      if (data.ok) {
        setStats(data.data)
      } else {
        console.error('Stats API error:', data.error)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const handlePull = async (conv) => {
    await assignConversation(conv.id, user.id)
  }

  const handleReopen = async (conv) => {
    await reopenConversation(conv.id)
    if (activeConversation?.id === conv.id) {
      setActiveConversation(null)
    }
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const result = await useAuthStore.getState().getUsers()
      if (result.ok) {
        setUsers(result.data.users)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
    setUsersLoading(false)
  }

  const getRoleLabel = (role) => {
    const labels = { master: '👑 Master', admin: '⚡ Admin', leader: '👥 Líder', agent: '🎯 Atendente' }
    return labels[role] || role
  }

  const formatTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const getFunnelBadge = (stage) => {
    if (!stage || stage === 'unclassified') return null
    const labels = {
      topo: { text: 'Topo', class: 'funnel-topo' },
      meio: { text: 'Meio', class: 'funnel-meio' },
      fundo: { text: 'Fundo', class: 'funnel-fundo' }
    }
    const badge = labels[stage]
    if (!badge) return null
    return <span className={`funnel-badge ${badge.class}`}>{badge.text}</span>
  }

  const ConversationItem = ({ conv, showPull = false }) => (
    <div 
      className={`conv-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
      onClick={() => showPull ? handlePull(conv) : setActiveConversation(conv)}
    >
      <div className="conv-header">
        <span className="contact-name">{conv.contacts?.name || conv.contacts?.phone || 'Desconhecido'}</span>
        <span className="conv-time">{formatTime(conv.last_message_at)}</span>
      </div>
      <div className="conv-meta">
        <span className="dept-badge">{conv.department_name || 'Sem setor'}</span>
        {conv.funnel_stage && conv.funnel_stage !== 'unclassified' && getFunnelBadge(conv.funnel_stage)}
        {conv.ai_draft && <span className="ai-badge">✨ IA</span>}
      </div>
    </div>
  )

  const StatCard = ({ title, value, subtitle, color }) => (
    <div className="stat-card">
      <h4>{title}</h4>
      <div className="value" style={{ color }}>{value}</div>
      {subtitle && <div className="label">{subtitle}</div>}
    </div>
  )

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>OmniChat CSM</h1>
        <div className="header-right">
          {isAdmin() && (
            <button onClick={() => { setShowUserManagement(true); fetchUsers(); }} className="btn-logout">
              👥 Equipe
            </button>
          )}
          <button onClick={() => setShowStats(!showStats)} className="btn-logout">
            {showStats ? 'Voltar ao Chat' : '📊 Estatísticas'}
          </button>
          <button onClick={() => setShowContacts(true)} className="btn-logout">
            📇 Contatos
          </button>
          <span className="user-name">{user?.name || user?.email}</span>
          <button onClick={handleLogout} className="btn-logout">Sair</button>
        </div>
      </header>

      {showStats && stats ? (
        <div className="dashboard-stats-container">
          <div className="dashboard-stats">
            <div className="stat-card period-card">
              <h4>📅 Hoje</h4>
              <div className="period-stats">
                <div><span className="label">Ativos:</span> <strong>{stats.period.today.active}</strong></div>
                <div><span className="label">Resolvidos:</span> <strong style={{color: 'var(--success)'}}>{stats.period.today.resolved}</strong></div>
              </div>
            </div>
            <div className="stat-card period-card">
              <h4>📆 Esta Semana</h4>
              <div className="period-stats">
                <div><span className="label">Ativos:</span> <strong>{stats.period.week.active}</strong></div>
                <div><span className="label">Resolvidos:</span> <strong style={{color: 'var(--success)'}}>{stats.period.week.resolved}</strong></div>
              </div>
            </div>
            <div className="stat-card period-card">
              <h4>📆 Este Mês</h4>
              <div className="period-stats">
                <div><span className="label">Ativos:</span> <strong>{stats.period.month.active}</strong></div>
                <div><span className="label">Resolvidos:</span> <strong style={{color: 'var(--success)'}}>{stats.period.month.resolved}</strong></div>
              </div>
            </div>
          </div>

          <div className="stats-by-section">
            <div className="stats-section">
              <h4>📊 Por Setor</h4>
              <table>
                <thead>
                  <tr>
                    <th>Setor</th>
                    <th>Ativos</th>
                    <th>Hoje</th>
                    <th>Semana</th>
                    <th>Mês</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byDepartment.map(dept => (
                    <tr key={dept.id}>
                      <td><strong>{dept.name}</strong></td>
                      <td>{dept.active}</td>
                      <td style={{color: 'var(--success)'}}>{dept.resolved_today}</td>
                      <td>{dept.resolved_week}</td>
                      <td>{dept.resolved_month}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="stats-section">
              <h4>👥 Por Atendente</h4>
              <table>
                <thead>
                  <tr>
                    <th>Atendente</th>
                    <th>Em atendimento</th>
                    <th>Resolvidos Hoje</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byAgent.map(agent => (
                    <tr key={agent.id}>
                      <td><strong>{agent.name}</strong></td>
                      <td>{agent.in_progress}</td>
                      <td style={{color: 'var(--success)'}}>{agent.resolved_today}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {stats.funnel && stats.funnel.length > 0 && (
            <div className="stats-section funnel-section">
              <h4>🎯 Funil Comercial</h4>
              <div className="funnel-stats">
                {stats.funnel.map(f => (
                  <div key={f.funnel_stage} className="funnel-item">
                    {getFunnelBadge(f.funnel_stage)}
                    <span>{f.count} conversas</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <main className="dashboard-main">
          <aside className="sidebar">
            <div className="queue-section">
              <h3>
                Fila de Atendimento
                <select 
                  value={filterDept || ''} 
                  onChange={(e) => setFilterDept(e.target.value || null)}
                  className="dept-filter"
                >
                  <option value="">Todos</option>
                  <option value="1">Comercial</option>
                  <option value="2">Financeiro</option>
                  <option value="3">Secretaria</option>
                  <option value="4">Acadêmico</option>
                </select>
              </h3>
              <div className="conv-list">
                {queue.length === 0 ? (
                  <p className="empty">Nenhuma conversa na fila</p>
                ) : (
                  queue.map(conv => (
                    <ConversationItem key={conv.id} conv={conv} showPull />
                  ))
                )}
              </div>
            </div>

            <div className="my-section">
              <h3>Meus Atendimentos ({myConversations.length})</h3>
              <div className="conv-list">
                {myConversations.length === 0 ? (
                  <p className="empty">Clique em uma conversa da fila para atender</p>
                ) : (
                  myConversations.map(conv => (
                    <ConversationItem key={conv.id} conv={conv} />
                  ))
                )}
              </div>
            </div>

            <div className="resolved-section">
              <h3 onClick={() => { setShowResolved(!showResolved); if (!showResolved) fetchResolvedConversations(1); }}>
                {showResolved ? '▼' : '▶'} Encerradas ({resolvedConversations.length})
              </h3>
              {showResolved && (
                <div className="conv-list">
                  {resolvedConversations.length === 0 ? (
                    <p className="empty">Nenhuma conversa encerrada</p>
                  ) : (
                    resolvedConversations.map(conv => (
                      <div key={conv.id} className="conv-item resolved-item">
                        <div 
                          className="conv-item-clickable"
                          onClick={() => setActiveConversation(conv)}
                        >
                          <div className="conv-header">
                            <span className="contact-name">{conv.contacts?.name || conv.contacts?.phone || 'Desconhecido'}</span>
                            <span className="conv-time">{formatTime(conv.last_message_at)}</span>
                          </div>
                          <div className="conv-meta">
                            <span className="dept-badge">{conv.department_name || 'Sem setor'}</span>
                          </div>
                        </div>
                        <button 
                          className="btn-reopen"
                          onClick={(e) => { e.stopPropagation(); handleReopen(conv); }}
                          title="Reabrir conversa"
                        >
                          ↩️
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </aside>

          <section className="chat-area">
            {activeConversation ? (
              <ChatWindow />
            ) : (
              <div className="no-chat">
                <p>Selecione uma conversa para iniciar o atendimento</p>
              </div>
            )}
          </section>
        </main>
      )}

      <ContactsModal isOpen={showContacts} onClose={() => setShowContacts(false)} />
    </div>
  )
}