import { Router } from 'express';
import { db } from '../db';
import { authenticateUser, requirePermission, logAudit, AuthRequest } from '../auth';
import { subDays, parseISO, differenceInDays } from 'date-fns';
import { getRankPLeaveLimit } from '../../src/utils/constants';

export const personnelRouter = Router();

// 1. List Personnel with Search and Filtering (Contains ONLY: Army Number, Rank, Name, Trade, Appointment, Status)
personnelRouter.get('/', authenticateUser, (req, res) => {
  const { search, rank, trade, status, isActive } = req.query;

  let query = 'SELECT * FROM personnel WHERE 1=1';
  const params: any[] = [];

  if (isActive !== undefined && isActive !== '') {
    query += ' AND is_active = ?';
    params.push(isActive === 'true' || isActive === '1' ? 1 : 0);
  } else {
    query += ' AND is_active = 1';
  }

  if (rank) {
    query += ' AND rank = ?';
    params.push(rank);
  }

  if (trade) {
    query += ' AND trade = ?';
    params.push(trade);
  }

  if (status) {
    query += ' AND current_status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (army_number LIKE ? OR name LIKE ? OR appointment LIKE ? OR trade LIKE ? OR rank LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }

  query += ' ORDER BY CASE rank WHEN "Lieutenant Colonel" THEN 1 WHEN "Major" THEN 2 WHEN "Captain" THEN 3 WHEN "Lieutenant" THEN 4 WHEN "2Lieutenant" THEN 5 WHEN "Master Warrent Officer" THEN 6 WHEN "Senior Warrent Officer" THEN 7 WHEN "Warrent Officer" THEN 8 WHEN "Sergent" THEN 9 WHEN "Corporal" THEN 10 WHEN "Lance Corporal" THEN 11 WHEN "Sainik" THEN 12 WHEN "NC(E)" THEN 13 WHEN "Civil" THEN 14 ELSE 15 END, army_number ASC';

  const rows = db.prepare(query).all(...params);

  const personnel = rows.map((r: any) => ({
    id: r.id,
    armyNumber: r.army_number,
    rank: r.rank,
    name: r.name,
    trade: r.trade,
    appointment: r.appointment,
    currentStatus: r.current_status,
    statusReason: r.status_reason,
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
  }));

  return res.json({ personnel, total: personnel.length });
});

// 2. 360° Comprehensive Profile Dossier
personnelRouter.get('/:id', authenticateUser, (req, res) => {
  const p: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id);
  if (!p) {
    return res.status(404).json({ error: 'Personnel record not found.' });
  }

  const now = new Date();
  const weekStart = subDays(now, 7).toISOString().split('T')[0];
  const monthStart = subDays(now, 30).toISOString().split('T')[0];
  const yearStart = subDays(now, 365).toISOString().split('T')[0];

  // Duty Statistics
  const weeklyDuties = db.prepare('SELECT * FROM duties WHERE personnel_id = ? AND date >= ?').all(p.id, weekStart);
  const monthlyDuties = db.prepare('SELECT * FROM duties WHERE personnel_id = ? AND date >= ?').all(p.id, monthStart);
  const yearlyDuties = db.prepare('SELECT * FROM duties WHERE personnel_id = ? AND date >= ?').all(p.id, yearStart);

  const calcDutyStats = (list: any[]) => {
    let totalHours = 0;
    let nightDuties = 0;
    let nightHours = 0;
    const typeDistribution: Record<string, number> = {};

    list.forEach((d) => {
      totalHours += d.duration_hours || 0;
      if (d.is_night_duty) nightDuties++;
      nightHours += d.night_duty_hours || 0;
      typeDistribution[d.duty_type] = (typeDistribution[d.duty_type] || 0) + 1;
    });

    return {
      totalDuties: list.length,
      totalHours: Math.round(totalHours * 10) / 10,
      nightDuties,
      nightHours: Math.round(nightHours * 10) / 10,
      typeDistribution,
    };
  };

  const dutyStats = {
    weekly: calcDutyStats(weeklyDuties),
    monthly: calcDutyStats(monthlyDuties),
    yearly: calcDutyStats(yearlyDuties),
  };

  // Fatigue Index Calculation (Uses actual active duty hours)
  const monthlyDutyCount = dutyStats.monthly.totalDuties;
  const monthlyNightHours = dutyStats.monthly.nightHours;
  let fatigueScore = monthlyDutyCount * 1.5 + monthlyNightHours * 1.2;
  let fatigueLevel: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW';
  if (fatigueScore >= 24) {
    fatigueLevel = 'HIGH';
  } else if (fatigueScore >= 12) {
    fatigueLevel = 'MODERATE';
  }

  // PT Statistics
  const calcPTStats = (days: number) => {
    const dStr = subDays(now, days).toISOString().split('T')[0];
    const records = db.prepare('SELECT * FROM pt_records WHERE personnel_id = ? AND date >= ?').all(p.id, dStr);
    const totalSessions = records.length;
    const attended = records.filter((r) => r.status === 'PRESENT').length;
    const excused = records.filter((r) => r.status === 'EXCUSED_DUTY' || r.status === 'EXCUSED_MEDICAL').length;
    const missed = records.filter((r) => r.status === 'ABSENT').length;
    const eligibleSessions = totalSessions - excused;
    const pct = eligibleSessions > 0 ? Math.round((attended / eligibleSessions) * 100) : 100;
    return { totalSessions, attended, excused, missed, percentage: pct };
  };

  // Games Statistics
  const calcGamesStats = (days: number) => {
    const dStr = subDays(now, days).toISOString().split('T')[0];
    const records = db.prepare('SELECT * FROM games_records WHERE personnel_id = ? AND date >= ?').all(p.id, dStr);
    const totalSessions = records.length;
    const attended = records.filter((r) => r.status === 'PRESENT').length;
    const excused = records.filter((r) => r.status === 'EXCUSED_DUTY' || r.status === 'EXCUSED_MEDICAL').length;
    const missed = records.filter((r) => r.status === 'ABSENT').length;
    const eligibleSessions = totalSessions - excused;
    const pct = eligibleSessions > 0 ? Math.round((attended / eligibleSessions) * 100) : 100;
    return { totalSessions, attended, excused, missed, percentage: pct };
  };

  // Leave Analytics
  const leaves = db.prepare('SELECT * FROM leave_records WHERE personnel_id = ? ORDER BY start_date DESC').all(p.id);
  const currentYear = new Date().getFullYear();
  const thisYearLeaves = leaves.filter((l) => l.start_date.startsWith(String(currentYear)));

  // P Leave: Rank-specific annual limit (30d Officers / 60d JCOs, ORs, NC(E), Civil)
  const pLeaveLimit = getRankPLeaveLimit(p.rank);
  const pLeavesThisYear = thisYearLeaves.filter((l) => l.leave_type === 'P_LEAVE');
  const pLeaveDaysUsed = pLeavesThisYear.reduce((acc, l) => acc + (l.total_days || 0), 0);
  const pLeaveDaysRemaining = Math.max(0, pLeaveLimit - pLeaveDaysUsed);
  const pLeaveUsagePct = pLeaveLimit > 0 ? Math.round((pLeaveDaysUsed / pLeaveLimit) * 100) : 0;
  const pLeaveLimitReached = pLeaveDaysUsed >= pLeaveLimit;

  // C Leave History & Due calculation (cadence: 3 months = ~90 days)
  const cLeavesThisYear = thisYearLeaves.filter((l) => l.leave_type === 'C_LEAVE');
  const cLeaveTotalDays = cLeavesThisYear.reduce((acc, l) => acc + (l.total_days || 0), 0);

  const lastCLeave = leaves.find((l) => l.leave_type === 'C_LEAVE');
  let lastCLeaveDate = lastCLeave ? lastCLeave.start_date : `${currentYear}-01-01`;
  let daysSinceLastCLeave = 0;
  let nextCLeaveDueDate = '';
  let daysUntilCLeaveDue = 90;
  let isCLeaveDueIn15Days = false;
  let isCLeaveOverdue = false;

  if (lastCLeaveDate) {
    try {
      const lastDate = parseISO(lastCLeaveDate);
      daysSinceLastCLeave = differenceInDays(now, lastDate);
      const dueDate = new Date(lastDate);
      dueDate.setDate(dueDate.getDate() + 90);
      nextCLeaveDueDate = dueDate.toISOString().split('T')[0];
      daysUntilCLeaveDue = differenceInDays(dueDate, now);
      if (daysUntilCLeaveDue < 0) {
        isCLeaveOverdue = true;
      } else if (daysUntilCLeaveDue <= 15) {
        isCLeaveDueIn15Days = true;
      }
    } catch (e) {}
  }

  const soldierData = {
    id: p.id,
    armyNumber: p.army_number,
    rank: p.rank,
    name: p.name,
    trade: p.trade,
    appointment: p.appointment,
    currentStatus: p.current_status,
    statusReason: p.status_reason,
    isActive: Boolean(p.is_active),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };

  return res.json({
    soldier: soldierData,
    personnel: soldierData,
    dutySummary: dutyStats,
    fatigueIndex: {
      level: fatigueLevel,
      score: Math.round(fatigueScore * 10) / 10,
      monthlyDuties: dutyStats.monthly.totalDuties,
      monthlyHours: dutyStats.monthly.totalHours,
      monthlyNightDuties: dutyStats.monthly.nightDuties,
      monthlyNightHours: dutyStats.monthly.nightHours,
    },
    ptScorecard: {
      weekly: calcPTStats(7),
      monthly: calcPTStats(30),
      yearly: calcPTStats(365),
    },
    gamesScorecard: {
      weekly: calcGamesStats(7),
      monthly: calcGamesStats(30),
      yearly: calcGamesStats(365),
    },
    leaveSummary: {
      pLeave: {
        limit: pLeaveLimit,
        usedDays: pLeaveDaysUsed,
        remainingDays: pLeaveDaysRemaining,
        usagePct: pLeaveUsagePct,
        limitReached: pLeaveLimitReached,
        periodsCount: pLeavesThisYear.length,
      },
      cLeave: {
        periodsThisYear: cLeavesThisYear.length,
        totalDaysThisYear: cLeaveTotalDays,
        lastCLeaveDate,
        nextCLeaveDueDate,
        daysSinceLastCLeave,
        daysUntilCLeaveDue,
        isDueIn15Days: isCLeaveDueIn15Days,
        isOverdue: isCLeaveOverdue,
      },
    },
    recentDuties: db.prepare('SELECT * FROM duties WHERE personnel_id = ? ORDER BY date DESC LIMIT 10').all(p.id),
    recentLeaves: leaves.slice(0, 10),
  });
});

// 3. Add Personnel (2IC, Duty Officer, Duty Munshi permitted; CO blocked)
personnelRouter.post('/', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const { armyNumber, rank, name, trade, appointment, currentStatus, statusReason } = req.body;

  if (!armyNumber || !rank || !name || !trade) {
    return res.status(400).json({ error: 'Army Number, Rank, Name, and Trade are required.' });
  }

  // Unique Army Number Check
  const existing: any = db.prepare('SELECT id FROM personnel WHERE army_number = ?').get(armyNumber.trim());
  if (existing) {
    return res.status(400).json({ error: `Soldier with Army Number '${armyNumber}' already exists.` });
  }

  const id = `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();
  const createdBy = req.user?.appointment || '2IC';

  db.prepare(`
    INSERT INTO personnel (id, army_number, rank, name, trade, appointment, unit_joining_date, current_status, status_reason, is_active, created_at, updated_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, 1, ?, ?, ?)
  `).run(
    id,
    armyNumber.trim(),
    rank,
    name.trim(),
    trade,
    appointment ? appointment.trim() : 'General Duty',
    currentStatus || 'PRESENT',
    statusReason || null,
    now,
    now,
    createdBy
  );

  logAudit(req, 'CREATE_PERSONNEL', 'PERSONNEL', id, `Added ${rank} ${name} (${armyNumber})`);

  return res.status(201).json({
    message: 'Personnel record created successfully.',
    id,
  });
});

// 4. Edit Personnel (Army Number, Rank, Name, Trade, Appointment - 2IC, Duty Officer, Duty Munshi permitted)
personnelRouter.put('/:id', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const { armyNumber, rank, name, trade, appointment, currentStatus, statusReason } = req.body;
  const p: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id);
  if (!p) {
    return res.status(404).json({ error: 'Personnel record not found.' });
  }

  // If Army Number is being updated, verify it is unique among other personnel
  const newArmyNumber = armyNumber ? armyNumber.trim() : p.army_number;
  if (newArmyNumber !== p.army_number) {
    const existingWithSameArmyNo: any = db.prepare('SELECT id FROM personnel WHERE army_number = ? AND id != ?').get(newArmyNumber, p.id);
    if (existingWithSameArmyNo) {
      return res.status(400).json({ error: `Army Number '${newArmyNumber}' is already assigned to another soldier.` });
    }
  }

  const now = new Date().toISOString();
  const updatedBy = req.user?.appointment || '2IC';

  db.prepare(`
    UPDATE personnel
    SET army_number = ?, rank = ?, name = ?, trade = ?, appointment = ?, current_status = ?, status_reason = ?, updated_at = ?, updated_by = ?
    WHERE id = ?
  `).run(
    newArmyNumber,
    rank || p.rank,
    name ? name.trim() : p.name,
    trade || p.trade,
    appointment ? appointment.trim() : p.appointment,
    currentStatus || p.current_status,
    statusReason !== undefined ? statusReason : p.status_reason,
    now,
    updatedBy,
    p.id
  );

  logAudit(req, 'UPDATE_PERSONNEL', 'PERSONNEL', p.id, `Updated details for ${rank || p.rank} ${name || p.name} (${newArmyNumber})`);

  return res.json({ message: 'Personnel record updated successfully.' });
});

// 5. Update Status Only
personnelRouter.put('/:id/status', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const { currentStatus, statusReason } = req.body;
  const p: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id);
  if (!p) {
    return res.status(404).json({ error: 'Personnel record not found.' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE personnel SET current_status = ?, status_reason = ?, updated_at = ?, updated_by = ? WHERE id = ?').run(
    currentStatus,
    statusReason || null,
    now,
    req.user?.appointment,
    p.id
  );

  logAudit(req, 'STATUS_CHANGE', 'PERSONNEL', p.id, `Changed status of ${p.name} to ${currentStatus}`);

  return res.json({ message: 'Personnel status updated.' });
});

// 6. Delete Personnel (Safe Deletion with Historical Record Protection - 2IC, Duty Officer, Duty Munshi)
personnelRouter.delete('/:id', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const p: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id);
  if (!p) {
    return res.status(404).json({ error: 'Personnel record not found.' });
  }

  // Check historical operational records
  const dutyCount: any = db.prepare('SELECT COUNT(*) as count FROM duties WHERE personnel_id = ?').get(p.id);
  const ptCount: any = db.prepare('SELECT COUNT(*) as count FROM pt_records WHERE personnel_id = ?').get(p.id);
  const gamesCount: any = db.prepare('SELECT COUNT(*) as count FROM games_records WHERE personnel_id = ?').get(p.id);
  const leaveCount: any = db.prepare('SELECT COUNT(*) as count FROM leave_records WHERE personnel_id = ?').get(p.id);

  const totalHistoricalRecords = (dutyCount?.count || 0) + (ptCount?.count || 0) + (gamesCount?.count || 0) + (leaveCount?.count || 0);

  const now = new Date().toISOString();
  const deletedBy = req.user?.appointment || '2IC';

  // Safe Deletion: Set is_active = 0 so they are removed from active manpower, duty rosters, PT and Games, while preserving historical reports
  db.prepare('UPDATE personnel SET is_active = 0, updated_at = ?, updated_by = ? WHERE id = ?').run(now, deletedBy, p.id);

  logAudit(
    req,
    'DELETE_PERSONNEL',
    'PERSONNEL',
    p.id,
    `Safely deleted / deactivated ${p.rank} ${p.name} (${p.army_number}). Preserved ${totalHistoricalRecords} historical records.`
  );

  return res.json({
    message: `Personnel ${p.rank} ${p.name} (${p.army_number}) deleted from active database. Historical records safely preserved.`,
    safeDeleted: true,
    historicalRecordsCount: totalHistoricalRecords,
  });
});

// 7. Deactivate (Posted Out)
personnelRouter.put('/:id/deactivate', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const p: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Personnel not found.' });

  const now = new Date().toISOString();
  db.prepare('UPDATE personnel SET is_active = 0, updated_at = ?, updated_by = ? WHERE id = ?').run(now, req.user?.appointment, p.id);
  logAudit(req, 'DEACTIVATE_PERSONNEL', 'PERSONNEL', p.id, `Deactivated / Posted out ${p.rank} ${p.name} (${p.army_number})`);

  return res.json({ message: 'Personnel deactivated.' });
});

// 8. Restore
personnelRouter.put('/:id/restore', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const p: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Personnel not found.' });

  const now = new Date().toISOString();
  db.prepare('UPDATE personnel SET is_active = 1, updated_at = ?, updated_by = ? WHERE id = ?').run(now, req.user?.appointment, p.id);
  logAudit(req, 'RESTORE_PERSONNEL', 'PERSONNEL', p.id, `Restored ${p.rank} ${p.name} (${p.army_number})`);

  return res.json({ message: 'Personnel restored to active unit roster.' });
});

// 9. Bulk Import
personnelRouter.post('/bulk-import', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'Valid rows array required.' });
  }

  const now = new Date().toISOString();
  let importedCount = 0;

  for (const r of rows) {
    if (!r.armyNumber || !r.name) continue;

    const existing: any = db.prepare('SELECT id FROM personnel WHERE army_number = ?').get(String(r.armyNumber).trim());
    if (existing) continue;

    const id = `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    db.prepare(`
      INSERT INTO personnel (id, army_number, rank, name, trade, appointment, unit_joining_date, current_status, is_active, created_at, updated_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, '', 'PRESENT', 1, ?, ?, ?)
    `).run(
      id,
      String(r.armyNumber).trim(),
      r.rank || 'Sainik',
      String(r.name).trim(),
      r.trade || 'MA',
      r.appointment || 'General Duty',
      now,
      now,
      req.user?.appointment || '2IC'
    );
    importedCount++;
  }

  logAudit(req, 'BULK_IMPORT_PERSONNEL', 'PERSONNEL', 'BULK', `Imported ${importedCount} soldiers.`);

  return res.json({ message: `Successfully imported ${importedCount} personnel records.` });
});
