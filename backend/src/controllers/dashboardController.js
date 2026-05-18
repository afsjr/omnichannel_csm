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
      WHERE company_id = $1 AND status = 'pending'
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

module.exports = {
  getStats,
  getRecentActivity
};