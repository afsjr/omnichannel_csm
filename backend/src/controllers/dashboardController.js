async function getStats(req, reply) {
  const { companyId } = req.query || {};
  const { conversationRepository, messageRepository, userRepository } = req.server.container.repositories;
  const db = req.server.container.db;

  const companyIdNum = Number(companyId) || 1;

  const [totalConv, openConv, queuedConv, resolvedToday, onlineAgents] = await Promise.all([
    conversationRepository.count({ where: { company_id: companyIdNum } }),
    db.query(`
      SELECT COUNT(*) as count FROM conversations
      WHERE company_id = $1 AND status IN ('open', 'pending', 'in_progress', 'queued')
    `, [companyIdNum]),
    db.query(`
      SELECT COUNT(*) as count FROM conversations
      WHERE company_id = $1 AND status = 'queued'
    `, [companyIdNum]),
    db.query(`
      SELECT COUNT(*) as count FROM conversations
      WHERE company_id = $1 AND status = 'resolved'
      AND DATE(last_message_at) = CURRENT_DATE
    `, [companyIdNum]),
    userRepository.findAll({ where: { is_online: true, company_id: companyIdNum } })
  ]);

  const avgResponseTime = await db.query(`
    SELECT AVG(EXTRACT(EPOCH FROM (created_at - lag_created))) as avg_seconds
    FROM (
      SELECT m1.created_at as lag_created, m2.created_at,
             m1.conversation_id
      FROM messages m1
      JOIN messages m2 ON m2.conversation_id = m1.conversation_id
        AND m2.id = m1.id + 1
      WHERE m1.direction = 'incoming'
    ) sub
    JOIN conversations c ON c.id = sub.conversation_id
    WHERE c.company_id = $1
    AND sub.created_at > NOW() - INTERVAL '24 hours'
  `, [companyIdNum]);

  const byDepartment = await db.query(`
    SELECT d.name, COUNT(c.id) as total, d.id
    FROM departments d
    LEFT JOIN conversations c ON c.department_id = d.id
      AND c.status != 'resolved'
    WHERE d.company_id = $1
    GROUP BY d.id, d.name
    ORDER BY total DESC
  `, [companyIdNum]);

  const byStatus = await db.query(`
    SELECT status, COUNT(*) as count
    FROM conversations
    WHERE company_id = $1
    GROUP BY status
  `, [companyIdNum]);

  return reply.send({
    ok: true,
    data: {
      total: parseInt(totalConv),
      open: parseInt(openConv.rows[0]?.count || 0),
      queued: parseInt(queuedConv.rows[0]?.count || 0),
      resolvedToday: parseInt(resolvedToday.rows[0]?.count || 0),
      onlineAgents: onlineAgents.rowCount,
      avgResponseSeconds: parseFloat(avgResponseTime.rows[0]?.avg_seconds || 0).toFixed(1),
      byDepartment: byDepartment.rows,
      byStatus: byStatus.rows
    }
  });
}

async function getRecentActivity(req, reply) {
  const { companyId, limit } = req.query || {};
  const db = req.server.container.db;

  const result = await db.query(`
    SELECT m.id, m.content, m.direction, m.created_at,
           c.id as conversation_id, cont.name as contact_name, cont.phone as contact_phone
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    JOIN contacts cont ON cont.id = c.contact_id
    WHERE c.company_id = $1
    ORDER BY m.created_at DESC
    LIMIT $2
  `, [Number(companyId) || 1, Number(limit) || 20]);

  return reply.send({ ok: true, data: result.rows });
}

async function getDashboardStats(req, reply) {
  const { companyId } = req.query || {};
  const db = req.server.container.db;
  const companyIdNum = Number(companyId) || 1;

  const today = await db.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status != 'resolved') as active,
      COUNT(*) FILTER (WHERE status = 'resolved' AND DATE(last_message_at) = CURRENT_DATE) as resolved
    FROM conversations
    WHERE company_id = $1
  `, [companyIdNum]);

  const thisWeek = await db.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status != 'resolved') as active,
      COUNT(*) FILTER (WHERE status = 'resolved' AND last_message_at >= DATE_TRUNC('week', CURRENT_DATE)) as resolved
    FROM conversations
    WHERE company_id = $1
  `, [companyIdNum]);

  const thisMonth = await db.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status != 'resolved') as active,
      COUNT(*) FILTER (WHERE status = 'resolved' AND last_message_at >= DATE_TRUNC('month', CURRENT_DATE)) as resolved
    FROM conversations
    WHERE company_id = $1
  `, [companyIdNum]);

  const byDepartment = await db.query(`
    SELECT 
      d.id,
      d.name,
      COUNT(*) FILTER (WHERE c.status != 'resolved') as active,
      COUNT(*) FILTER (WHERE c.status = 'resolved' AND DATE(c.last_message_at) = CURRENT_DATE) as resolved_today,
      COUNT(*) FILTER (WHERE c.status = 'resolved' AND c.last_message_at >= DATE_TRUNC('week', CURRENT_DATE)) as resolved_week,
      COUNT(*) FILTER (WHERE c.status = 'resolved' AND c.last_message_at >= DATE_TRUNC('month', CURRENT_DATE)) as resolved_month
    FROM departments d
    LEFT JOIN conversations c ON c.department_id = d.id
    WHERE d.company_id = $1
    GROUP BY d.id, d.name
    ORDER BY active DESC
  `, [companyIdNum]);

  const byAgent = await db.query(`
    SELECT 
      u.id,
      u.name,
      COUNT(*) FILTER (WHERE c.status = 'in_progress' AND c.assigned_to = u.id) as in_progress,
      COUNT(*) FILTER (WHERE c.status = 'resolved' AND DATE(c.last_message_at) = CURRENT_DATE AND c.assigned_to = u.id) as resolved_today
    FROM users u
    LEFT JOIN conversations c ON c.assigned_to = u.id
    WHERE u.company_id = $1 AND u.role != 'admin'
    GROUP BY u.id, u.name
    ORDER BY resolved_today DESC
  `, [companyIdNum]);

  const funnelStats = await db.query(`
    SELECT 
      funnel_stage,
      COUNT(*) as count
    FROM conversations
    WHERE company_id = $1 AND department_id = (
      SELECT id FROM departments WHERE company_id = $1 AND name = 'Comercial' LIMIT 1
    )
    GROUP BY funnel_stage
  `, [companyIdNum]);

  return reply.send({
    ok: true,
    data: {
      period: {
        today: {
          active: parseInt(today.rows[0]?.active || 0),
          resolved: parseInt(today.rows[0]?.resolved || 0)
        },
        week: {
          active: parseInt(thisWeek.rows[0]?.active || 0),
          resolved: parseInt(thisWeek.rows[0]?.resolved || 0)
        },
        month: {
          active: parseInt(thisMonth.rows[0]?.active || 0),
          resolved: parseInt(thisMonth.rows[0]?.resolved || 0)
        }
      },
      byDepartment: byDepartment.rows,
      byAgent: byAgent.rows,
      funnel: funnelStats.rows
    }
  });
}

module.exports = {
  getStats,
  getRecentActivity,
  getDashboardStats
};