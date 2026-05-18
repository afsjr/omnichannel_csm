import { useState, useEffect } from 'react';
import api from '../services/api';

export default function MetricsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/dashboard/stats?companyId=1');
      if (response.ok) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="metrics-loading">Carregando métricas...</div>;
  }

  if (!stats) {
    return <div className="metrics-error">Erro ao carregar métricas</div>;
  }

  return (
    <div className="metrics-dashboard">
      <h2>Dashboard de Métricas</h2>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{stats.open}</div>
          <div className="metric-label">Conversas Abertas</div>
        </div>

        <div className="metric-card highlight">
          <div className="metric-value">{stats.queued}</div>
          <div className="metric-label">Na Fila</div>
        </div>

        <div className="metric-card success">
          <div className="metric-value">{stats.resolvedToday}</div>
          <div className="metric-label">Resolvidas Hoje</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{stats.onlineAgents}</div>
          <div className="metric-label">Atendentes Online</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{stats.avgResponseSeconds}s</div>
          <div className="metric-label">Tempo Médio Resposta</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{stats.total}</div>
          <div className="metric-label">Total de Conversas</div>
        </div>
      </div>

      <div className="metrics-sections">
        <div className="section">
          <h3>Por Setor</h3>
          <div className="department-stats">
            {stats.byDepartment.map((dept) => (
              <div key={dept.id} className="dept-stat">
                <span className="dept-name">{dept.name}</span>
                <span className="dept-count">{dept.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h3>Por Status</h3>
          <div className="status-stats">
            {stats.byStatus.map((s) => (
              <div key={s.status} className="status-stat">
                <span className="status-badge" data-status={s.status}>
                  {s.status}
                </span>
                <span className="status-count">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}