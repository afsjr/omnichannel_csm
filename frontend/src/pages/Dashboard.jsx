import { useEffect } from 'react'
import { useAuthStore } from '../contexts/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>OmniChat CSM</h1>
        <div className="header-info">
          <span>{user?.name || user?.email}</span>
          <button onClick={handleLogout}>Sair</button>
        </div>
      </header>

      <main className="dashboard-main">
        <aside className="sidebar">
          <div className="queue-section">
            <h3>Fila de Atendimento</h3>
            <p className="empty-message">Nenhuma conversa na fila</p>
          </div>
          <div className="my-conversations-section">
            <h3>Meus Atendimentos</h3>
            <p className="empty-message">Nenhum atendimento ativo</p>
          </div>
        </aside>

        <section className="chat-area">
          <div className="no-conversation">
            <p>Bem-vindo, {user?.name}!</p>
            <p>Selecione uma conversa para iniciar</p>
          </div>
        </section>
      </main>
    </div>
  )
}