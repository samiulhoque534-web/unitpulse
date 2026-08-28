import { Router } from 'express';
import { db } from '../db';
import { authenticateUser, requirePermission, logAudit, AuthRequest } from '../auth';
import { TRADES, DEFAULT_TRADE_AUTHORIZED } from '../../src/utils/constants';

export const manpowerRouter = Router();

// Helper to get trade authorized map from settings
export function getTradeAuthorizedMap(): Record<string, number> {
  const setting: any = db.prepare('SELECT value FROM settings WHERE key = "trade_authorized_map"').get();
  if (setting && setting.value) {
    try {
      const parsed = JSON.parse(setting.value);
      return { ...DEFAULT_TRADE_AUTHORIZED, ...parsed };
    } catch (e) {}
  }
  return { ...DEFAULT_TRADE_AUTHORIZED };
}

// GET /api/manpower/authorized (Overall Authorized Manpower)
manpowerRouter.get('/authorized', authenticateUser, (req, res) => {
  const setting: any = db.prepare('SELECT value FROM settings WHERE key = "authorized_manpower"').get();
  const authorized = setting ? parseInt(setting.value, 10) : 120;
  return res.json({ authorized });
});

// PUT /api/manpower/authorized (Overall Authorized Manpower - CO strictly read-only)
manpowerRouter.put('/authorized', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const { authorized } = req.body;
  const num = parseInt(authorized, 10);

  if (isNaN(num) || num <= 0) {
    return res.status(400).json({ error: 'Authorized manpower must be a valid positive integer.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES ('authorized_manpower', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(String(num), now);

  logAudit(req, 'UPDATE_AUTHORIZED_MANPOWER', 'SETTINGS', 'authorized_manpower', `Updated Overall Authorized Manpower to ${num}`);

  return res.json({ message: `Overall Authorized Manpower updated to ${num}`, authorized: num });
});

// GET /api/manpower/trade-authorized (Get trade-wise authorized map)
manpowerRouter.get('/trade-authorized', authenticateUser, (req, res) => {
  const tradeMap = getTradeAuthorizedMap();
  return res.json({ tradeAuthorized: tradeMap });
});

// PUT /api/manpower/trade-authorized (Edit Authorized Manpower by Trade - CO strictly read-only)
manpowerRouter.put('/trade-authorized', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const { trade, authorized, tradeAuthorized } = req.body;
  const currentMap = getTradeAuthorizedMap();
  const now = new Date().toISOString();

  if (trade && authorized !== undefined) {
    const num = parseInt(authorized, 10);
    if (isNaN(num) || num < 0) {
      return res.status(400).json({ error: 'Trade authorized manpower must be a non-negative integer.' });
    }
    currentMap[trade] = num;
    logAudit(req, 'UPDATE_TRADE_AUTHORIZED', 'SETTINGS', trade, `Updated Authorized Manpower for trade "${trade}" to ${num}`);
  } else if (tradeAuthorized && typeof tradeAuthorized === 'object') {
    Object.keys(tradeAuthorized).forEach((t) => {
      const val = parseInt(tradeAuthorized[t], 10);
      if (!isNaN(val) && val >= 0) {
        currentMap[t] = val;
      }
    });
    logAudit(req, 'UPDATE_TRADE_AUTHORIZED_BATCH', 'SETTINGS', 'ALL_TRADES', 'Updated Trade-wise Authorized Manpower in batch');
  } else {
    return res.status(400).json({ error: 'Provide either { trade, authorized } or { tradeAuthorized: { ... } }' });
  }

  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES ('trade_authorized_map', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(JSON.stringify(currentMap), now);

  return res.json({
    message: 'Trade-wise Authorized Manpower saved successfully.',
    tradeAuthorized: currentMap,
  });
});

// GET /api/manpower/dashboard
manpowerRouter.get('/dashboard', authenticateUser, (req, res) => {
  const activePersonnel = db.prepare('SELECT * FROM personnel WHERE is_active = 1').all();

  const authSetting: any = db.prepare('SELECT value FROM settings WHERE key = "authorized_manpower"').get();
  const overallAuthorized = authSetting ? parseInt(authSetting.value, 10) : 120;
  const tradeAuthMap = getTradeAuthorizedMap();

  const held = activePersonnel.length;
  let present = 0;
  let tyDuty = 0;
  let attachment = 0;
  let leave = 0;
  let other = 0;

  activePersonnel.forEach((p) => {
    switch (p.current_status) {
      case 'PRESENT':
        present++;
        break;
      case 'TY_DUTY':
        tyDuty++;
        break;
      case 'ATTACHMENT':
        attachment++;
        break;
      case 'LEAVE':
        leave++;
        break;
      case 'OTHER':
        other++;
        break;
      default:
        present++;
        break;
    }
  });

  const effectiveAvailable = present;
  const shortageHeld = Math.max(0, overallAuthorized - held);
  const shortagePresent = Math.max(0, overallAuthorized - present);

  let tradeAuthorizedSum = 0;

  // Trade-wise Manpower Analysis
  const tradeAnalysis = TRADES.map((t) => {
    const tradePersonnel = activePersonnel.filter((p) => p.trade === t);
    const tradeHeld = tradePersonnel.length;
    const tradePresent = tradePersonnel.filter((p) => p.current_status === 'PRESENT').length;
    const tradeAbsentPersonnel = tradePersonnel.filter((p) => p.current_status !== 'PRESENT');
    const tradeAbsent = tradeAbsentPersonnel.length;
    
    // Live configured authorized strength from database
    const tradeAuthorized = tradeAuthMap[t] !== undefined ? tradeAuthMap[t] : (DEFAULT_TRADE_AUTHORIZED[t] || tradeHeld);
    tradeAuthorizedSum += tradeAuthorized;

    // Surplus: If Held > Authorized => Held - Authorized; else 0
    const tradeSurplus = Math.max(0, tradeHeld - tradeAuthorized);
    // Percentage: Held / Authorized * 100
    const percentage = tradeAuthorized > 0 ? Math.round((tradeHeld / tradeAuthorized) * 100) : 0;

    // Detailed breakdown of absent personnel for this trade
    let leaveCount = 0;
    let courseCount = 0;
    let tyDutyCount = 0;
    let attachmentCount = 0;
    let hospitalCount = 0;
    let otherCount = 0;

    tradeAbsentPersonnel.forEach((p: any) => {
      const reasonLower = (p.status_reason || '').toLowerCase();
      if (p.current_status === 'TY_DUTY') {
        tyDutyCount++;
      } else if (p.current_status === 'ATTACHMENT') {
        attachmentCount++;
      } else if (reasonLower.includes('course') || reasonLower.includes('trg') || reasonLower.includes('training')) {
        courseCount++;
      } else if (reasonLower.includes('hospital') || reasonLower.includes('cmh') || reasonLower.includes('admission') || reasonLower.includes('medical') || reasonLower.includes('sick')) {
        hospitalCount++;
      } else if (p.current_status === 'LEAVE') {
        leaveCount++;
      } else {
        otherCount++;
      }
    });

    const absentBreakdown = {
      leave: leaveCount,
      course: courseCount,
      tyDuty: tyDutyCount,
      attachment: attachmentCount,
      hospital: hospitalCount,
      other: otherCount,
      personnel: tradeAbsentPersonnel.map((p: any) => ({
        id: p.id,
        armyNumber: p.army_number,
        rank: p.rank,
        name: p.name,
        trade: p.trade,
        status: p.current_status,
        reason: p.status_reason || 'Authorized official absence',
      })),
    };

    return {
      trade: t,
      authorized: tradeAuthorized,
      held: tradeHeld,
      present: tradePresent,
      absent: tradeAbsent,
      absentBreakdown,
      surplus: tradeSurplus,
      percentage,
      shortage: Math.max(0, tradeAuthorized - tradeHeld),
      shortagePresent: Math.max(0, tradeAuthorized - tradePresent),
      heldPercentage: percentage,
    };
  });

  const summary = {
    authorized: overallAuthorized,
    overallAuthorized,
    tradeAuthorizedSum,
    held,
    present,
    tyDuty,
    attachment,
    leave,
    other,
    effectiveAvailable,
    shortageHeld,
    shortagePresent,
    heldPercentage: overallAuthorized > 0 ? Math.round((held / overallAuthorized) * 1000) / 10 : 0,
    presentPercentage: held > 0 ? Math.round((present / held) * 1000) / 10 : 0,
    effectivePercentage: held > 0 ? Math.round((effectiveAvailable / held) * 1000) / 10 : 0,
  };

  // Overall Manpower Status Pie Chart Data
  const statusPieData = [
    { name: 'Present', value: present, color: '#10b981' },
    { name: 'TY Duty', value: tyDuty, color: '#3b82f6' },
    { name: 'Attachment', value: attachment, color: '#8b5cf6' },
    { name: 'Leave', value: leave, color: '#f59e0b' },
    { name: 'Other Absence', value: other, color: '#ef4444' },
  ];

  // List of Non-Present Personnel with Reason
  const awayPersonnel = activePersonnel
    .filter((p) => p.current_status !== 'PRESENT')
    .map((p) => ({
      id: p.id,
      armyNumber: p.army_number,
      rank: p.rank,
      name: p.name,
      trade: p.trade,
      appointment: p.appointment,
      status: p.current_status,
      reason: p.status_reason || 'Authorized official absence',
    }));

  return res.json({
    summary,
    tradeAnalysis,
    statusPieData,
    awayPersonnel,
  });
});
