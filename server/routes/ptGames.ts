import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, requireRole, logAudit } from '../auth.js';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export const ptGamesRouter = Router();

// GET Daily Attendance Sheet for a specific date
ptGamesRouter.get('/daily-sheet', authMiddleware, (req: Request, res: Response) => {
  const unitId = (req.query.unitId as string) || req.user!.unitId;
  const date = (req.query.date as string) || format(new Date(), 'yyyy-MM-dd');
  const subUnit = req.query.subUnit as string;

  let personnelQuery = `
    SELECT p.id, p.army_number as armyNumber, p.rank, p.name, p.trade, p.appointment, p.sub_unit as subUnit, p.current_status as currentStatus,
           a.id as attendanceId,
           coalesce(a.pt_status, CASE 
             WHEN p.current_status = 'ON_LEAVE' THEN 'ON_LEAVE'
             WHEN p.current_status = 'HOSPITAL' THEN 'EXCUSED_MEDICAL'
             WHEN p.current_status IN ('TY_DUTY', 'ATTACHED_OUT') THEN 'EXCUSED_DUTY'
             ELSE 'PRESENT' END) as ptStatus,
           coalesce(a.games_status, CASE 
             WHEN p.current_status = 'ON_LEAVE' THEN 'ON_LEAVE'
             WHEN p.current_status = 'HOSPITAL' THEN 'EXCUSED_MEDICAL'
             WHEN p.current_status IN ('TY_DUTY', 'ATTACHED_OUT') THEN 'EXCUSED_DUTY'
             ELSE 'PRESENT' END) as gamesStatus,
           a.remarks
    FROM personnel p
    LEFT JOIN pt_games_attendance a ON p.id = a.personnel_id AND a.date = ? AND a.unit_id = ?
    WHERE p.unit_id = ?
  `;

  const params: any[] = [date, unitId, unitId];

  if (subUnit) {
    personnelQuery += ` AND p.sub_unit = ?`;
    params.push(subUnit);
  }

  personnelQuery += ` ORDER BY p.rank, p.army_number`;

  const sheet = db.prepare(personnelQuery).all(...params);

  // Calculate day metrics
  let totalPersonnel = sheet.length;
  let ptPresentCount = 0;
  let gamesPresentCount = 0;
  let ptExcusedCount = 0;
  let gamesExcusedCount = 0;
  let ptAbsentCount = 0;
  let gamesAbsentCount = 0;
  let onLeaveCount = 0;

  sheet.forEach((row: any) => {
    if (row.ptStatus === 'PRESENT') ptPresentCount++;
    if (row.ptStatus === 'EXCUSED_DUTY' || row.ptStatus === 'EXCUSED_MEDICAL') ptExcusedCount++;
    if (row.ptStatus === 'ABSENT') ptAbsentCount++;
    if (row.ptStatus === 'ON_LEAVE') onLeaveCount++;

    if (row.gamesStatus === 'PRESENT') gamesPresentCount++;
    if (row.gamesStatus === 'EXCUSED_DUTY' || row.gamesStatus === 'EXCUSED_MEDICAL') gamesExcusedCount++;
    if (row.gamesStatus === 'ABSENT') gamesAbsentCount++;
  });

  const availableForPT = totalPersonnel - onLeaveCount;
  const ptPct = availableForPT > 0 ? Math.round((ptPresentCount / availableForPT) * 100) : 0;
  const gamesPct = availableForPT > 0 ? Math.round((gamesPresentCount / availableForPT) * 100) : 0;

  return res.json({
    date,
    sheet,
    summary: {
      totalPersonnel,
      availableForPT,
      ptPresentCount,
      ptExcusedCount,
      ptAbsentCount,
      gamesPresentCount,
      gamesExcusedCount,
      gamesAbsentCount,
      onLeaveCount,
      ptPct,
      gamesPct,
    }
  });
});

// POST Save Daily Attendance (Batch or single updates)
ptGamesRouter.post('/daily-sheet', authMiddleware, requireRole(['ADMIN', 'OIC', 'CLERK']), (req: Request, res: Response) => {
  const unitId = req.body.unitId || req.user!.unitId;
  const { date, records } = req.body;

  if (!date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Date and records array are required' });
  }

  const upsertStmt = db.prepare(`
    INSERT INTO pt_games_attendance (id, date, personnel_id, pt_status, games_status, remarks, unit_id, created_by, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(unit_id, date, personnel_id) DO UPDATE SET
      pt_status = excluded.pt_status,
      games_status = excluded.games_status,
      remarks = excluded.remarks,
      updated_by = excluded.updated_by,
      updated_at = CURRENT_TIMESTAMP
  `);

  const saveMany = db.transaction((items: any[]) => {
    for (const item of items) {
      const attId = item.attendanceId || `att_${unitId}_${date}_${item.personnelId}`;
      upsertStmt.run(
        attId,
        date,
        item.personnelId,
        item.ptStatus || 'PRESENT',
        item.gamesStatus || 'PRESENT',
        item.remarks || null,
        unitId,
        req.user?.username || 'clerk',
        req.user?.username || 'clerk'
      );
    }
  });

  try {
    saveMany(records);

    logAudit(
      unitId,
      req.user,
      'UPDATE',
      'PT_GAMES',
      undefined,
      `Logged PT & Games Attendance for ${records.length} personnel on ${date}`,
      null,
      { count: records.length, date },
      req.ip
    );

    return res.json({ message: 'Attendance records saved successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save attendance records' });
  }
});

// GET Overall Unit & Individual PT / Games Analytics (Weekly, Monthly, Yearly)
ptGamesRouter.get('/analytics', authMiddleware, (req: Request, res: Response) => {
  const unitId = (req.query.unitId as string) || req.user!.unitId;
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const weekStart = format(subDays(today, 7), 'yyyy-MM-dd');
  const monthStart = format(subDays(today, 30), 'yyyy-MM-dd');
  const yearStart = format(startOfYear(today), 'yyyy-MM-dd');

  // 1. Overall Unit Weekly, Monthly, Yearly %
  const calcUnitStats = (startDate: string) => {
    const res = db.prepare(`
      SELECT 
        count(*) as totalLogs,
        sum(CASE WHEN pt_status = 'PRESENT' THEN 1 ELSE 0 END) as ptPresent,
        sum(CASE WHEN pt_status IN ('EXCUSED_DUTY', 'EXCUSED_MEDICAL') THEN 1 ELSE 0 END) as ptExcused,
        sum(CASE WHEN pt_status = 'ABSENT' THEN 1 ELSE 0 END) as ptAbsent,
        sum(CASE WHEN games_status = 'PRESENT' THEN 1 ELSE 0 END) as gamesPresent,
        sum(CASE WHEN games_status IN ('EXCUSED_DUTY', 'EXCUSED_MEDICAL') THEN 1 ELSE 0 END) as gamesExcused,
        sum(CASE WHEN games_status = 'ABSENT' THEN 1 ELSE 0 END) as gamesAbsent,
        sum(CASE WHEN pt_status != 'ON_LEAVE' THEN 1 ELSE 0 END) as effectiveEntries
      FROM pt_games_attendance
      WHERE unit_id = ? AND date >= ? AND date <= ?
    `).get(unitId, startDate, todayStr) as any;

    const base = res?.effectiveEntries || 1;
    const ptPct = Math.round(((res?.ptPresent || 0) / (base || 1)) * 100);
    const gamesPct = Math.round(((res?.gamesPresent || 0) / (base || 1)) * 100);

    return {
      ptPct,
      gamesPct,
      ptPresent: res?.ptPresent || 0,
      ptExcused: res?.ptExcused || 0,
      ptAbsent: res?.ptAbsent || 0,
      gamesPresent: res?.gamesPresent || 0,
      gamesExcused: res?.gamesExcused || 0,
      gamesAbsent: res?.gamesAbsent || 0,
    };
  };

  const unitWeekly = calcUnitStats(weekStart);
  const unitMonthly = calcUnitStats(monthStart);
  const unitYearly = calcUnitStats(yearStart);

  // 2. Individual Soldier Attendance Stats Table
  const individualStats = db.prepare(`
    SELECT 
      p.id, p.army_number as armyNumber, p.rank, p.name, p.trade, p.sub_unit as subUnit, p.current_status as currentStatus,
      -- Weekly
      sum(CASE WHEN a.date >= ? AND a.pt_status = 'PRESENT' THEN 1 ELSE 0 END) as weeklyPtPresent,
      sum(CASE WHEN a.date >= ? AND a.pt_status != 'ON_LEAVE' THEN 1 ELSE 0 END) as weeklyPtTotal,
      sum(CASE WHEN a.date >= ? AND a.games_status = 'PRESENT' THEN 1 ELSE 0 END) as weeklyGamesPresent,
      sum(CASE WHEN a.date >= ? AND a.games_status != 'ON_LEAVE' THEN 1 ELSE 0 END) as weeklyGamesTotal,
      
      -- Monthly
      sum(CASE WHEN a.date >= ? AND a.pt_status = 'PRESENT' THEN 1 ELSE 0 END) as monthlyPtPresent,
      sum(CASE WHEN a.date >= ? AND a.pt_status != 'ON_LEAVE' THEN 1 ELSE 0 END) as monthlyPtTotal,
      sum(CASE WHEN a.date >= ? AND a.games_status = 'PRESENT' THEN 1 ELSE 0 END) as monthlyGamesPresent,
      sum(CASE WHEN a.date >= ? AND a.games_status != 'ON_LEAVE' THEN 1 ELSE 0 END) as monthlyGamesTotal,
      
      -- Yearly
      sum(CASE WHEN a.date >= ? AND a.pt_status = 'PRESENT' THEN 1 ELSE 0 END) as yearlyPtPresent,
      sum(CASE WHEN a.date >= ? AND a.pt_status != 'ON_LEAVE' THEN 1 ELSE 0 END) as yearlyPtTotal,
      sum(CASE WHEN a.date >= ? AND a.games_status = 'PRESENT' THEN 1 ELSE 0 END) as yearlyGamesPresent,
      sum(CASE WHEN a.date >= ? AND a.games_status != 'ON_LEAVE' THEN 1 ELSE 0 END) as yearlyGamesTotal,
      
      -- Missed breakdown
      sum(CASE WHEN a.pt_status = 'EXCUSED_DUTY' THEN 1 ELSE 0 END) as ptExcusedDutyCount,
      sum(CASE WHEN a.pt_status = 'EXCUSED_MEDICAL' THEN 1 ELSE 0 END) as ptExcusedMedCount,
      sum(CASE WHEN a.pt_status = 'ABSENT' THEN 1 ELSE 0 END) as ptUnexcusedAbsentCount,
      sum(CASE WHEN a.games_status = 'EXCUSED_DUTY' THEN 1 ELSE 0 END) as gamesExcusedDutyCount,
      sum(CASE WHEN a.games_status = 'EXCUSED_MEDICAL' THEN 1 ELSE 0 END) as gamesExcusedMedCount,
      sum(CASE WHEN a.games_status = 'ABSENT' THEN 1 ELSE 0 END) as gamesUnexcusedAbsentCount
    FROM personnel p
    LEFT JOIN pt_games_attendance a ON p.id = a.personnel_id AND a.unit_id = ?
    WHERE p.unit_id = ?
    GROUP BY p.id
    ORDER BY p.rank, p.army_number
  `).all(
    weekStart, weekStart, weekStart, weekStart,
    monthStart, monthStart, monthStart, monthStart,
    yearStart, yearStart, yearStart, yearStart,
    unitId, unitId
  ) as any[];

  const formattedIndividual = individualStats.map(s => {
    const wPtTot = s.weeklyPtTotal || 1;
    const wGmTot = s.weeklyGamesTotal || 1;
    const mPtTot = s.monthlyPtTotal || 1;
    const mGmTot = s.monthlyGamesTotal || 1;
    const yPtTot = s.yearlyPtTotal || 1;
    const yGmTot = s.yearlyGamesTotal || 1;

    return {
      id: s.id,
      armyNumber: s.armyNumber,
      rank: s.rank,
      name: s.name,
      trade: s.trade,
      subUnit: s.subUnit,
      currentStatus: s.currentStatus,
      weeklyPtPct: Math.round((s.weeklyPtPresent / wPtTot) * 100),
      weeklyGamesPct: Math.round((s.weeklyGamesPresent / wGmTot) * 100),
      monthlyPtPct: Math.round((s.monthlyPtPresent / mPtTot) * 100),
      monthlyGamesPct: Math.round((s.monthlyGamesPresent / mGmTot) * 100),
      yearlyPtPct: Math.round((s.yearlyPtPresent / yPtTot) * 100),
      yearlyGamesPct: Math.round((s.yearlyGamesPresent / yGmTot) * 100),
      ptExcusedDutyCount: s.ptExcusedDutyCount,
      ptExcusedMedCount: s.ptExcusedMedCount,
      ptUnexcusedAbsentCount: s.ptUnexcusedAbsentCount,
      gamesExcusedDutyCount: s.gamesExcusedDutyCount,
      gamesExcusedMedCount: s.gamesExcusedMedCount,
      gamesUnexcusedAbsentCount: s.gamesUnexcusedAbsentCount,
    };
  });

  return res.json({
    unitStats: {
      weekly: unitWeekly,
      monthly: unitMonthly,
      yearly: unitYearly,
    },
    individualStats: formattedIndividual,
  });
});
