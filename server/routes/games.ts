import { Router } from 'express';
import { db } from '../db';
import { authenticateUser, requirePermission, logAudit, AuthRequest } from '../auth';
import { format, subDays } from 'date-fns';

export const gamesRouter = Router();

// 1. Get Daily Games Sheet (Only PRESENT personnel available!)
gamesRouter.get('/daily-sheet', authenticateUser, (req, res) => {
  const date = (req.query.date as string) || format(new Date(), 'yyyy-MM-dd');

  // Dynamic filter: STRICTLY only soldiers marked as PRESENT in unit!
  const presentPersonnel = db.prepare(`
    SELECT * FROM personnel
    WHERE is_active = 1 AND current_status = 'PRESENT'
    ORDER BY CASE rank WHEN "Lieutenant Colonel" THEN 1 WHEN "Major" THEN 2 WHEN "Captain" THEN 3 WHEN "Lieutenant" THEN 4 WHEN "2Lieutenant" THEN 5 WHEN "Master Warrent Officer" THEN 6 WHEN "Senior Warrent Officer" THEN 7 WHEN "Warrent Officer" THEN 8 WHEN "Sergent" THEN 9 WHEN "Corporal" THEN 10 WHEN "Lance Corporal" THEN 11 WHEN "Sainik" THEN 12 ELSE 13 END, army_number ASC
  `).all();

  const existingRecords = db.prepare('SELECT * FROM games_records WHERE date = ?').all(date);
  const recordMap: Record<string, any> = {};
  existingRecords.forEach((r: any) => {
    recordMap[r.personnel_id] = r;
  });

  const sheet = presentPersonnel.map((p: any) => {
    const rec = recordMap[p.id];
    return {
      personnelId: p.id,
      armyNumber: p.army_number,
      rank: p.rank,
      name: p.name,
      trade: p.trade,
      appointment: p.appointment,
      currentStatus: p.current_status,
      status: rec ? rec.status : 'PRESENT',
      remarks: rec ? rec.remarks : '',
      isEligible: true,
    };
  });

  // Check for any soldiers previously recorded who became ineligible
  const nonPresentWithRecords: any[] = [];
  existingRecords.forEach((rec: any) => {
    const p: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(rec.personnel_id);
    if (p && p.current_status !== 'PRESENT') {
      nonPresentWithRecords.push({
        personnelId: p.id,
        armyNumber: p.army_number,
        rank: p.rank,
        name: p.name,
        trade: p.trade,
        appointment: p.appointment,
        currentStatus: p.current_status,
        status: rec.status,
        remarks: rec.remarks,
        isEligible: false,
        warning: `Personnel is no longer eligible for Games (Status: ${p.current_status} - ${p.status_reason || 'Away'})`,
      });
    }
  });

  // Calculate daily summary
  const total = sheet.length;
  const presentCount = sheet.filter((s) => s.status === 'PRESENT').length;
  const excusedDutyCount = sheet.filter((s) => s.status === 'EXCUSED_DUTY').length;
  const excusedMedCount = sheet.filter((s) => s.status === 'EXCUSED_MEDICAL').length;
  const absentCount = sheet.filter((s) => s.status === 'ABSENT').length;
  const participationPct = total > 0 ? Math.round((presentCount / total) * 100) : 100;

  return res.json({
    date,
    sheet,
    nonPresentWithRecords,
    summary: {
      totalEligible: total,
      presentCount,
      excusedDutyCount,
      excusedMedCount,
      absentCount,
      participationPct,
    },
  });
});

// 2. Batch Save Daily Games Attendance
gamesRouter.post('/daily-sheet', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const { date, records } = req.body;

  if (!date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Date and records array are required.' });
  }

  const now = new Date().toISOString();
  const createdBy = req.user?.appointment || 'DUTY_OFFICER';

  // Delete previous records for this date and re-insert
  db.prepare('DELETE FROM games_records WHERE date = ?').run(date);

  let savedCount = 0;
  records.forEach((r: any) => {
    // Ensure soldier is currently active and PRESENT
    const p: any = db.prepare('SELECT current_status FROM personnel WHERE id = ?').get(r.personnelId);
    if (!p || p.current_status !== 'PRESENT') return;

    const id = `games_${date}_${r.personnelId}`;
    db.prepare(`
      INSERT INTO games_records (id, date, personnel_id, status, remarks, created_at, updated_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, date, r.personnelId, r.status || 'PRESENT', r.remarks || null, now, now, createdBy);
    savedCount++;
  });

  logAudit(req, 'SAVE_GAMES_ATTENDANCE', 'GAMES', undefined, `Saved Games attendance for ${savedCount} present soldiers on ${date}`);

  return res.json({ message: `Logged Games attendance for ${savedCount} personnel on ${date}.` });
});

// 3. Games Analytics
gamesRouter.get('/analytics', authenticateUser, (req, res) => {
  const activePersonnel = db.prepare('SELECT * FROM personnel WHERE is_active = 1').all();
  const now = new Date();

  const getUnitAttendanceRate = (days: number) => {
    const dStr = subDays(now, days).toISOString().split('T')[0];
    const records = db.prepare('SELECT * FROM games_records WHERE date >= ?').all(dStr);
    const total = records.length;
    const attended = records.filter((r) => r.status === 'PRESENT').length;
    const excused = records.filter((r) => r.status === 'EXCUSED_DUTY' || r.status === 'EXCUSED_MEDICAL').length;
    const eligible = total - excused;
    return eligible > 0 ? Math.round((attended / eligible) * 100) : 100;
  };

  const personnelRankings = activePersonnel.map((p: any) => {
    const dStr = subDays(now, 30).toISOString().split('T')[0];
    const recs = db.prepare('SELECT * FROM games_records WHERE personnel_id = ? AND date >= ?').all(p.id, dStr);
    const total = recs.length;
    const attended = recs.filter((r) => r.status === 'PRESENT').length;
    const excused = recs.filter((r) => r.status === 'EXCUSED_DUTY' || r.status === 'EXCUSED_MEDICAL').length;
    const eligible = total - excused;
    const pct = eligible > 0 ? Math.round((attended / eligible) * 100) : 100;
    return {
      id: p.id,
      armyNumber: p.army_number,
      rank: p.rank,
      name: p.name,
      trade: p.trade,
      currentStatus: p.current_status,
      monthlySessions: total,
      attended,
      percentage: pct,
    };
  }).sort((a, b) => b.percentage - a.percentage);

  return res.json({
    weeklyRate: getUnitAttendanceRate(7),
    monthlyRate: getUnitAttendanceRate(30),
    yearlyRate: getUnitAttendanceRate(365),
    topPerformers: personnelRankings.slice(0, 5),
    needsAttention: personnelRankings.filter((p) => p.percentage < 75).slice(0, 5),
  });
});
