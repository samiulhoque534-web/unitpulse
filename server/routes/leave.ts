import { Router } from 'express';
import { db } from '../db';
import { authenticateUser, requirePermission, logAudit, AuthRequest } from '../auth';
import { parseISO, differenceInDays, addDays, format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { getRankPLeaveLimit } from '../../src/utils/constants';

export const leaveRouter = Router();

/**
 * Automatically synchronizes Leave records with the Personal Database.
 * - If a soldier is currently on active P Leave or C Leave (today is within leave dates and status is ACTIVE),
 *   sets Personal Database status to 'LEAVE' and records any previous active status (Hospital, Course, Attachment, etc.).
 * - When the sanctioned leave period ends or is returned, if the soldier has no other active leave:
 *   restores their preserved active status (e.g. Hospital, Course, Temporary Attachment) if one existed,
 *   or resets status to 'PRESENT'.
 */
export function syncLeaveStatusWithPersonnel() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const now = new Date().toISOString();

  try {
    const activePersonnel: any[] = db.prepare('SELECT id, army_number, rank, name, current_status, previous_status FROM personnel WHERE is_active = 1').all();

    for (const p of activePersonnel) {
      // Find if soldier has an active leave record covering today
      const activeLeave: any = db.prepare(`
        SELECT * FROM leave_records
        WHERE personnel_id = ? AND status = 'ACTIVE' AND start_date <= ? AND end_date >= ?
        ORDER BY start_date DESC
        LIMIT 1
      `).get(p.id, today, today);

      if (activeLeave) {
        if (p.current_status !== 'LEAVE') {
          // Remember previous active status if they were on Hospital, Course, Attachment, etc.
          const prev = (p.current_status && p.current_status !== 'PRESENT' && p.current_status !== 'LEAVE')
            ? p.current_status
            : (p.previous_status || null);

          db.prepare(`
            UPDATE personnel
            SET current_status = 'LEAVE',
                status_reason = ?,
                previous_status = ?,
                updated_at = ?
            WHERE id = ?
          `).run(
            `On ${activeLeave.leave_type.replace('_', ' ')} (${activeLeave.start_date} to ${activeLeave.end_date})`,
            prev,
            now,
            p.id
          );
        }
      } else {
        // Expire past active leaves where end_date < today
        const expiredLeaves: any[] = db.prepare(`
          SELECT id, end_date FROM leave_records
          WHERE personnel_id = ? AND status = 'ACTIVE' AND end_date < ?
        `).all(p.id, today);

        for (const exp of expiredLeaves) {
          db.prepare(`
            UPDATE leave_records
            SET status = 'RETURNED',
                actual_return_date = COALESCE(actual_return_date, ?),
                updated_at = ?
            WHERE id = ?
          `).run(exp.end_date, now, exp.id);
        }

        // If soldier was marked 'LEAVE', verify if any active leave remains
        if (p.current_status === 'LEAVE') {
          const remainingActive = db.prepare(`
            SELECT id FROM leave_records
            WHERE personnel_id = ? AND status = 'ACTIVE' AND start_date <= ? AND end_date >= ?
          `).get(p.id, today, today);

          if (!remainingActive) {
            // Restore preserved active status if applicable, otherwise reset to PRESENT
            const preservedStatus = (p.previous_status && ['HOSPITAL', 'COURSE', 'TY_DUTY', 'ATTACHMENT', 'OTHER'].includes(p.previous_status))
              ? p.previous_status
              : 'PRESENT';
            const statusReason = preservedStatus === 'PRESENT' ? null : `Preserved active status: ${preservedStatus}`;

            db.prepare(`
              UPDATE personnel
              SET current_status = ?,
                  status_reason = ?,
                  previous_status = NULL,
                  updated_at = ?
              WHERE id = ?
            `).run(preservedStatus, statusReason, now, p.id);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[syncLeaveStatusWithPersonnel] Error during leave sync:', err.message);
  }
}

// 1. Get Leave Records
leaveRouter.get('/records', authenticateUser, (req, res) => {
  syncLeaveStatusWithPersonnel();
  const { leaveType, status, personnelId, search, year } = req.query;

  let query = `
    SELECT l.*, p.army_number, p.rank, p.name, p.trade
    FROM leave_records l
    JOIN personnel p ON l.personnel_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (leaveType) {
    query += ' AND l.leave_type = ?';
    params.push(leaveType);
  }

  if (status) {
    query += ' AND l.status = ?';
    params.push(status);
  }

  if (personnelId) {
    query += ' AND l.personnel_id = ?';
    params.push(personnelId);
  }

  if (year) {
    query += ' AND l.start_date >= ? AND l.start_date <= ?';
    params.push(`${year}-01-01`, `${year}-12-31`);
  }

  if (search) {
    query += ' AND (p.army_number LIKE ? OR p.name LIKE ? OR l.reason LIKE ? OR l.destination_address LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY l.start_date DESC';

  const rows = db.prepare(query).all(...params);

  const records = rows.map((r: any) => ({
    id: r.id,
    personnelId: r.personnel_id,
    leaveType: r.leave_type,
    startDate: r.start_date,
    endDate: r.end_date,
    totalDays: r.total_days,
    reason: r.reason,
    destinationAddress: r.destination_address,
    emergencyContact: r.emergency_contact,
    status: r.status,
    actualReturnDate: r.actual_return_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    armyNumber: r.army_number,
    rank: r.rank,
    name: r.name,
    trade: r.trade,
  }));

  return res.json({ records });
});

// 2. Get Soldier Leave Entitlement State
leaveRouter.get('/entitlement/:personnelId', authenticateUser, (req, res) => {
  const { personnelId } = req.params;
  const currentYear = new Date().getFullYear();

  const soldier: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(personnelId);
  if (!soldier) {
    return res.status(404).json({ error: 'Personnel record not found.' });
  }

  const pLeaveLimit = getRankPLeaveLimit(soldier.rank);

  const yearPLeaves = db.prepare(`
    SELECT * FROM leave_records
    WHERE personnel_id = ? AND leave_type = 'P_LEAVE' AND start_date >= ? AND start_date <= ?
  `).all(personnelId, `${currentYear}-01-01`, `${currentYear}-12-31`);

  const pLeaveUsed = yearPLeaves.reduce((acc: number, l: any) => acc + (l.total_days || 0), 0);
  const pLeaveRemaining = Math.max(0, pLeaveLimit - pLeaveUsed);
  const pLeaveUsagePct = pLeaveLimit > 0 ? Math.round((pLeaveUsed / pLeaveLimit) * 100) : 0;

  return res.json({
    personnelId: soldier.id,
    rank: soldier.rank,
    name: soldier.name,
    pLeaveLimit,
    pLeaveUsed,
    pLeaveRemaining,
    pLeaveUsagePct,
    pLeaveLimitReached: pLeaveUsed >= pLeaveLimit,
    isLowBalance: pLeaveRemaining <= 5 && pLeaveRemaining > 0,
  });
});

// 3. Sanction / Add Leave Record (With Rank-based P-Leave limits and C-Leave cadence checks)
leaveRouter.post('/', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const { personnelId, leaveType, startDate, endDate, totalDays, reason, destinationAddress, emergencyContact, status, forceOverride } = req.body;

  if (!personnelId || !leaveType || !startDate || !endDate) {
    return res.status(400).json({ error: 'Personnel, Leave Type, Start Date, and End Date are required.' });
  }

  const soldier: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(personnelId);
  if (!soldier) {
    return res.status(404).json({ error: 'Personnel record not found.' });
  }

  const leaveStartYear = parseISO(startDate).getFullYear();
  const calculatedDays = totalDays || (differenceInDays(parseISO(endDate), parseISO(startDate)) + 1);

  if (calculatedDays <= 0) {
    return res.status(400).json({ error: 'Invalid leave duration: End Date must be on or after Start Date.' });
  }

  // --- RULE 1: RANK-BASED P LEAVE LIMIT ENFORCEMENT ---
  if (leaveType === 'P_LEAVE') {
    const maxAllowed = getRankPLeaveLimit(soldier.rank);

    const existingPLeaves = db.prepare(`
      SELECT * FROM leave_records
      WHERE personnel_id = ? AND leave_type = 'P_LEAVE' AND start_date >= ? AND start_date <= ?
    `).all(personnelId, `${leaveStartYear}-01-01`, `${leaveStartYear}-12-31`);

    const alreadyUsed = existingPLeaves.reduce((acc: number, l: any) => acc + (l.total_days || 0), 0);
    const remaining = Math.max(0, maxAllowed - alreadyUsed);

    if (alreadyUsed >= maxAllowed) {
      return res.status(400).json({
        error: `P LEAVE LIMIT REACHED: ${soldier.rank} ${soldier.name} has already utilized the maximum annual P Leave allowance of ${maxAllowed} days for calendar year ${leaveStartYear}.`,
        pLeaveLimitReached: true,
        maxAllowed,
        alreadyUsed,
        remaining: 0,
        requested: calculatedDays,
      });
    }

    if (alreadyUsed + calculatedDays > maxAllowed) {
      return res.status(400).json({
        error: `Insufficient P Leave Balance: Maximum Allowed: ${maxAllowed} days, Already Used: ${alreadyUsed} days, Remaining: ${remaining} days, Requested: ${calculatedDays} days.`,
        insufficientBalance: true,
        maxAllowed,
        alreadyUsed,
        remaining,
        requested: calculatedDays,
      });
    }
  }

  // --- RULE 2: 3-MONTH CADENCE ADVISORY CHECK (P Leave or C Leave) ---
  let cLeaveAdvisory = null;
  if (leaveType === 'C_LEAVE' || leaveType === 'P_LEAVE') {
    const lastLeave: any = db.prepare(`
      SELECT * FROM leave_records
      WHERE personnel_id = ? AND leave_type IN ('P_LEAVE', 'C_LEAVE')
      ORDER BY start_date DESC
      LIMIT 1
    `).get(personnelId);

    if (lastLeave && !forceOverride) {
      const lastEndDate = parseISO(lastLeave.end_date || lastLeave.start_date);
      const newStartDate = parseISO(startDate);
      const intervalDays = differenceInDays(newStartDate, lastEndDate);

      if (intervalDays < 90) {
        const lastType = lastLeave.leave_type === 'P_LEAVE' ? 'P Leave' : 'C Leave';
        cLeaveAdvisory = `Leave interval is less than 3 months (${intervalDays} days since last ${lastType} on ${lastLeave.end_date || lastLeave.start_date}).`;
      }
    }
  }

  const id = `leave_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();
  const initialStatus = status || 'ACTIVE';

  db.prepare(`
    INSERT INTO leave_records (id, personnel_id, leave_type, start_date, end_date, total_days, reason, destination_address, emergency_contact, status, created_at, updated_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    personnelId,
    leaveType,
    startDate,
    endDate,
    calculatedDays,
    reason || 'Authorized Leave Sanction',
    destinationAddress || null,
    emergencyContact || null,
    initialStatus,
    now,
    now,
    req.user?.appointment || '2IC'
  );

  // If status is ACTIVE, automatically update soldier's current_status to 'LEAVE'
  if (initialStatus === 'ACTIVE') {
    const prev = (soldier.current_status && soldier.current_status !== 'PRESENT' && soldier.current_status !== 'LEAVE')
      ? soldier.current_status
      : (soldier.previous_status || null);

    db.prepare('UPDATE personnel SET current_status = "LEAVE", status_reason = ?, previous_status = ?, updated_at = ? WHERE id = ?').run(
      `On ${leaveType.replace('_', ' ')} (${startDate} to ${endDate})`,
      prev,
      now,
      personnelId
    );
  }

  // Trigger comprehensive synchronization
  syncLeaveStatusWithPersonnel();

  logAudit(req, 'SANCTION_LEAVE', 'LEAVE', id, `Sanctioned ${calculatedDays} days ${leaveType} for ${soldier.rank} ${soldier.name} (${soldier.army_number})`);

  return res.status(201).json({
    message: 'Leave sanctioned successfully.',
    id,
    advisory: cLeaveAdvisory,
  });
});

// 4. Edit Leave Record (2IC, Duty Officer, Duty Munshi)
leaveRouter.put('/:id', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const { leaveType, startDate, endDate, totalDays, reason, destinationAddress, emergencyContact, status } = req.body;
  const leave: any = db.prepare('SELECT * FROM leave_records WHERE id = ?').get(req.params.id);
  if (!leave) {
    return res.status(404).json({ error: 'Leave record not found.' });
  }

  const soldier: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(leave.personnel_id);
  if (!soldier) {
    return res.status(404).json({ error: 'Personnel record not found.' });
  }

  const newStartDate = startDate || leave.start_date;
  const newEndDate = endDate || leave.end_date;
  const newLeaveType = leaveType || leave.leave_type;
  const calculatedDays = totalDays || (differenceInDays(parseISO(newEndDate), parseISO(newStartDate)) + 1);

  if (calculatedDays <= 0) {
    return res.status(400).json({ error: 'Invalid leave duration: End Date must be on or after Start Date.' });
  }

  // If P-Leave, check limits excluding this specific leave record
  if (newLeaveType === 'P_LEAVE') {
    const leaveStartYear = parseISO(newStartDate).getFullYear();
    const maxAllowed = getRankPLeaveLimit(soldier.rank);

    const otherPLeaves = db.prepare(`
      SELECT * FROM leave_records
      WHERE personnel_id = ? AND leave_type = 'P_LEAVE' AND id != ? AND start_date >= ? AND start_date <= ?
    `).all(leave.personnel_id, leave.id, `${leaveStartYear}-01-01`, `${leaveStartYear}-12-31`);

    const alreadyUsed = otherPLeaves.reduce((acc: number, l: any) => acc + (l.total_days || 0), 0);
    const remaining = Math.max(0, maxAllowed - alreadyUsed);

    if (alreadyUsed + calculatedDays > maxAllowed) {
      return res.status(400).json({
        error: `Insufficient P Leave Balance: Maximum Allowed: ${maxAllowed} days, Already Used: ${alreadyUsed} days, Remaining: ${remaining} days, Requested: ${calculatedDays} days.`,
      });
    }
  }

  const now = new Date().toISOString();
  const updatedStatus = status || leave.status;

  db.prepare(`
    UPDATE leave_records
    SET leave_type = ?, start_date = ?, end_date = ?, total_days = ?, reason = ?, destination_address = ?, emergency_contact = ?, status = ?, updated_at = ?, updated_by = ?
    WHERE id = ?
  `).run(
    newLeaveType,
    newStartDate,
    newEndDate,
    calculatedDays,
    reason !== undefined ? reason : leave.reason,
    destinationAddress !== undefined ? destinationAddress : leave.destination_address,
    emergencyContact !== undefined ? emergencyContact : leave.emergency_contact,
    updatedStatus,
    now,
    req.user?.appointment || '2IC',
    leave.id
  );

  // Sync soldier's current status
  if (updatedStatus === 'ACTIVE') {
    const prev = (soldier.current_status && soldier.current_status !== 'PRESENT' && soldier.current_status !== 'LEAVE')
      ? soldier.current_status
      : (soldier.previous_status || null);

    db.prepare('UPDATE personnel SET current_status = "LEAVE", status_reason = ?, previous_status = ?, updated_at = ? WHERE id = ?').run(
      `On ${newLeaveType.replace('_', ' ')} (${newStartDate} to ${newEndDate})`,
      prev,
      now,
      leave.personnel_id
    );
  } else if (leave.status === 'ACTIVE' && updatedStatus !== 'ACTIVE') {
    // Check if there are any other active leaves
    const otherActive = db.prepare('SELECT id FROM leave_records WHERE personnel_id = ? AND id != ? AND status = "ACTIVE"').get(leave.personnel_id, leave.id);
    if (!otherActive) {
      const preservedStatus = (soldier.previous_status && ['HOSPITAL', 'COURSE', 'TY_DUTY', 'ATTACHMENT', 'OTHER'].includes(soldier.previous_status))
        ? soldier.previous_status
        : 'PRESENT';
      const statusReason = preservedStatus === 'PRESENT' ? null : `Preserved active status: ${preservedStatus}`;

      db.prepare('UPDATE personnel SET current_status = ?, status_reason = ?, previous_status = NULL, updated_at = ? WHERE id = ?').run(
        preservedStatus,
        statusReason,
        now,
        leave.personnel_id
      );
    }
  }

  syncLeaveStatusWithPersonnel();

  logAudit(req, 'EDIT_LEAVE', 'LEAVE', leave.id, `Updated leave record for ${soldier.rank} ${soldier.name} (${soldier.army_number})`);

  return res.json({ message: 'Leave record updated successfully.' });
});

// 5. Delete Leave Record (2IC, Duty Officer, Duty Munshi)
leaveRouter.delete('/:id', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const leave: any = db.prepare('SELECT * FROM leave_records WHERE id = ?').get(req.params.id);
  if (!leave) {
    return res.status(404).json({ error: 'Leave record not found.' });
  }

  const soldier: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(leave.personnel_id);
  const now = new Date().toISOString();

  // Delete the leave record
  db.prepare('DELETE FROM leave_records WHERE id = ?').run(leave.id);

  // Check if soldier has any remaining active leave
  const remainingActiveLeave = db.prepare('SELECT id FROM leave_records WHERE personnel_id = ? AND status = "ACTIVE"').get(leave.personnel_id);

  if (!remainingActiveLeave && soldier && soldier.current_status === 'LEAVE') {
    const preservedStatus = (soldier.previous_status && ['HOSPITAL', 'COURSE', 'TY_DUTY', 'ATTACHMENT', 'OTHER'].includes(soldier.previous_status))
      ? soldier.previous_status
      : 'PRESENT';
    const statusReason = preservedStatus === 'PRESENT' ? null : `Preserved active status: ${preservedStatus}`;

    db.prepare('UPDATE personnel SET current_status = ?, status_reason = ?, previous_status = NULL, updated_at = ? WHERE id = ?').run(
      preservedStatus,
      statusReason,
      now,
      leave.personnel_id
    );
  }

  syncLeaveStatusWithPersonnel();

  logAudit(
    req,
    'DELETE_LEAVE',
    'LEAVE',
    leave.id,
    `Deleted ${leave.leave_type} (${leave.total_days} days, ${leave.start_date} to ${leave.end_date}) for ${soldier?.rank || ''} ${soldier?.name || ''} (${soldier?.army_number || ''})`
  );

  return res.json({
    message: `Leave record deleted successfully. Entitlement and cadence balances updated.`,
    deletedId: leave.id,
  });
});

// 6. Mark Soldier Returned from Leave
leaveRouter.put('/:id/return', authenticateUser, requirePermission(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']), (req: AuthRequest, res) => {
  const { actualReturnDate } = req.body;
  const leave: any = db.prepare('SELECT * FROM leave_records WHERE id = ?').get(req.params.id);
  if (!leave) return res.status(404).json({ error: 'Leave record not found.' });

  const soldier: any = db.prepare('SELECT * FROM personnel WHERE id = ?').get(leave.personnel_id);
  const now = new Date().toISOString();
  const returnDate = actualReturnDate || format(new Date(), 'yyyy-MM-dd');

  db.prepare('UPDATE leave_records SET status = "RETURNED", actual_return_date = ?, updated_at = ?, updated_by = ? WHERE id = ?').run(
    returnDate,
    now,
    req.user?.appointment,
    leave.id
  );

  // Preserve previous active status if one was preserved (e.g. HOSPITAL, COURSE, TY_DUTY, ATTACHMENT)
  const preservedStatus = (soldier?.previous_status && ['HOSPITAL', 'COURSE', 'TY_DUTY', 'ATTACHMENT', 'OTHER'].includes(soldier.previous_status))
    ? soldier.previous_status
    : 'PRESENT';
  const statusReason = preservedStatus === 'PRESENT' ? null : `Preserved active status: ${preservedStatus}`;

  db.prepare('UPDATE personnel SET current_status = ?, status_reason = ?, previous_status = NULL, updated_at = ? WHERE id = ?').run(
    preservedStatus,
    statusReason,
    now,
    leave.personnel_id
  );

  syncLeaveStatusWithPersonnel();

  logAudit(req, 'RETURN_LEAVE', 'LEAVE', leave.id, `Soldier returned from leave on ${returnDate}. Restored status: ${preservedStatus}`);

  return res.json({ message: `Personnel marked returned and restored to ${preservedStatus} in unit lines.` });
});

// 7. Leave Reminders (Due in 15 Days, Overdue, Upcoming - considering both P Leave & C Leave)
leaveRouter.get('/reminders', authenticateUser, (req, res) => {
  syncLeaveStatusWithPersonnel();
  const activePersonnel = db.prepare('SELECT * FROM personnel WHERE is_active = 1').all();
  const now = new Date();

  const dueIn15Days: any[] = [];
  const overdue: any[] = [];
  const upcomingLeaves = db.prepare(`
    SELECT l.*, p.army_number, p.rank, p.name, p.trade
    FROM leave_records l
    JOIN personnel p ON l.personnel_id = p.id
    WHERE l.status = 'UPCOMING' OR (l.status = 'ACTIVE' AND l.end_date >= ?)
    ORDER BY l.start_date ASC
    LIMIT 10
  `).all(format(now, 'yyyy-MM-dd'));

  activePersonnel.forEach((p: any) => {
    // Check latest leave of type P_LEAVE or C_LEAVE
    const lastLeave: any = db.prepare(`
      SELECT * FROM leave_records
      WHERE personnel_id = ? AND leave_type IN ('P_LEAVE', 'C_LEAVE')
      ORDER BY start_date DESC
      LIMIT 1
    `).get(p.id);

    const referenceDateStr = lastLeave ? (lastLeave.end_date || lastLeave.start_date) : (p.unit_joining_date || `${now.getFullYear()}-01-01`);

    if (referenceDateStr) {
      try {
        const refDate = parseISO(referenceDateStr);
        const dueDate = new Date(refDate);
        dueDate.setDate(dueDate.getDate() + 90);
        const daysUntilDue = differenceInDays(dueDate, now);
        const dueDateStr = format(dueDate, 'yyyy-MM-dd');

        const item = {
          personnelId: p.id,
          armyNumber: p.army_number,
          rank: p.rank,
          name: p.name,
          trade: p.trade,
          appointment: p.appointment,
          currentStatus: p.current_status,
          lastLeaveType: lastLeave ? (lastLeave.leave_type === 'P_LEAVE' ? 'P Leave' : 'C Leave') : 'None',
          lastLeaveDays: lastLeave ? lastLeave.total_days : 0,
          lastLeaveDate: referenceDateStr,
          lastCLeaveDate: referenceDateStr,
          lastCLeaveId: lastLeave ? lastLeave.id : null,
          nextCLeaveDueDate: dueDateStr,
          daysUntilDue,
        };

        if (daysUntilDue < 0) {
          overdue.push({ ...item, daysOverdue: Math.abs(daysUntilDue) });
        } else if (daysUntilDue <= 15) {
          dueIn15Days.push(item);
        }
      } catch (e) {}
    }
  });

  return res.json({
    dueIn15Days,
    overdue,
    upcomingLeaves,
    counts: {
      dueIn15Days: dueIn15Days.length,
      overdue: overdue.length,
      upcoming: upcomingLeaves.length,
    },
  });
});

// 8. 3-Month Leave Forecast & Register (considering both P Leave & C Leave in single cadence)
leaveRouter.get('/forecast-3m', authenticateUser, (req, res) => {
  syncLeaveStatusWithPersonnel();
  const activePersonnel = db.prepare('SELECT * FROM personnel WHERE is_active = 1').all();
  const now = new Date();

  const month1Date = now;
  const month2Date = addMonths(now, 1);
  const month3Date = addMonths(now, 2);

  const month1Label = format(month1Date, 'MMMM yyyy');
  const month2Label = format(month2Date, 'MMMM yyyy');
  const month3Label = format(month3Date, 'MMMM yyyy');

  const month1Key = format(month1Date, 'yyyy-MM');
  const month2Key = format(month2Date, 'yyyy-MM');
  const month3Key = format(month3Date, 'yyyy-MM');

  const month1List: any[] = [];
  const month2List: any[] = [];
  const month3List: any[] = [];
  const registerEntries: any[] = [];

  activePersonnel.forEach((p: any) => {
    // Query latest leave whether P Leave or C Leave
    const lastLeave: any = db.prepare(`
      SELECT * FROM leave_records
      WHERE personnel_id = ? AND leave_type IN ('P_LEAVE', 'C_LEAVE')
      ORDER BY start_date DESC
      LIMIT 1
    `).get(p.id);

    const refDateStr = lastLeave ? (lastLeave.end_date || lastLeave.start_date) : (p.unit_joining_date || `${now.getFullYear()}-01-01`);
    if (refDateStr) {
      try {
        const refDate = parseISO(refDateStr);
        const dueDate = new Date(refDate);
        dueDate.setDate(dueDate.getDate() + 90);
        const dueMonthKey = format(dueDate, 'yyyy-MM');
        const dueDateFormatted = format(dueDate, 'yyyy-MM-dd');
        const daysUntilDue = differenceInDays(dueDate, now);

        let registerStatus = 'Normal';
        if (daysUntilDue < 0) {
          registerStatus = 'Overdue';
        } else if (daysUntilDue <= 15) {
          registerStatus = 'Due in 15 Days';
        }

        const soldierEntry = {
          leaveId: lastLeave ? lastLeave.id : null,
          personnelId: p.id,
          armyNumber: p.army_number,
          rank: p.rank,
          name: p.name,
          trade: p.trade,
          appointment: p.appointment,
          lastLeaveType: lastLeave ? (lastLeave.leave_type === 'P_LEAVE' ? 'P Leave' : 'C Leave') : 'None',
          lastLeaveDays: lastLeave ? lastLeave.total_days : 0,
          cLeaveDays: lastLeave ? lastLeave.total_days : 7,
          lastLeaveDate: refDateStr,
          dueDate: dueDateFormatted,
          daysUntilDue,
          status: registerStatus,
        };

        registerEntries.push(soldierEntry);

        if (dueMonthKey === month1Key || dueDate < now) {
          month1List.push(soldierEntry);
        } else if (dueMonthKey === month2Key) {
          month2List.push(soldierEntry);
        } else if (dueMonthKey === month3Key) {
          month3List.push(soldierEntry);
        }
      } catch (e) {}
    }
  });

  return res.json({
    forecast: [
      { month: month1Label, monthKey: month1Key, personnel: month1List },
      { month: month2Label, monthKey: month2Key, personnel: month2List },
      { month: month3Label, monthKey: month3Key, personnel: month3List },
    ],
    registerEntries: registerEntries.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  });
});

// 9. Yearly Leave Summary (With Rank-Based P Leave Limits)
leaveRouter.get('/yearly-summary', authenticateUser, (req, res) => {
  const selectedYear = parseInt((req.query.year as string) || String(new Date().getFullYear()), 10);
  const activePersonnel = db.prepare('SELECT * FROM personnel WHERE is_active = 1').all();

  const summaryRows = activePersonnel.map((p: any) => {
    const pLeaveLimit = getRankPLeaveLimit(p.rank);

    const yearLeaves = db.prepare(`
      SELECT * FROM leave_records
      WHERE personnel_id = ? AND start_date >= ? AND start_date <= ?
    `).all(p.id, `${selectedYear}-01-01`, `${selectedYear}-12-31`);

    const pLeaves = yearLeaves.filter((l) => l.leave_type === 'P_LEAVE');
    const pDaysUsed = pLeaves.reduce((acc, l) => acc + (l.total_days || 0), 0);
    const pRemaining = Math.max(0, pLeaveLimit - pDaysUsed);
    const pUsagePct = pLeaveLimit > 0 ? Math.round((pDaysUsed / pLeaveLimit) * 100) : 0;

    const cLeaves = yearLeaves.filter((l) => l.leave_type === 'C_LEAVE');
    const cDaysUsed = cLeaves.reduce((acc, l) => acc + (l.total_days || 0), 0);

    const matLeaves = yearLeaves.filter((l) => l.leave_type === 'MATERNITY_LEAVE');
    const matDays = matLeaves.reduce((acc, l) => acc + (l.total_days || 0), 0);

    const medLeaves = yearLeaves.filter((l) => l.leave_type === 'MEDICAL_LEAVE');
    const medDays = medLeaves.reduce((acc, l) => acc + (l.total_days || 0), 0);

    return {
      personnelId: p.id,
      armyNumber: p.army_number,
      rank: p.rank,
      name: p.name,
      trade: p.trade,
      pLeaveLimit,
      pLeavePeriods: pLeaves.length,
      pLeaveDaysUsed: pDaysUsed,
      pLeaveDaysRemaining: pRemaining,
      pLeaveUsagePct: pUsagePct,
      pLeaveLimitReached: pDaysUsed >= pLeaveLimit,
      cLeavePeriods: cLeaves.length,
      cLeaveDaysUsed: cDaysUsed,
      maternityDays: matDays,
      medicalDays: medDays,
      totalDaysAway: pDaysUsed + cDaysUsed + matDays + medDays,
    };
  });

  return res.json({ year: selectedYear, summary: summaryRows });
});
