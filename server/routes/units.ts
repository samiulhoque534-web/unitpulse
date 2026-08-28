import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, requireRole, logAudit } from '../auth.js';
import { seedDatabase } from '../seed.js';

export const unitsRouter = Router();

// GET all units (for Multi-unit selector / Command HQ)
unitsRouter.get('/', (req: Request, res: Response) => {
  const units = db.prepare(`
    SELECT id, name, short_name as shortName, formation, location, authorized_strength as authorizedStrength,
           motto, created_at as createdAt,
           (SELECT count(*) FROM personnel WHERE unit_id = units.id) as heldStrength
    FROM units
    ORDER BY name ASC
  `).all();

  return res.json({ units });
});

// GET single unit
unitsRouter.get('/:id', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const unit = db.prepare(`
    SELECT id, name, short_name as shortName, formation, location, authorized_strength as authorizedStrength, motto, created_at as createdAt
    FROM units
    WHERE id = ?
  `).get(id);

  if (!unit) {
    return res.status(404).json({ error: 'Unit not found' });
  }

  return res.json({ unit });
});

// POST Create New Unit (Multi-unit support)
unitsRouter.post('/', authMiddleware, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const { id, name, shortName, formation, location, authorizedStrength, motto } = req.body;

  if (!name || !shortName || !formation || !location) {
    return res.status(400).json({ error: 'Name, Short Name, Formation, and Location are required' });
  }

  const unitId = id ? id.trim().toUpperCase().replace(/\s+/g, '_') : `UNIT_${Date.now()}`;
  const authStrength = parseInt(authorizedStrength) || 150;

  try {
    db.prepare(`
      INSERT INTO units (id, name, short_name, formation, location, authorized_strength, motto)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(unitId, name.trim(), shortName.trim(), formation.trim(), location.trim(), authStrength, motto || null);

    // Initialize standard duty types for the new unit
    const defaultTypes = [
      { name: 'Kote Duty', code: 'KOTE', desc: 'Armory & Weapon Guard Security', hours: 8, night: 1, color: '#ef4444' },
      { name: 'RP Duty', code: 'RP', desc: 'Regimental Police Main Gate Access Control', hours: 6, night: 1, color: '#f97316' },
      { name: 'Duty Clerk', code: 'CLERK', desc: 'Administrative Office & Operations Standby', hours: 12, night: 1, color: '#eab308' },
      { name: 'Canteen Duty', code: 'CANTEEN', desc: 'Unit Ration & Canteen Store Supervision', hours: 8, night: 0, color: '#10b981' },
      { name: 'Station Duty', code: 'STATION', desc: 'Perimeter, Quarter Guard & Camp Patrol', hours: 6, night: 1, color: '#06b6d4' },
      { name: 'Admin Driver', code: 'DRIVER', desc: 'Command / Emergency Medical Vehicle Standby', hours: 12, night: 1, color: '#8b5cf6' },
      { name: 'Medical Cover', code: 'MED_COVER', desc: 'Field Medical Assistance & Ambulance Cover', hours: 12, night: 1, color: '#ec4899' },
      { name: 'Others', code: 'OTHERS', desc: 'Miscellaneous Special Administrative Detail', hours: 8, night: 0, color: '#64748b' },
    ];

    const insertDutyType = db.prepare(`
      INSERT INTO duty_types (id, name, code, description, default_duration_hours, is_night_duty, color_code, unit_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const dt of defaultTypes) {
      insertDutyType.run(`${unitId}_${dt.code}`, dt.name, dt.code, dt.desc, dt.hours, dt.night, dt.color, unitId);
    }

    // Default entitlement
    db.prepare(`
      INSERT INTO leave_entitlements (id, unit_id, annual_p_leave_days, annual_c_leave_days, annual_medical_leave_days, p_leave_eligibility_months)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`${unitId}_ENTITLEMENT`, unitId, 60, 20, 30, 6);

    logAudit(
      unitId,
      req.user,
      'CREATE',
      'SETTING',
      unitId,
      `Registered New Military Unit: ${name} (${shortName})`,
      null,
      req.body,
      req.ip
    );

    return res.status(201).json({ message: 'Unit registered successfully', unitId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create unit' });
  }
});

// POST Purge Demo Data (ADMIN only - clears demo personnel, duties, attendance, leave for fresh unit deployment)
unitsRouter.post('/:id/purge-demo', authMiddleware, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    db.prepare('DELETE FROM duties WHERE unit_id = ?').run(id);
    db.prepare('DELETE FROM pt_games_attendance WHERE unit_id = ?').run(id);
    db.prepare('DELETE FROM leave_records WHERE unit_id = ?').run(id);
    db.prepare('DELETE FROM personnel WHERE unit_id = ?').run(id);

    logAudit(
      id,
      req.user,
      'PURGE',
      'SETTING',
      id,
      `Purged all demo records and initialized clean production state for unit #${id}`,
      null,
      { purgedAt: new Date().toISOString() },
      req.ip
    );

    return res.json({ message: 'All demo personnel, duty rosters, PT/Games records, and leave logs have been purged. Unit is clean for live data entry.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to purge demo data' });
  }
});

// POST Seed Demo Data (ADMIN only - seeds realistic dataset)
unitsRouter.post('/:id/seed-demo', authMiddleware, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await seedDatabase(id);
    return res.json({ message: `Successfully loaded realistic military demonstration dataset for unit ${id}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to seed demo data' });
  }
});
