import { Router } from 'express';
import { db } from '../db';
import { authenticateUser } from '../auth';

export const auditRouter = Router();

// GET /api/audit/logs
auditRouter.get('/logs', authenticateUser, (req, res) => {
  const { action, appointment, search } = req.query;

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];

  if (action) {
    query += ' AND action = ?';
    params.push(action);
  }

  if (appointment) {
    query += ' AND appointment = ?';
    params.push(appointment);
  }

  if (search) {
    query += ' AND (details LIKE ? OR user_display_name LIKE ? OR entity_type LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY timestamp DESC LIMIT 200';

  const rows = db.prepare(query).all(...params);

  const logs = rows.map((r: any) => ({
    id: r.id,
    appointment: r.appointment,
    userDisplayName: r.user_display_name,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    details: r.details,
    timestamp: r.timestamp,
    ipAddress: r.ip_address,
  }));

  return res.json({ logs, total: logs.length });
});
