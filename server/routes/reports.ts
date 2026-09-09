import { Router } from 'express';
import { db } from '../db';
import { authenticateUser } from '../auth';
import { format, subDays, addDays, parseISO, differenceInDays } from 'date-fns';
import { TRADES, DEFAULT_TRADE_AUTHORIZED, getRankPLeaveLimit } from '../../src/utils/constants';
import { computeDutyActiveStatus } from './duties';
import { getTradeAuthorizedMap } from './manpower';
import { syncLeaveStatusWithPersonnel } from './leave';

export const reportsRouter = Router();

// GET /api/reports/generate?reportType=...
reportsRouter.get('/generate', authenticateUser, (req, res) => {
  syncLeaveStatusWithPersonnel();
  const reportType = (req.query.reportType as string) || '1_DAILY_MANPOWER';
  const reportDate = (req.query.date as string) || format(new Date(), 'yyyy-MM-dd');
  const selectedYear = parseInt((req.query.year as string) || String(parseISO(reportDate).getFullYear()), 10);
  const selectedMonth = (req.query.month as string) || format(parseISO(reportDate), 'yyyy-MM');
  const personnelId = req.query.personnelId as string;
  const dutyTypeFilter = req.query.dutyType as string;
  const leaveTypeFilter = req.query.leaveType as string;
  const tradeFilter = req.query.trade as string;

  const now = new Date();
  const nowStr = format(now, 'dd MMM yyyy HH:mm');
  const refNo = `55FA/ADMIN/REP/${now.getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

  // Fetch configured Authorized Manpower
  const authSetting: any = db.prepare('SELECT value FROM settings WHERE key = "authorized_manpower"').get();
  const authorizedStrength = authSetting ? parseInt(authSetting.value, 10) : 120;

  const metadata = {
    unitName: '55 FIELD AMBULANCE',
    unitSubtitle: '55 Fd Amb (10 Inf Div)',
    formation: '10 INFANTRY DIVISION',
    location: 'RAMU CANTONMENT',
    referenceNo: refNo,
    generatedAt: nowStr,
    reportDate,
    generatedBy: (req as any).user?.displayName || (req as any).user?.appointment || 'Duty Officer',
    authorizedStrength,
  };

  let reportTitle = '';
  let data: any = {};

  const allActivePersonnel = db.prepare(`
    SELECT * FROM personnel
    WHERE is_active = 1
    ORDER BY CASE rank
      WHEN 'Lieutenant Colonel' THEN 1
      WHEN 'Major' THEN 2
      WHEN 'Captain' THEN 3
      WHEN 'Lieutenant' THEN 4
      WHEN '2Lieutenant' THEN 5
      WHEN 'Master Warrent Officer' THEN 6
      WHEN 'Senior Warrent Officer' THEN 7
      WHEN 'Warrent Officer' THEN 8
      WHEN 'Sergent' THEN 9
      WHEN 'Corporal' THEN 10
      WHEN 'Lance Corporal' THEN 11
      WHEN 'Sainik' THEN 12
      WHEN 'NC(E)' THEN 13
      WHEN 'Civil' THEN 14
      ELSE 15 END, army_number ASC
  `).all();

  switch (reportType) {
    case '1_DAILY_MANPOWER': {
      reportTitle = 'DAILY MANPOWER REPORT (PARADE STATE)';
      const held = allActivePersonnel.length;
      const present = allActivePersonnel.filter((p) => p.current_status === 'PRESENT').length;
      const tyDuty = allActivePersonnel.filter((p) => p.current_status === 'TY_DUTY').length;
      const attachment = allActivePersonnel.filter((p) => p.current_status === 'ATTACHMENT').length;
      const leave = allActivePersonnel.filter((p) => p.current_status === 'LEAVE').length;
      const course = allActivePersonnel.filter((p) => p.current_status === 'COURSE').length;
      const hospital = allActivePersonnel.filter((p) => p.current_status === 'HOSPITAL').length;
      const other = allActivePersonnel.filter((p) => p.current_status === 'OTHER').length;

      const absent = held - present;
      const surplus = Math.max(0, held - authorizedStrength);
      const percentage = authorizedStrength > 0 ? Math.round((held / authorizedStrength) * 100) : 0;

      let pList = allActivePersonnel;
      if (tradeFilter) {
        pList = pList.filter((p) => p.trade === tradeFilter);
      }

      data = {
        statusCounts: {
          authorized: authorizedStrength,
          held,
          present,
          absent,
          surplus,
          percentage,
          tyDuty,
          attachment,
          leave,
          course,
          hospital,
          other,
          shortageHeld: Math.max(0, authorizedStrength - held),
          shortagePresent: Math.max(0, authorizedStrength - present),
          heldPercentage: percentage,
          presentPercentage: held > 0 ? Math.round((present / held) * 100) : 0,
        },
        personnelList: pList.map((p) => ({
          armyNumber: p.army_number,
          rank: p.rank,
          name: p.name,
          trade: p.trade,
          appointment: p.appointment,
          status: p.current_status,
          reason: p.status_reason || '-',
        })),
      };
      break;
    }

    case '2_DAILY_DUTY': {
      reportTitle = 'DAILY DUTY DETAIL ROSTER';
      const dateStart = `${reportDate}T00:00:00`;
      const dateEnd = `${reportDate}T23:59:59`;
      let query = `
        SELECT d.*, p.army_number, p.rank, p.name, p.trade
        FROM duties d
        JOIN personnel p ON d.personnel_id = p.id
        WHERE (
          COALESCE(d.start_date_time, d.date || 'T' || d.start_time || ':00') <= ?
          AND
          COALESCE(d.end_date_time, CASE WHEN d.end_time <= d.start_time THEN date(d.date, '+1 day') || 'T' || d.end_time || ':00' ELSE d.date || 'T' || d.end_time || ':00' END) >= ?
        )
      `;
      const params: any[] = [dateEnd, dateStart];
      if (dutyTypeFilter) {
        query += ' AND d.duty_type = ?';
        params.push(dutyTypeFilter);
      }
      query += ' ORDER BY COALESCE(d.start_date_time, d.date || "T" || d.start_time || ":00") ASC';

      const duties = db.prepare(query).all(...params);
      data = {
        duties: duties.map((d: any) => {
          const sdt = d.start_date_time || `${d.date}T${d.start_time}:00`;
          const edt = d.end_date_time || (d.end_time <= d.start_time ? `${format(addDays(parseISO(d.date), 1), 'yyyy-MM-dd')}T${d.end_time}:00` : `${d.date}T${d.end_time}:00`);
          return {
            ...d,
            startDateTime: sdt,
            endDateTime: edt,
            activeStatus: computeDutyActiveStatus(sdt, edt),
          };
        }),
        totalDuties: duties.length,
      };
      break;
    }

    case '3_WEEKLY_DUTY': {
      reportTitle = 'WEEKLY DUTY ANALYSIS REPORT';
      const weekStart = subDays(parseISO(reportDate), 7).toISOString().split('T')[0];
      const duties = db.prepare(`
        SELECT d.*, p.army_number, p.rank, p.name, p.trade
        FROM duties d
        JOIN personnel p ON d.personnel_id = p.id
        WHERE d.date >= ? AND d.date <= ?
        ORDER BY d.date DESC, d.start_time ASC
      `).all(weekStart, reportDate);

      let totalHours = 0;
      let nightDuties = 0;
      const typeDist: Record<string, number> = {};

      duties.forEach((d: any) => {
        totalHours += d.duration_hours || 0;
        if (d.is_night_duty) nightDuties++;
        typeDist[d.duty_type] = (typeDist[d.duty_type] || 0) + 1;
      });

      const soldierMap: Record<string, any> = {};
      allActivePersonnel.forEach((p: any) => {
        soldierMap[p.id] = {
          armyNumber: p.army_number,
          rank: p.rank,
          name: p.name,
          trade: p.trade,
          dutyCount: 0,
          dutyHours: 0,
          nightDuties: 0,
        };
      });

      duties.forEach((d: any) => {
        if (soldierMap[d.personnel_id]) {
          soldierMap[d.personnel_id].dutyCount += 1;
          soldierMap[d.personnel_id].dutyHours += d.duration_hours || 0;
          if (d.is_night_duty) soldierMap[d.personnel_id].nightDuties += 1;
        }
      });

      const soldierStats = Object.values(soldierMap).map((s: any) => ({
        ...s,
        dutyHours: Math.round(s.dutyHours * 10) / 10,
        dutyPercentage: duties.length > 0 ? Math.round((s.dutyCount / duties.length) * 100) : 0,
      }));

      data = {
        weekStart,
        weekEnd: reportDate,
        totalDuties: duties.length,
        totalHours: Math.round(totalHours * 10) / 10,
        nightDuties,
        dutyTypeDistribution: Object.entries(typeDist).map(([type, count]) => ({ type, count })),
        soldierStats,
      };
      break;
    }

    case '4_MONTHLY_DUTY': {
      reportTitle = 'MONTHLY DUTY ANALYSIS & FATIGUE REPORT';
      const monthStart = `${selectedMonth}-01`;
      const monthEnd = `${selectedMonth}-31`;

      const duties = db.prepare(`
        SELECT d.*, p.army_number, p.rank, p.name, p.trade
        FROM duties d
        JOIN personnel p ON d.personnel_id = p.id
        WHERE d.date >= ? AND d.date <= ?
        ORDER BY d.date DESC, d.start_time ASC
      `).all(monthStart, monthEnd);

      let totalHours = 0;
      let totalNightDuties = 0;
      let totalNightHours = 0;
      const typeDist: Record<string, { count: number; hours: number }> = {};

      duties.forEach((d: any) => {
        totalHours += d.duration_hours || 0;
        if (d.is_night_duty) totalNightDuties++;
        totalNightHours += d.night_duty_hours || 0;
        if (!typeDist[d.duty_type]) typeDist[d.duty_type] = { count: 0, hours: 0 };
        typeDist[d.duty_type].count += 1;
        typeDist[d.duty_type].hours += d.duration_hours || 0;
      });

      const soldierStats = allActivePersonnel.map((p: any) => {
        const pDuties = duties.filter((d: any) => d.personnel_id === p.id);
        const pHours = pDuties.reduce((acc: number, d: any) => acc + (d.duration_hours || 0), 0);
        const pNightDuties = pDuties.filter((d: any) => d.is_night_duty).length;
        const pNightHours = pDuties.reduce((acc: number, d: any) => acc + (d.night_duty_hours || 0), 0);

        const score = pDuties.length * 1.5 + pNightHours * 1.2;
        let level = 'LOW';
        if (score >= 24) level = 'HIGH';
        else if (score >= 12) level = 'MODERATE';

        return {
          armyNumber: p.army_number,
          rank: p.rank,
          name: p.name,
          trade: p.trade,
          dutyCount: pDuties.length,
          dutyPercentage: duties.length > 0 ? Math.round((pDuties.length / duties.length) * 100) : 0,
          dutyHours: Math.round(pHours * 10) / 10,
          nightDuties: pNightDuties,
          nightDutyHours: Math.round(pNightHours * 10) / 10,
          fatigueLevel: level,
          fatigueScore: Math.round(score * 10) / 10,
        };
      });

      data = {
        selectedMonth,
        totalDuties: duties.length,
        totalHours: Math.round(totalHours * 10) / 10,
        totalNightDuties,
        totalNightHours: Math.round(totalNightHours * 10) / 10,
        typeDistribution: Object.entries(typeDist).map(([type, d]) => ({
          type,
          count: d.count,
          hours: Math.round(d.hours * 10) / 10,
        })),
        soldierStats,
      };
      break;
    }

    case '5_NIGHT_DUTY': {
      reportTitle = 'NIGHT DUTY (22:00-06:00) ANALYSIS REPORT';
      const monthStart = subDays(parseISO(reportDate), 30).toISOString().split('T')[0];
      const nightDuties = db.prepare(`
        SELECT d.*, p.army_number, p.rank, p.name, p.trade
        FROM duties d
        JOIN personnel p ON d.personnel_id = p.id
        WHERE d.is_night_duty = 1 AND d.date >= ? AND d.date <= ?
        ORDER BY d.date DESC, d.start_time ASC
      `).all(monthStart, reportDate);

      const totalNightHours = nightDuties.reduce((acc: number, d: any) => acc + (d.night_duty_hours || 0), 0);

      const soldierSummary = allActivePersonnel.map((p: any) => {
        const pNight = nightDuties.filter((d: any) => d.personnel_id === p.id);
        const hours = pNight.reduce((acc: number, d: any) => acc + (d.night_duty_hours || 0), 0);
        return {
          armyNumber: p.army_number,
          rank: p.rank,
          name: p.name,
          trade: p.trade,
          nightDutyCount: pNight.length,
          nightDutyHours: Math.round(hours * 10) / 10,
        };
      }).filter((s) => s.nightDutyCount > 0);

      data = {
        nightDuties,
        totalNightDuties: nightDuties.length,
        totalNightHours: Math.round(totalNightHours * 10) / 10,
        soldierSummary,
        windowStart: monthStart,
        windowEnd: reportDate,
      };
      break;
    }

    case '6_FATIGUE_INDEX': {
      reportTitle = 'DUTY FATIGUE INDEX & WORKLOAD REPORT';
      const monthStart = subDays(parseISO(reportDate), 30).toISOString().split('T')[0];
      const duties = db.prepare('SELECT * FROM duties WHERE date >= ? AND date <= ?').all(monthStart, reportDate);

      const fatigueList = allActivePersonnel.map((p: any) => {
        const pDuties = duties.filter((d: any) => d.personnel_id === p.id);
        let hours = 0;
        let nightDuties = 0;
        let nightHours = 0;

        const dateCount: Record<string, number> = {};
        pDuties.forEach((d: any) => {
          hours += d.duration_hours || 0;
          if (d.is_night_duty) nightDuties++;
          nightHours += d.night_duty_hours || 0;
          dateCount[d.date] = (dateCount[d.date] || 0) + 1;
        });

        const multiDutyDays = Object.values(dateCount).filter((c) => c > 1).length;
        const score = pDuties.length * 1.5 + nightHours * 1.2 + multiDutyDays * 2;
        let level = 'LOW';
        if (score >= 24) level = 'HIGH';
        else if (score >= 12) level = 'MODERATE';

        return {
          armyNumber: p.army_number,
          rank: p.rank,
          name: p.name,
          trade: p.trade,
          dutyCount: pDuties.length,
          dutyHours: Math.round(hours * 10) / 10,
          nightDuties,
          nightDutyHours: Math.round(nightHours * 10) / 10,
          multiDutyDays,
          fatigueScore: Math.round(score * 10) / 10,
          fatigueLevel: level,
        };
      });

      data = {
        fatigueList,
        summary: {
          low: fatigueList.filter((f) => f.fatigueLevel === 'LOW').length,
          moderate: fatigueList.filter((f) => f.fatigueLevel === 'MODERATE').length,
          high: fatigueList.filter((f) => f.fatigueLevel === 'HIGH').length,
        },
      };
      break;
    }

    case '7_PT_ATTENDANCE': {
      reportTitle = 'PHYSICAL TRAINING (PT) ATTENDANCE REPORT';
      const monthStart = subDays(parseISO(reportDate), 30).toISOString().split('T')[0];
      const records = db.prepare('SELECT * FROM pt_records WHERE date >= ? AND date <= ?').all(monthStart, reportDate);

      const ptList = allActivePersonnel.map((p: any) => {
        const pRecords = records.filter((r: any) => r.personnel_id === p.id);
        const total = pRecords.length;
        const attended = pRecords.filter((r: any) => r.status === 'PRESENT').length;
        const excusedDuty = pRecords.filter((r: any) => r.status === 'EXCUSED_DUTY').length;
        const excusedMed = pRecords.filter((r: any) => r.status === 'EXCUSED_MEDICAL').length;
        const missed = pRecords.filter((r: any) => r.status === 'ABSENT').length;
        const eligible = total - (excusedDuty + excusedMed);
        const percentage = eligible > 0 ? Math.round((attended / eligible) * 100) : 100;

        return {
          armyNumber: p.army_number,
          rank: p.rank,
          name: p.name,
          trade: p.trade,
          totalSessions: total,
          eligibleSessions: Math.max(0, eligible),
          attended,
          excusedDuty,
          excusedMed,
          missed,
          percentage,
        };
      });

      data = { ptList, reportDate };
      break;
    }

    case '8_GAMES_ATTENDANCE': {
      reportTitle = 'EVENING GAMES & SPORTS ATTENDANCE REPORT';
      const monthStart = subDays(parseISO(reportDate), 30).toISOString().split('T')[0];
      const records = db.prepare('SELECT * FROM games_records WHERE date >= ? AND date <= ?').all(monthStart, reportDate);

      const gamesList = allActivePersonnel.map((p: any) => {
        const pRecords = records.filter((r: any) => r.personnel_id === p.id);
        const total = pRecords.length;
        const attended = pRecords.filter((r: any) => r.status === 'PRESENT').length;
        const excusedDuty = pRecords.filter((r: any) => r.status === 'EXCUSED_DUTY').length;
        const excusedMed = pRecords.filter((r: any) => r.status === 'EXCUSED_MEDICAL').length;
        const missed = pRecords.filter((r: any) => r.status === 'ABSENT').length;
        const eligible = total - (excusedDuty + excusedMed);
        const percentage = eligible > 0 ? Math.round((attended / eligible) * 100) : 100;

        return {
          armyNumber: p.army_number,
          rank: p.rank,
          name: p.name,
          trade: p.trade,
          totalSessions: total,
          eligibleSessions: Math.max(0, eligible),
          attended,
          excusedDuty,
          excusedMed,
          missed,
          percentage,
        };
      });

      data = { gamesList, reportDate };
      break;
    }

    case '9_COMBINED_PERFORMANCE': {
      reportTitle = 'COMBINED DUTY, PT & GAMES CORRELATION REPORT';
      const monthStart = subDays(parseISO(reportDate), 30).toISOString().split('T')[0];
      const duties = db.prepare('SELECT * FROM duties WHERE date >= ?').all(monthStart);
      const ptRecords = db.prepare('SELECT * FROM pt_records WHERE date >= ?').all(monthStart);
      const gamesRecords = db.prepare('SELECT * FROM games_records WHERE date >= ?').all(monthStart);
      const leaveRecords = db.prepare('SELECT * FROM leave_records WHERE start_date >= ?').all(monthStart);

      const combined = allActivePersonnel.map((p: any) => {
        const pDuties = duties.filter((d: any) => d.personnel_id === p.id);
        const pPT = ptRecords.filter((r: any) => r.personnel_id === p.id);
        const pGM = gamesRecords.filter((r: any) => r.personnel_id === p.id);
        const pLeaves = leaveRecords.filter((l: any) => l.personnel_id === p.id);

        const dutyHours = pDuties.reduce((acc: number, d: any) => acc + (d.duration_hours || 0), 0);
        const nightDuties = pDuties.filter((d: any) => d.is_night_duty).length;
        const dutyPercentage = duties.length > 0 ? Math.round((pDuties.length / duties.length) * 100) : 0;

        const ptEligible = pPT.length - pPT.filter((r: any) => r.status.includes('EXCUSED')).length;
        const ptPct = ptEligible > 0 ? Math.round((pPT.filter((r: any) => r.status === 'PRESENT').length / ptEligible) * 100) : 100;

        const gmEligible = pGM.length - pGM.filter((r: any) => r.status.includes('EXCUSED')).length;
        const gmPct = gmEligible > 0 ? Math.round((pGM.filter((r: any) => r.status === 'PRESENT').length / gmEligible) * 100) : 100;

        const leaveDays = pLeaves.reduce((acc: number, l: any) => acc + (l.total_days || 0), 0);

        return {
          armyNumber: p.army_number,
          rank: p.rank,
          name: p.name,
          trade: p.trade,
          dutyDays: pDuties.length,
          dutyPercentage,
          dutyHours: Math.round(dutyHours * 10) / 10,
          nightDuties,
          ptPct,
          gmPct,
          leaveDays,
        };
      });

      data = { combined, windowDays: 30 };
      break;
    }

    case '10_CURRENT_LEAVE_STATUS': {
      reportTitle = 'CURRENT LEAVE STATUS & ABSENCE NOMINAL ROLL';
      let query = `
        SELECT l.*, p.army_number, p.rank, p.name, p.trade, p.appointment
        FROM leave_records l
        JOIN personnel p ON l.personnel_id = p.id
        WHERE l.status = 'ACTIVE'
      `;
      const params: any[] = [];
      if (leaveTypeFilter) {
        query += ' AND l.leave_type = ?';
        params.push(leaveTypeFilter);
      }
      query += ' ORDER BY l.start_date DESC';

      const activeLeaves = db.prepare(query).all(...params);
      data = { activeLeaves, totalActive: activeLeaves.length };
      break;
    }

    case '11_YEARLY_LEAVE_SUMMARY': {
      reportTitle = 'ANNUAL LEAVE CONSUMPTION & BALANCE REPORT';
      const allLeaves = db.prepare(`SELECT * FROM leave_records WHERE start_date >= ? AND start_date <= ?`).all(`${selectedYear}-01-01`, `${selectedYear}-12-31`);

      const summary = allActivePersonnel.map((p: any) => {
        const pLeaveLimit = getRankPLeaveLimit(p.rank);
        const pLeaves = allLeaves.filter((l: any) => l.personnel_id === p.id);

        const pUsed = pLeaves.filter((l: any) => l.leave_type === 'P_LEAVE').reduce((acc: number, l: any) => acc + (l.total_days || 0), 0);
        const cUsed = pLeaves.filter((l: any) => l.leave_type === 'C_LEAVE').reduce((acc: number, l: any) => acc + (l.total_days || 0), 0);
        const medUsed = pLeaves.filter((l: any) => l.leave_type === 'MEDICAL_LEAVE').reduce((acc: number, l: any) => acc + (l.total_days || 0), 0);
        const matUsed = pLeaves.filter((l: any) => l.leave_type === 'MATERNITY_LEAVE').reduce((acc: number, l: any) => acc + (l.total_days || 0), 0);

        return {
          armyNumber: p.army_number,
          rank: p.rank,
          name: p.name,
          trade: p.trade,
          pLeaveLimit,
          pLeaveUsed: pUsed,
          pLeaveRemaining: Math.max(0, pLeaveLimit - pUsed),
          cLeaveDays: cUsed,
          medicalDays: medUsed,
          maternityDays: matUsed,
          totalDaysAway: pUsed + cUsed + medUsed + matUsed,
        };
      });

      data = { summary, year: selectedYear };
      break;
    }

    case '12_C_LEAVE_DUE': {
      reportTitle = 'C LEAVE DUE IN 15 DAYS NOMINAL ROLL';
      const dueList: any[] = [];

      allActivePersonnel.forEach((p: any) => {
        const lastLeave: any = db.prepare(`SELECT * FROM leave_records WHERE personnel_id = ? AND leave_type IN ('P_LEAVE', 'C_LEAVE') ORDER BY start_date DESC LIMIT 1`).get(p.id);
        const refDateStr = lastLeave ? (lastLeave.end_date || lastLeave.start_date) : (p.unit_joining_date || `${now.getFullYear()}-01-01`);
        if (refDateStr) {
          try {
            const refDate = parseISO(refDateStr);
            const dueDate = new Date(refDate);
            dueDate.setDate(dueDate.getDate() + 90);
            const daysUntilDue = differenceInDays(dueDate, now);
            if (daysUntilDue >= 0 && daysUntilDue <= 15) {
              dueList.push({
                armyNumber: p.army_number,
                rank: p.rank,
                name: p.name,
                trade: p.trade,
                lastLeaveDate: refDateStr,
                dueDate: format(dueDate, 'yyyy-MM-dd'),
                daysUntilDue,
              });
            }
          } catch (e) {}
        }
      });

      data = { dueList, count: dueList.length };
      break;
    }

    case '13_C_LEAVE_OVERDUE': {
      reportTitle = 'C LEAVE OVERDUE NOMINAL ROLL';
      const overdueList: any[] = [];

      allActivePersonnel.forEach((p: any) => {
        const lastLeave: any = db.prepare(`SELECT * FROM leave_records WHERE personnel_id = ? AND leave_type IN ('P_LEAVE', 'C_LEAVE') ORDER BY start_date DESC LIMIT 1`).get(p.id);
        const refDateStr = lastLeave ? (lastLeave.end_date || lastLeave.start_date) : (p.unit_joining_date || `${now.getFullYear()}-01-01`);
        if (refDateStr) {
          try {
            const refDate = parseISO(refDateStr);
            const dueDate = new Date(refDate);
            dueDate.setDate(dueDate.getDate() + 90);
            const daysUntilDue = differenceInDays(dueDate, now);
            if (daysUntilDue < 0) {
              overdueList.push({
                armyNumber: p.army_number,
                rank: p.rank,
                name: p.name,
                trade: p.trade,
                lastLeaveDate: refDateStr,
                dueDate: format(dueDate, 'yyyy-MM-dd'),
                daysOverdue: Math.abs(daysUntilDue),
              });
            }
          } catch (e) {}
        }
      });

      data = { overdueList, count: overdueList.length };
      break;
    }

    case '14_LEAVE_FORECAST_3M': {
      reportTitle = '3-MONTH FORWARD C LEAVE FORECAST SCHEDULE';
      const forecast: any[] = [];

      allActivePersonnel.forEach((p: any) => {
        const lastLeave: any = db.prepare(`SELECT * FROM leave_records WHERE personnel_id = ? AND leave_type IN ('P_LEAVE', 'C_LEAVE') ORDER BY start_date DESC LIMIT 1`).get(p.id);
        const refDateStr = lastLeave ? (lastLeave.end_date || lastLeave.start_date) : (p.unit_joining_date || `${now.getFullYear()}-01-01`);
        if (refDateStr) {
          try {
            const refDate = parseISO(refDateStr);
            const dueDate = new Date(refDate);
            dueDate.setDate(dueDate.getDate() + 90);
            forecast.push({
              armyNumber: p.army_number,
              rank: p.rank,
              name: p.name,
              trade: p.trade,
              lastLeaveDate: refDateStr,
              expectedDueDate: format(dueDate, 'yyyy-MM-dd'),
              targetMonth: format(dueDate, 'MMMM yyyy'),
            });
          } catch (e) {}
        }
      });

      data = { forecast: forecast.sort((a, b) => a.expectedDueDate.localeCompare(b.expectedDueDate)) };
      break;
    }

    case '15_INDIVIDUAL_DOSSIER': {
      reportTitle = 'INDIVIDUAL CONFIDENTIAL PERSONNEL DOSSIER';
      const p: any = db.prepare('SELECT * FROM personnel WHERE id = ? OR army_number = ?').get(
        personnelId || allActivePersonnel[0]?.id || 'p_1',
        personnelId || allActivePersonnel[0]?.army_number || 'p_1'
      );

      if (p) {
        const pLeaveLimit = getRankPLeaveLimit(p.rank);
        const duties = db.prepare('SELECT * FROM duties WHERE personnel_id = ? ORDER BY date DESC LIMIT 20').all(p.id);
        const leaves = db.prepare('SELECT * FROM leave_records WHERE personnel_id = ? ORDER BY start_date DESC LIMIT 15').all(p.id);
        const pt = db.prepare('SELECT * FROM pt_records WHERE personnel_id = ? ORDER BY date DESC LIMIT 30').all(p.id);
        const games = db.prepare('SELECT * FROM games_records WHERE personnel_id = ? ORDER BY date DESC LIMIT 30').all(p.id);

        const currentYearStr = String(new Date().getFullYear());
        const thisYearPLeaves = leaves.filter((l: any) => l.leave_type === 'P_LEAVE' && l.start_date.startsWith(currentYearStr));
        const pLeaveUsed = thisYearPLeaves.reduce((acc: number, l: any) => acc + (l.total_days || 0), 0);
        const pLeaveRemaining = Math.max(0, pLeaveLimit - pLeaveUsed);

        const totalHours = duties.reduce((acc: number, d: any) => acc + (d.duration_hours || 0), 0);
        const nightDuties = duties.filter((d: any) => d.is_night_duty).length;
        const nightHours = duties.reduce((acc: number, d: any) => acc + (d.night_duty_hours || 0), 0);

        const ptAttended = pt.filter((r: any) => r.status === 'PRESENT').length;
        const ptPct = pt.length > 0 ? Math.round((ptAttended / pt.length) * 100) : 100;

        const gmAttended = games.filter((r: any) => r.status === 'PRESENT').length;
        const gmPct = games.length > 0 ? Math.round((gmAttended / games.length) * 100) : 100;

        const fatigueScore = duties.length * 1.5 + nightHours * 1.2;
        let fatigueLevel = 'LOW';
        if (fatigueScore >= 24) fatigueLevel = 'HIGH';
        else if (fatigueScore >= 12) fatigueLevel = 'MODERATE';

        data = {
          soldier: p,
          pLeaveLimit,
          pLeaveUsed,
          pLeaveRemaining,
          pLeaveUsagePct: pLeaveLimit > 0 ? Math.round((pLeaveUsed / pLeaveLimit) * 100) : 0,
          dutySummary: {
            totalDuties: duties.length,
            totalHours: Math.round(totalHours * 10) / 10,
            nightDuties,
            nightDutyHours: Math.round(nightHours * 10) / 10,
            fatigueScore: Math.round(fatigueScore * 10) / 10,
            fatigueLevel,
          },
          ptScore: { totalSessions: pt.length, attended: ptAttended, percentage: ptPct },
          gamesScore: { totalSessions: games.length, attended: gmAttended, percentage: gmPct },
          duties,
          leaves,
        };
      }
      break;
    }

    case '16_TRADE_MANPOWER':
    default: {
      reportTitle = 'TRADE-WISE MASTER MANPOWER BREAKDOWN';
      let totalAuthorized = 0;
      let totalHeld = 0;
      let totalPresent = 0;
      const tradeAuthMap = getTradeAuthorizedMap();

      const tradeMatrix = TRADES.map((t) => {
        const held = allActivePersonnel.filter((p) => p.trade === t).length;
        const present = allActivePersonnel.filter((p) => p.trade === t && p.current_status === 'PRESENT').length;
        const absent = held - present;
        const authorized = tradeAuthMap[t] !== undefined ? tradeAuthMap[t] : (DEFAULT_TRADE_AUTHORIZED[t] || held);
        const surplus = Math.max(0, held - authorized);
        const shortage = Math.max(0, authorized - held);
        const shortagePresent = Math.max(0, authorized - present);
        const percentage = authorized > 0 ? Math.round((held / authorized) * 100) : 0;

        totalAuthorized += authorized;
        totalHeld += held;
        totalPresent += present;

        return {
          trade: t,
          authorized,
          held,
          present,
          absent,
          surplus,
          shortage,
          shortagePresent,
          percentage,
        };
      });

      data = {
        tradeMatrix,
        summary: {
          authorized: totalAuthorized,
          held: totalHeld,
          present: totalPresent,
          absent: totalHeld - totalPresent,
          surplus: Math.max(0, totalHeld - totalAuthorized),
          shortage: Math.max(0, totalAuthorized - totalHeld),
          shortagePresent: Math.max(0, totalAuthorized - totalPresent),
          percentage: totalAuthorized > 0 ? Math.round((totalHeld / totalAuthorized) * 100) : 0,
        },
      };
      break;
    }
  }

  return res.json({
    title: reportTitle,
    metadata,
    data,
  });
});
