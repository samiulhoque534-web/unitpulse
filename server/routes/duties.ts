import { Router } from 'express';
import { db } from '../db';
import { authenticateUser, requirePermission, logAudit, AuthRequest } from '../auth';
import { format, addDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export const dutyRouter = Router();

// Helper: Calculate duration in hours
function calculateDurationHours(startTime: string, endTime: string): number {
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);

  let startMinutes = sH * 60 + sM;
  let endMinutes = eH * 60 + eM;

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return Math.round(((endMinutes - startMinutes) / 60) * 10) / 10;
}

// Helper: Calculate Night Duty Hours (22:00 to 06:00)
function calculateNightDuty(startTime: string, endTime: string): { isNightDuty: boolean; nightDutyHours: number } {
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);

  let sMin = sH * 60 + sM;
  let eMin = eH * 60 + eM;

  if (eMin <= sMin) {
    eMin += 24 * 60;
  }

  let nightMinutes = 0;

  for (let m = sMin; m < eMin; m++) {
    const modMin = m % 1440;
    // 22:00 is 1320 min; 06:00 is 360 min
    if (modMin >= 1320 || modMin < 360) {
      nightMinutes++;
    }
  }

  const nightHours = Math.round((nightMinutes / 60) * 10) / 10;
  return {
    isNightDuty: nightHours > 0,
    nightDutyHours: nightHours,
  };
}

// Helper: Check if two time intervals overlap
function isTimeOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const [s1H, s1M] = s1.split(':').map(Number);
  let [e1H, e1M] = e1.split(':').map(Number);
  let start1 = s1H * 60 + s1M;
  let end1 = e1H * 60 + e1M;
  if (end1 <= start1) end1 += 1440;

  const [s2H, s2M] = s2.split(':').map(Number);
  let [e2H, e2M] = e2.split(':').map(Number);
  let start2 = s2H * 60 + s2M;
  let end2 = e2H * 60 + e2M;
  if (end2 <= start2) end2 += 1440;

  return Math.max(start1, start2) < Math.min(end1, end2);
}

// Helper: Compute automatic Active Status against live clock
export function computeDutyActiveStatus(dutyDate: string, startTime: string, endTime: string): 'UPCOMING' | 'ON_DUTY' | 'COMPLETED' {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (dutyDate > todayStr) return 'UPCOMING';
  if (dutyDate < todayStr) return 'COMPLETED';

  const [sH, sM] = startTime.split(':').map(Number);
  let [eH, eM] = endTime.split(':').map(Number);
  let startMin = sH * 60 + sM;
  let endMin = eH * 60 + eM;

  if (endMin <= startMin) {
    if (currentMinutes >= startMin || currentMinutes < eH * 60 + eM) {
      return 'ON_DUTY';
    }
    if (currentMinutes < startMin && currentMinutes >= eH * 60 + eM) {
      return 'UPCOMING';
    }
    return 'COMPLETED';
  } else {
    if (currentMinutes < startMin) return 'UPCOMING';
    if (currentMinutes >= startMin && currentMinutes < endMin) return 'ON_DUTY';
    return 'COMPLETED';
  }
}

// 1. Get Duty Roster
dutyRouter.get('/roster', authenticateUser, (req, res) => {
  const { date, startDate, endDate, dutyType, personnelId, search } = req.query;

  let query = `
    SELECT d.*, p.army_number, p.rank, p.name, p.trade, p.current_status
    FROM duties d
    JOIN personnel p ON d.personnel_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (date) {
    query += ' AND d.date = ?';
    params.push(date);
  } else if (startDate && endDate) {
    query += ' AND d.date >= ? AND d.date <= ?';
    params.push(startDate, endDate);
  }

  if (dutyType) {
    query += ' AND d.duty_type = ?';
    params.push(dutyType);
  }

  if (personnelId) {
    query += ' AND d.personnel_id = ?';
    params.push(personnelId);
  }

  if (search) {
    query += ' AND (p.army_number LIKE ? OR p.name LIKE ? OR d.location LIKE ? OR d.duty_role LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY d.date DESC, d.start_time ASC';

  const rows = db.prepare(query).all(...params);

  const duties = rows.map((r: any) => ({
    id: r.id,
    date: r.date,
    personnelId: r.personnel_id,
    dutyType: r.duty_type,
    dutyRole: r.duty_role || (r.duty_type === 'Kote Duty' || r.duty_type === 'RP Duty' ? 'Guard' : r.duty_type),
    shiftName: r.shift_name || 'General',
    koteCycle: r.kote_cycle,
    koteGroup: r.kote_group,
    location: r.location,
    startTime: r.start_time,
    endTime: r.end_time,
    durationHours: r.duration_hours,
    isNightDuty: Boolean(r.is_night_duty),
    nightDutyHours: r.night_duty_hours,
    remarks: r.remarks,
    activeStatus: computeDutyActiveStatus(r.date, r.start_time, r.end_time),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    armyNumber: r.army_number,
    rank: r.rank,
    name: r.name,
    trade: r.trade,
    currentStatus: r.current_status,
  }));

  return res.json({ duties });
});

// 2. KOTE DUTY: 12-Hour Cycle with 3 Rotating Relief Groups (2h duty / 4h rest / 2h duty / 4h rest)
// Full 12-hour continuous coverage:
// Night Cycle (1800-0600):
// - Group 1: 18:00-20:00 & 00:00-02:00 (Rest: 20:00-00:00 & 02:00-06:00)
// - Group 2: 20:00-22:00 & 02:00-04:00 (Rest: 22:00-02:00 & 04:00-08:00)
// - Group 3: 22:00-00:00 & 04:00-06:00 (Rest: 00:00-04:00 & 06:00-10:00)
// Day Cycle (0600-1800):
// - Group 1: 06:00-08:00 & 12:00-14:00 (Rest: 08:00-12:00 & 14:00-18:00)
// - Group 2: 08:00-10:00 & 14:00-16:00 (Rest: 10:00-14:00 & 16:00-20:00)
// - Group 3: 10:00-12:00 & 16:00-18:00 (Rest: 12:00-16:00 & 18:00-22:00)
dutyRouter.post('/kote-cycle', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const { date, cycle, groups, groupNumber, guardCommanderId, guardId, location } = req.body;

  if (!date || !cycle) {
    return res.status(400).json({ error: 'Date and Cycle (NIGHT_18_06 or DAY_06_18) are required.' });
  }

  const now = new Date().toISOString();
  const createdBy = req.user?.appointment || 'DUTY_OFFICER';
  const loc = location || 'Main Armory / Kote';
  const warnings: string[] = [];

  // Determine group list to insert
  let groupList: Array<{ groupNum: number; gcId: string; gdId: string }> = [];

  if (Array.isArray(groups) && groups.length > 0) {
    groups.forEach((g: any, idx: number) => {
      if (g.guardCommanderId && g.guardId) {
        groupList.push({
          groupNum: g.groupNumber || idx + 1,
          gcId: g.guardCommanderId,
          gdId: g.guardId,
        });
      }
    });
  } else if (guardCommanderId && guardId) {
    groupList.push({
      groupNum: groupNumber || 1,
      gcId: guardCommanderId,
      gdId: guardId,
    });
  }

  if (groupList.length === 0) {
    return res.status(400).json({ error: 'At least one group with Guard Commander and Guard must be selected.' });
  }

  // Define timetable schedules for each group in each cycle
  const scheduleMap: Record<string, Record<number, Array<{ start: string; end: string; night: number; nightHrs: number }>>> = {
    NIGHT_18_06: {
      1: [
        { start: '18:00', end: '20:00', night: 0, nightHrs: 0 },
        { start: '00:00', end: '02:00', night: 1, nightHrs: 2 },
      ],
      2: [
        { start: '20:00', end: '22:00', night: 0, nightHrs: 0 },
        { start: '02:00', end: '04:00', night: 1, nightHrs: 2 },
      ],
      3: [
        { start: '22:00', end: '00:00', night: 1, nightHrs: 2 },
        { start: '04:00', end: '06:00', night: 1, nightHrs: 2 },
      ],
    },
    DAY_06_18: {
      1: [
        { start: '06:00', end: '08:00', night: 0, nightHrs: 0 },
        { start: '12:00', end: '14:00', night: 0, nightHrs: 0 },
      ],
      2: [
        { start: '08:00', end: '10:00', night: 0, nightHrs: 0 },
        { start: '14:00', end: '16:00', night: 0, nightHrs: 0 },
      ],
      3: [
        { start: '10:00', end: '12:00', night: 0, nightHrs: 0 },
        { start: '16:00', end: '18:00', night: 0, nightHrs: 0 },
      ],
    },
  };

  let totalDutyRecordsCreated = 0;

  groupList.forEach((grp) => {
    const gc: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(grp.gcId);
    const gd: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(grp.gdId);

    if (!gc || !gd) return;

    if (gc.current_status !== 'PRESENT') {
      warnings.push(`Warning: Group ${grp.groupNum} GC ${gc.rank} ${gc.name} is currently ${gc.current_status}.`);
    }
    if (gd.current_status !== 'PRESENT') {
      warnings.push(`Warning: Group ${grp.groupNum} Guard ${gd.rank} ${gd.name} is currently ${gd.current_status}.`);
    }

    // Delete existing records for this specific cycle, group, and date
    db.prepare('DELETE FROM duties WHERE date = ? AND duty_type = "Kote Duty" AND kote_cycle = ? AND kote_group = ?').run(
      date,
      cycle,
      grp.groupNum
    );

    const shiftLabel = `${cycle === 'NIGHT_18_06' ? 'Night Cycle' : 'Day Cycle'} (Group ${grp.groupNum})`;
    const periods = scheduleMap[cycle]?.[grp.groupNum] || scheduleMap[cycle][1];

    periods.forEach((p, pIdx) => {
      // Guard Commander Record
      db.prepare(`
        INSERT INTO duties (id, date, personnel_id, duty_type, duty_role, shift_name, kote_cycle, kote_group, location, start_time, end_time, duration_hours, is_night_duty, night_duty_hours, remarks, created_at, updated_at, created_by)
        VALUES (?, ?, ?, 'Kote Duty', 'Guard Commander', ?, ?, ?, ?, ?, ?, 2, ?, ?, ?, ?, ?, ?)
      `).run(
        `kote_${Date.now()}_g${grp.groupNum}_gc_${pIdx}_${Math.random().toString(36).substr(2, 3)}`,
        date,
        gc.id,
        shiftLabel,
        cycle,
        grp.groupNum,
        loc,
        p.start,
        p.end,
        p.night,
        p.nightHrs,
        `Kote Group ${grp.groupNum} (${p.start}-${p.end})`,
        now,
        now,
        createdBy
      );
      totalDutyRecordsCreated++;

      // Guard Record
      db.prepare(`
        INSERT INTO duties (id, date, personnel_id, duty_type, duty_role, shift_name, kote_cycle, kote_group, location, start_time, end_time, duration_hours, is_night_duty, night_duty_hours, remarks, created_at, updated_at, created_by)
        VALUES (?, ?, ?, 'Kote Duty', 'Guard', ?, ?, ?, ?, ?, ?, 2, ?, ?, ?, ?, ?, ?)
      `).run(
        `kote_${Date.now()}_g${grp.groupNum}_gd_${pIdx}_${Math.random().toString(36).substr(2, 3)}`,
        date,
        gd.id,
        shiftLabel,
        cycle,
        grp.groupNum,
        loc,
        p.start,
        p.end,
        p.night,
        p.nightHrs,
        `Kote Group ${grp.groupNum} (${p.start}-${p.end})`,
        now,
        now,
        createdBy
      );
      totalDutyRecordsCreated++;
    });

    logAudit(req, 'ASSIGN_KOTE_CYCLE', 'DUTY', `${date}_${cycle}_G${grp.groupNum}`, `Assigned Kote ${cycle} Group ${grp.groupNum} to GC: ${gc.rank} ${gc.name} & Guard: ${gd.rank} ${gd.name}`);
  });

  return res.status(201).json({
    message: `Kote ${cycle === 'NIGHT_18_06' ? 'Night Cycle (18:00-06:00)' : 'Day Cycle (06:00-18:00)'} rotating schedule updated (${totalDutyRecordsCreated} duty segments created, 4h active duty per soldier).`,
    warnings,
  });
});

// 3. Get Structured Kote Cycles for a Date (3 Relief Groups each for Night & Day Cycles)
dutyRouter.get('/kote-cycles', authenticateUser, (req, res) => {
  const date = (req.query.date as string) || format(new Date(), 'yyyy-MM-dd');

  const rows = db.prepare(`
    SELECT d.*, p.army_number, p.rank, p.name, p.trade
    FROM duties d
    JOIN personnel p ON d.personnel_id = p.id
    WHERE d.date = ? AND d.duty_type = 'Kote Duty'
  `).all(date);

  const getGroupSummary = (cycle: 'NIGHT_18_06' | 'DAY_06_18', groupNum: 1 | 2 | 3): any => {
    let groupRows = rows.filter((r: any) => {
      const matchCycle = r.kote_cycle === cycle || (cycle === 'NIGHT_18_06' ? r.shift_name?.includes('Night') : r.shift_name?.includes('Day'));
      const matchGrp = r.kote_group === groupNum || r.shift_name?.includes(`Group ${groupNum}`);
      return matchCycle && matchGrp;
    });

    // Fallback detection based on start times if kote_group wasn't stamped
    if (groupRows.length === 0) {
      if (cycle === 'NIGHT_18_06') {
        if (groupNum === 1) groupRows = rows.filter((r: any) => r.start_time === '18:00' || r.start_time === '00:00');
        if (groupNum === 2) groupRows = rows.filter((r: any) => r.start_time === '20:00' || r.start_time === '02:00');
        if (groupNum === 3) groupRows = rows.filter((r: any) => r.start_time === '22:00' || r.start_time === '04:00');
      } else {
        if (groupNum === 1) groupRows = rows.filter((r: any) => r.start_time === '06:00' || r.start_time === '12:00');
        if (groupNum === 2) groupRows = rows.filter((r: any) => r.start_time === '08:00' || r.start_time === '14:00');
        if (groupNum === 3) groupRows = rows.filter((r: any) => r.start_time === '10:00' || r.start_time === '16:00');
      }
    }

    const gc = groupRows.find((r: any) => r.duty_role === 'Guard Commander');
    const gd = groupRows.find((r: any) => r.duty_role === 'Guard');

    const dutyIntervals =
      cycle === 'NIGHT_18_06'
        ? groupNum === 1
          ? ['18:00–20:00', '00:00–02:00']
          : groupNum === 2
          ? ['20:00–22:00', '02:00–04:00']
          : ['22:00–00:00', '04:00–06:00']
        : groupNum === 1
        ? ['06:00–08:00', '12:00–14:00']
        : groupNum === 2
        ? ['08:00–10:00', '14:00–16:00']
        : ['10:00–12:00', '16:00–18:00'];

    const restIntervals =
      cycle === 'NIGHT_18_06'
        ? groupNum === 1
          ? ['20:00–00:00', '02:00–06:00']
          : groupNum === 2
          ? ['22:00–02:00', '04:00–08:00']
          : ['00:00–04:00', '06:00–10:00']
        : groupNum === 1
        ? ['08:00–12:00', '14:00–18:00']
        : groupNum === 2
        ? ['10:00–14:00', '16:00–20:00']
        : ['12:00–16:00', '18:00–22:00'];

    return {
      groupNumber: groupNum,
      groupLabel: `Group ${groupNum}`,
      guardCommander: gc ? { id: gc.personnel_id, armyNumber: gc.army_number, rank: gc.rank, name: gc.name, trade: gc.trade } : undefined,
      guard: gd ? { id: gd.personnel_id, armyNumber: gd.army_number, rank: gd.rank, name: gd.name, trade: gd.trade } : undefined,
      dutyIntervals,
      restIntervals,
      activeHours: 4,
      restHours: 8,
    };
  };

  const nightGroups = [getGroupSummary('NIGHT_18_06', 1), getGroupSummary('NIGHT_18_06', 2), getGroupSummary('NIGHT_18_06', 3)];
  const dayGroups = [getGroupSummary('DAY_06_18', 1), getGroupSummary('DAY_06_18', 2), getGroupSummary('DAY_06_18', 3)];

  const nightSummary = {
    cycle: 'NIGHT_18_06',
    cycleLabel: 'NIGHT CYCLE',
    cycleTime: '18:00–06:00',
    groups: nightGroups,
    totalActiveHours: 12, // 4h x 3 groups
  };

  const daySummary = {
    cycle: 'DAY_06_18',
    cycleLabel: 'DAY CYCLE',
    cycleTime: '06:00–18:00',
    groups: dayGroups,
    totalActiveHours: 12, // 4h x 3 groups
  };

  return res.json({
    date,
    nightCycle: nightSummary,
    dayCycle: daySummary,
  });
});

// 4. RP DUTY: 24-Hour Timeline Builder (Configurable slots, variable Guard Commanders & Guards)
dutyRouter.post('/rp-timeline', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const { date, slots } = req.body;

  if (!date || !Array.isArray(slots) || slots.length === 0) {
    return res.status(400).json({ error: 'Date and at least one time slot are required for RP timeline.' });
  }

  const now = new Date().toISOString();
  const createdBy = req.user?.appointment || 'DUTY_OFFICER';

  // Delete existing RP duties for this date before applying fresh timeline
  db.prepare('DELETE FROM duties WHERE date = ? AND duty_type = "RP Duty"').run(date);

  let createdCount = 0;
  const warnings: string[] = [];

  slots.forEach((slot: any, slotIdx: number) => {
    const startTime = slot.startTime;
    const endTime = slot.endTime;
    const location = slot.location || 'Main Regimental Gate Post';
    const remarks = slot.remarks || `RP Shift (${startTime}-${endTime})`;
    const durationHours = calculateDurationHours(startTime, endTime);
    const { isNightDuty, nightDutyHours } = calculateNightDuty(startTime, endTime);

    // Assign Guard Commanders
    if (Array.isArray(slot.guardCommanders)) {
      slot.guardCommanders.forEach((pId: string, idx: number) => {
        if (!pId) return;
        const p: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(pId);
        if (p) {
          if (p.current_status !== 'PRESENT') {
            warnings.push(`Warning: ${p.rank} ${p.name} assigned as GC is currently ${p.current_status}.`);
          }
          const id = `rp_${Date.now()}_gc_${slotIdx}_${idx}`;
          db.prepare(`
            INSERT INTO duties (id, date, personnel_id, duty_type, duty_role, shift_name, location, start_time, end_time, duration_hours, is_night_duty, night_duty_hours, remarks, created_at, updated_at, created_by)
            VALUES (?, ?, ?, 'RP Duty', 'Guard Commander', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, date, p.id, `RP ${startTime}-${endTime}`, location, startTime, endTime, durationHours, isNightDuty ? 1 : 0, nightDutyHours, remarks, now, now, createdBy);
          createdCount++;
        }
      });
    }

    // Assign Guards
    if (Array.isArray(slot.guards)) {
      slot.guards.forEach((pId: string, idx: number) => {
        if (!pId) return;
        const p: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(pId);
        if (p) {
          if (p.current_status !== 'PRESENT') {
            warnings.push(`Warning: ${p.rank} ${p.name} assigned as Guard is currently ${p.current_status}.`);
          }
          const id = `rp_${Date.now()}_gd_${slotIdx}_${idx}`;
          db.prepare(`
            INSERT INTO duties (id, date, personnel_id, duty_type, duty_role, shift_name, location, start_time, end_time, duration_hours, is_night_duty, night_duty_hours, remarks, created_at, updated_at, created_by)
            VALUES (?, ?, ?, 'RP Duty', 'Guard', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, date, p.id, `RP ${startTime}-${endTime}`, location, startTime, endTime, durationHours, isNightDuty ? 1 : 0, nightDutyHours, remarks, now, now, createdBy);
          createdCount++;
        }
      });
    }
  });

  logAudit(req, 'ASSIGN_RP_TIMELINE', 'DUTY', date, `Saved RP 24-Hour Timeline (${createdCount} personnel details) on ${date}`);

  return res.status(201).json({
    message: `RP 24-Hour Timeline saved successfully with ${createdCount} personnel assignments.`,
    createdCount,
    warnings,
  });
});

// 5. Get Upcoming Duties
dutyRouter.get('/upcoming', authenticateUser, (req, res) => {
  const filter = (req.query.filter as string) || 'next7';
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  let maxDate = format(addDays(now, 7), 'yyyy-MM-dd');
  let minDate = todayStr;

  if (filter === 'today') {
    maxDate = todayStr;
  } else if (filter === 'tomorrow') {
    minDate = format(addDays(now, 1), 'yyyy-MM-dd');
    maxDate = minDate;
  } else if (filter === 'next30') {
    maxDate = format(addDays(now, 30), 'yyyy-MM-dd');
  }

  const rows = db.prepare(`
    SELECT d.*, p.army_number, p.rank, p.name, p.trade, p.current_status
    FROM duties d
    JOIN personnel p ON d.personnel_id = p.id
    WHERE d.date >= ? AND d.date <= ?
    ORDER BY d.date ASC, d.start_time ASC
  `).all(minDate, maxDate);

  const upcomingDuties = rows.map((r: any) => ({
    id: r.id,
    date: r.date,
    personnelId: r.personnel_id,
    dutyType: r.duty_type,
    dutyRole: r.duty_role || (r.duty_type === 'Kote Duty' || r.duty_type === 'RP Duty' ? 'Guard' : r.duty_type),
    shiftName: r.shift_name || 'General',
    koteCycle: r.kote_cycle,
    koteGroup: r.kote_group,
    location: r.location,
    startTime: r.start_time,
    endTime: r.end_time,
    durationHours: r.duration_hours,
    isNightDuty: Boolean(r.is_night_duty),
    nightDutyHours: r.night_duty_hours,
    remarks: r.remarks,
    activeStatus: computeDutyActiveStatus(r.date, r.start_time, r.end_time),
    armyNumber: r.army_number,
    rank: r.rank,
    name: r.name,
    trade: r.trade,
    currentStatus: r.current_status,
  }));

  return res.json({ upcomingDuties, filter, total: upcomingDuties.length });
});

// 6. Get Monthly Calendar
dutyRouter.get('/calendar', authenticateUser, (req, res) => {
  const monthParam = (req.query.month as string) || format(new Date(), 'yyyy-MM');

  const startDate = `${monthParam}-01`;
  const endDate = `${monthParam}-31`;

  const rows = db.prepare(`
    SELECT d.*, p.army_number, p.rank, p.name, p.trade, p.current_status
    FROM duties d
    JOIN personnel p ON d.personnel_id = p.id
    WHERE d.date >= ? AND d.date <= ?
    ORDER BY d.date ASC, d.start_time ASC
  `).all(startDate, endDate);

  const dateMap: Record<string, any[]> = {};
  rows.forEach((r: any) => {
    if (!dateMap[r.date]) {
      dateMap[r.date] = [];
    }
    dateMap[r.date].push({
      id: r.id,
      date: r.date,
      personnelId: r.personnel_id,
      dutyType: r.duty_type,
      dutyRole: r.duty_role || (r.duty_type === 'Kote Duty' || r.duty_type === 'RP Duty' ? 'Guard' : r.duty_type),
      shiftName: r.shift_name || 'General',
      koteCycle: r.kote_cycle,
      koteGroup: r.kote_group,
      location: r.location,
      startTime: r.start_time,
      endTime: r.end_time,
      durationHours: r.duration_hours,
      isNightDuty: Boolean(r.is_night_duty),
      nightDutyHours: r.night_duty_hours,
      activeStatus: computeDutyActiveStatus(r.date, r.start_time, r.end_time),
      armyNumber: r.army_number,
      rank: r.rank,
      name: r.name,
      trade: r.trade,
      currentStatus: r.current_status,
    });
  });

  return res.json({ month: monthParam, dateMap, totalDuties: rows.length });
});

// 7. Get Currently On Duty
dutyRouter.get('/currently-on-duty', authenticateUser, (req, res) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const rows = db.prepare(`
    SELECT d.*, p.army_number, p.rank, p.name, p.trade, p.current_status
    FROM duties d
    JOIN personnel p ON d.personnel_id = p.id
    WHERE d.date = ?
    ORDER BY d.start_time ASC
  `).all(todayStr);

  const onDutyPersonnel = rows
    .map((r: any) => ({
      id: r.id,
      date: r.date,
      personnelId: r.personnel_id,
      dutyType: r.duty_type,
      dutyRole: r.duty_role || r.duty_type,
      shiftName: r.shift_name || 'General',
      koteCycle: r.kote_cycle,
      koteGroup: r.kote_group,
      location: r.location,
      startTime: r.start_time,
      endTime: r.end_time,
      durationHours: r.duration_hours,
      isNightDuty: Boolean(r.is_night_duty),
      nightDutyHours: r.night_duty_hours,
      activeStatus: computeDutyActiveStatus(r.date, r.start_time, r.end_time),
      armyNumber: r.army_number,
      rank: r.rank,
      name: r.name,
      trade: r.trade,
      currentStatus: r.current_status,
    }))
    .filter((d: any) => d.activeStatus === 'ON_DUTY');

  return res.json({ onDutyPersonnel, total: onDutyPersonnel.length });
});

// 8. Assign Single Duty
dutyRouter.post('/', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const { date, personnelId, dutyType, dutyRole, shiftName, location, startTime, endTime, remarks } = req.body;

  if (!date || !personnelId || !dutyType || !startTime || !endTime) {
    return res.status(400).json({ error: 'Date, Personnel, Duty Type, Start Time, and End Time are required.' });
  }

  const soldier: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(personnelId);
  if (!soldier) {
    return res.status(404).json({ error: 'Personnel record not found.' });
  }

  let availabilityWarning = null;
  if (soldier.current_status !== 'PRESENT') {
    availabilityWarning = `Warning: ${soldier.rank} ${soldier.name} is currently ${soldier.current_status} (${soldier.status_reason || 'Unavailable'}).`;
  }

  // Check for time overlap on the same date
  const existingDuties = db.prepare('SELECT * FROM duties WHERE personnel_id = ? AND date = ?').all(personnelId, date);
  let hasOverlap = false;
  let overlapDutyName = '';

  for (const existing of existingDuties) {
    if (isTimeOverlap(startTime, endTime, existing.start_time, existing.end_time)) {
      hasOverlap = true;
      overlapDutyName = `${existing.duty_type} (${existing.start_time}-${existing.end_time})`;
      break;
    }
  }

  const durationHours = calculateDurationHours(startTime, endTime);
  const { isNightDuty, nightDutyHours } = calculateNightDuty(startTime, endTime);

  const id = `duty_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();
  const createdBy = req.user?.appointment || 'DUTY_OFFICER';

  db.prepare(`
    INSERT INTO duties (id, date, personnel_id, duty_type, duty_role, shift_name, location, start_time, end_time, duration_hours, is_night_duty, night_duty_hours, remarks, created_at, updated_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    date,
    personnelId,
    dutyType,
    dutyRole || (dutyType === 'Kote Duty' || dutyType === 'RP Duty' ? 'Guard' : dutyType),
    shiftName || 'General',
    location || 'Unit Grounds',
    startTime,
    endTime,
    durationHours,
    isNightDuty ? 1 : 0,
    nightDutyHours,
    remarks || null,
    now,
    now,
    createdBy
  );

  logAudit(req, 'ASSIGN_DUTY', 'DUTY', id, `Assigned ${dutyType} (${dutyRole || ''} ${startTime}-${endTime}) to ${soldier.rank} ${soldier.name} on ${date}`);

  return res.status(201).json({
    message: hasOverlap
      ? `Duty assigned with advisory warning: Overlaps in time with existing ${overlapDutyName}.`
      : 'Duty assigned successfully.',
    id,
    hasOverlap,
    overlapWarning: hasOverlap ? `Time interval overlaps with ${overlapDutyName}` : null,
    availabilityWarning,
  });
});

// 9. Batch Assign Duties
dutyRouter.post('/batch', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const { date, duties: dutyList } = req.body;

  if (!date || !Array.isArray(dutyList) || dutyList.length === 0) {
    return res.status(400).json({ error: 'Date and a non-empty duties array are required.' });
  }

  const now = new Date().toISOString();
  const createdBy = req.user?.appointment || 'DUTY_OFFICER';
  let createdCount = 0;

  for (const item of dutyList) {
    if (!item.personnelId || !item.dutyType || !item.startTime || !item.endTime) continue;

    const durationHours = calculateDurationHours(item.startTime, item.endTime);
    const { isNightDuty, nightDutyHours } = calculateNightDuty(item.startTime, item.endTime);
    const id = `duty_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${createdCount}`;

    db.prepare(`
      INSERT INTO duties (id, date, personnel_id, duty_type, duty_role, shift_name, location, start_time, end_time, duration_hours, is_night_duty, night_duty_hours, remarks, created_at, updated_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      date,
      item.personnelId,
      item.dutyType,
      item.dutyRole || item.dutyType,
      item.shiftName || 'General',
      item.location || 'Unit Lines',
      item.startTime,
      item.endTime,
      durationHours,
      isNightDuty ? 1 : 0,
      nightDutyHours,
      item.remarks || null,
      now,
      now,
      createdBy
    );
    createdCount++;
  }

  logAudit(req, 'ASSIGN_ROSTER_BATCH', 'DUTY', date, `Batch assigned ${createdCount} duty details on ${date}`);

  return res.status(201).json({
    message: `Successfully assigned ${createdCount} duty details for ${date}.`,
    createdCount,
  });
});

// 10. Delete Duty
dutyRouter.delete('/:id', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const d: any = db.prepare('SELECT * FROM duties WHERE id = ?').get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Duty record not found.' });

  db.prepare('DELETE FROM duties WHERE id = ?').run(d.id);
  logAudit(req, 'DELETE_DUTY', 'DUTY', d.id, `Removed duty on ${d.date}`);

  return res.json({ message: 'Duty detail deleted successfully.' });
});
