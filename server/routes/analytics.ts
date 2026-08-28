import { Router } from 'express';
import { db } from '../db';
import { authenticateUser } from '../auth';
import { subDays } from 'date-fns';

export const analyticsRouter = Router();

// 1. Duty Analytics & Fatigue Index
analyticsRouter.get('/duty', authenticateUser, (req, res) => {
  const period = (req.query.period as string) || 'monthly';
  const now = new Date();

  let days = 30;
  if (period === 'weekly') days = 7;
  else if (period === 'quarterly') days = 90;
  else if (period === 'yearly') days = 365;

  const startDate = subDays(now, days).toISOString().split('T')[0];
  const activePersonnel = db.prepare('SELECT * FROM personnel WHERE is_active = 1').all();
  const duties = db.prepare('SELECT * FROM duties WHERE date >= ?').all(startDate);

  let totalDuties = duties.length;
  let totalHours = 0;
  let totalNightDuties = 0;
  let totalNightHours = 0;
  const typeMap: Record<string, { count: number; hours: number }> = {};

  duties.forEach((d) => {
    totalHours += d.duration_hours || 0;
    if (d.is_night_duty) totalNightDuties++;
    totalNightHours += d.night_duty_hours || 0;

    if (!typeMap[d.duty_type]) typeMap[d.duty_type] = { count: 0, hours: 0 };
    typeMap[d.duty_type].count += 1;
    typeMap[d.duty_type].hours += d.duration_hours || 0;
  });

  const soldierStats = activePersonnel.map((p: any) => {
    const pDuties = duties.filter((d) => d.personnel_id === p.id);
    let pHours = 0;
    let pNightDuties = 0;
    let pNightHours = 0;
    const pTypes: Record<string, number> = {};

    pDuties.forEach((d) => {
      pHours += d.duration_hours || 0;
      if (d.is_night_duty) pNightDuties++;
      pNightHours += d.night_duty_hours || 0;
      pTypes[d.duty_type] = (pTypes[d.duty_type] || 0) + 1;
    });

    const dutyPercentage = totalDuties > 0 ? Math.round((pDuties.length / totalDuties) * 1000) / 10 : 0;

    // Fatigue Score Formula: (Duty Count * 1.5) + (Night Hours * 1.2) + (Days with multiple duties * 2)
    const dutyDatesCount: Record<string, number> = {};
    pDuties.forEach((d) => {
      dutyDatesCount[d.date] = (dutyDatesCount[d.date] || 0) + 1;
    });
    const multiDutyDays = Object.values(dutyDatesCount).filter((c) => c > 1).length;

    const fatigueScore = pDuties.length * 1.5 + pNightHours * 1.2 + multiDutyDays * 2;
    let fatigueLevel: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW';
    if (fatigueScore >= 24) fatigueLevel = 'HIGH';
    else if (fatigueScore >= 12) fatigueLevel = 'MODERATE';

    return {
      id: p.id,
      armyNumber: p.army_number,
      rank: p.rank,
      name: p.name,
      trade: p.trade,
      dutyCount: pDuties.length,
      dutyPercentage,
      dutyHours: Math.round(pHours * 10) / 10,
      nightDuties: pNightDuties,
      nightDutyHours: Math.round(pNightHours * 10) / 10,
      multiDutyDays,
      fatigueLevel,
      fatigueScore: Math.round(fatigueScore * 10) / 10,
      dutyTypeDistribution: pTypes,
    };
  });

  // Fatigue Counts
  const fatigueSummary = {
    low: soldierStats.filter((s) => s.fatigueLevel === 'LOW').length,
    moderate: soldierStats.filter((s) => s.fatigueLevel === 'MODERATE').length,
    high: soldierStats.filter((s) => s.fatigueLevel === 'HIGH').length,
  };

  const typeDistributionArray = Object.entries(typeMap).map(([name, data]) => ({
    dutyName: name,
    count: data.count,
    totalHours: Math.round(data.hours * 10) / 10,
  }));

  return res.json({
    period,
    startDate,
    summary: {
      totalDuties,
      totalHours: Math.round(totalHours * 10) / 10,
      totalNightDuties,
      totalNightHours: Math.round(totalNightHours * 10) / 10,
      activePersonnelCount: activePersonnel.length,
      meanDutyPerSoldier: activePersonnel.length > 0 ? Math.round((totalDuties / activePersonnel.length) * 10) / 10 : 0,
      fatigueSummary,
    },
    typeDistribution: typeDistributionArray,
    soldierStats,
  });
});

// 2. Combined Duty vs PT/Games Analysis
analyticsRouter.get('/duty-vs-pt-games', authenticateUser, (req, res) => {
  const days = parseInt((req.query.days as string) || '30', 10);
  const now = new Date();
  const startDate = subDays(now, days).toISOString().split('T')[0];

  const activePersonnel = db.prepare('SELECT * FROM personnel WHERE is_active = 1').all();
  const duties = db.prepare('SELECT * FROM duties WHERE date >= ?').all(startDate);
  const ptRecords = db.prepare('SELECT * FROM pt_records WHERE date >= ?').all(startDate);
  const gamesRecords = db.prepare('SELECT * FROM games_records WHERE date >= ?').all(startDate);
  const leaveRecords = db.prepare('SELECT * FROM leave_records WHERE start_date >= ?').all(startDate);

  const totalDuties = duties.length;

  const correlationData = activePersonnel.map((p: any) => {
    // Duty
    const pDuties = duties.filter((d) => d.personnel_id === p.id);
    let dutyHours = 0;
    let nightDuties = 0;
    pDuties.forEach((d) => {
      dutyHours += d.duration_hours || 0;
      if (d.is_night_duty) nightDuties++;
    });
    const dutyPercentage = totalDuties > 0 ? Math.round((pDuties.length / totalDuties) * 1000) / 10 : 0;

    // PT
    const pPT = ptRecords.filter((r) => r.personnel_id === p.id);
    const ptPresent = pPT.filter((r) => r.status === 'PRESENT').length;
    const ptExcusedDuty = pPT.filter((r) => r.status === 'EXCUSED_DUTY').length;
    const ptAbsent = pPT.filter((r) => r.status === 'ABSENT').length;
    const ptEligible = pPT.length - (pPT.filter((r) => r.status.includes('EXCUSED')).length);
    const ptPercentage = ptEligible > 0 ? Math.round((ptPresent / ptEligible) * 100) : 100;

    // Games
    const pGames = gamesRecords.filter((r) => r.personnel_id === p.id);
    const gamesPresent = pGames.filter((r) => r.status === 'PRESENT').length;
    const gamesExcusedDuty = pGames.filter((r) => r.status === 'EXCUSED_DUTY').length;
    const gamesAbsent = pGames.filter((r) => r.status === 'ABSENT').length;
    const gamesEligible = pGames.length - (pGames.filter((r) => r.status.includes('EXCUSED')).length);
    const gamesPercentage = gamesEligible > 0 ? Math.round((gamesPresent / gamesEligible) * 100) : 100;

    // Leave
    const pLeaves = leaveRecords.filter((l) => l.personnel_id === p.id);
    const leaveDays = pLeaves.reduce((acc, l) => acc + (l.total_days || 0), 0);

    return {
      id: p.id,
      armyNumber: p.army_number,
      rank: p.rank,
      name: p.name,
      trade: p.trade,
      appointment: p.appointment,
      totalDuties: pDuties.length,
      dutyHours: Math.round(dutyHours * 10) / 10,
      dutyPercentage,
      nightDuties,
      ptPercentage,
      ptExcusedDuty,
      ptAbsent,
      gamesPercentage,
      gamesExcusedDuty,
      gamesAbsent,
      leaveDays,
    };
  });

  return res.json({ data: correlationData, days });
});
